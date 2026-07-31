import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly apiUrl = 'https://graph.facebook.com/v18.0';

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private transactionsService: TransactionsService,
    private httpService: HttpService,
  ) {}

  async handleIncomingMessage(payload: any) {
    const entry = payload.entry?.[0];
    const changes = entry?.changes?.[0];
    if (!changes) return;

    const value = changes.value;
    const messages = value.messages || [];
    const statuses = value.statuses || [];

    if (statuses.length > 0) {
      await this.handleStatusUpdate(statuses[0]);
      return;
    }

    for (const message of messages) {
      await this.processMessage(message, value.metadata);
    }
  }

  private async processMessage(message: any, metadata: any) {
    const phoneNumberId = metadata.phone_number_id;
    const from = message.from;
    const messageId = message.id;
    const timestamp = message.timestamp;

    const session = await this.prisma.whatsappSession.findFirst({
      where: { phoneNumber: from },
      include: { business: true },
    });

    if (!session) {
      this.logger.warn(`No session found for number: ${from}`);
      return;
    }

    const existing = await this.prisma.inboundMessage.findUnique({
      where: { whatsappMessageId: messageId },
    });
    if (existing) {
      this.logger.debug(`Duplicate message ${messageId}, skipping`);
      return;
    }

    const inboundMessage = await this.prisma.inboundMessage.create({
      data: {
        whatsappMessageId: messageId,
        businessId: session.businessId,
        messageType: message.type,
        rawAudioUrl: message.audio?.url || null,
        transcriptText: message.text?.body || null,
        processingStatus: message.type === 'text' ? 'parsed' : 'queued',
      },
    });

    await this.prisma.whatsappSession.update({
      where: { id: session.id },
      data: { lastInteractionAt: new Date() },
    });

    if (message.type === 'text') {
      await this.processTextMessage(session, inboundMessage, message.text.body);
    } else if (message.type === 'audio') {
      await this.processVoiceMessage(session, inboundMessage, message.audio);
    } else if (message.type === 'interactive') {
      await this.processInteractiveReply(session, inboundMessage, message.interactive);
    }
  }

  private async processTextMessage(session: any, inboundMessage: any, text: string) {
    const parsed = await this.parseTransactionText(text, session.businessId);

    if (parsed.confidence >= 0.8) {
      const transaction = await this.transactionsService.create({
        businessId: session.businessId,
        sourceType: 'text',
        direction: parsed.direction,
        amount: parsed.amount,
        counterpartyName: parsed.counterparty,
        categoryId: parsed.categoryId,
        confidenceScore: parsed.confidence,
        inboundMessageId: inboundMessage.id,
      });

      await this.sendConfirmationCard(session.phoneNumber, transaction, session.business);
    } else {
      await this.sendClarifyingQuestion(session.phoneNumber, parsed);
    }
  }

  private async processVoiceMessage(session: any, inboundMessage: any, audio: any) {
    await this.sendTextMessage(session.phoneNumber, 'Processing your voice note...');

    try {
      const nlpServiceUrl = this.config.get('NLP_SERVICE_URL', 'http://localhost:8001');
      const response = await firstValueFrom(
        this.httpService.post(`${nlpServiceUrl}/parse-voice`, {
          audioUrl: audio.url,
          businessId: session.businessId,
          messageId: inboundMessage.whatsappMessageId,
        }),
      );

      const result = response.data;

      await this.prisma.inboundMessage.update({
        where: { id: inboundMessage.id },
        data: {
          transcriptText: result.transcript,
          processingStatus: 'parsed',
        },
      });

      if (result.confidence >= 0.8) {
        const transaction = await this.transactionsService.create({
          businessId: session.businessId,
          sourceType: 'voice',
          direction: result.direction,
          amount: result.amount,
          counterpartyName: result.counterparty,
          categoryId: result.categoryId,
          confidenceScore: result.confidence,
          inboundMessageId: inboundMessage.id,
        });

        await this.sendConfirmationCard(session.phoneNumber, transaction, session.business);
      } else {
        await this.sendClarifyingQuestion(session.phoneNumber, result);
      }
    } catch (error) {
      this.logger.error('Voice processing failed', error);
      await this.prisma.inboundMessage.update({
        where: { id: inboundMessage.id },
        data: { processingStatus: 'failed' },
      });
      await this.prisma.deadLetterItem.create({
        data: {
          businessId: session.businessId,
          inboundMessageId: inboundMessage.id,
          rawPayload: { audioUrl: audio.url, error: error.message },
          errorReason: 'Voice processing failed',
        },
      });
      await this.sendTextMessage(
        session.phoneNumber,
        "Couldn't process that voice note. Please try again or type the amount.",
      );
    }
  }

  private async processInteractiveReply(session: any, inboundMessage: any, interactive: any) {
    const buttonId = interactive.button_reply?.id;
    const listId = interactive.list_reply?.id;

    const action = buttonId || listId;

    if (!action) return;

    if (action.startsWith('confirm_')) {
      const transactionId = action.replace('confirm_', '');
      await this.transactionsService.confirm(transactionId, session.businessId, session.businessId);
      await this.sendTextMessage(session.phoneNumber, 'Transaction confirmed!');
    } else if (action.startsWith('discard_')) {
      const transactionId = action.replace('discard_', '');
      await this.transactionsService.discard(transactionId, session.businessId, session.businessId);
      await this.sendTextMessage(session.phoneNumber, 'Transaction discarded.');
    } else if (action.startsWith('edit_')) {
      const transactionId = action.replace('edit_', '');
      await this.sendTextMessage(
        session.phoneNumber,
        'Reply with the corrected details. Example: "50000 from Chioma for rice"',
      );
      await this.prisma.whatsappSession.update({
        where: { id: session.id },
        data: { pendingTransaction: { editingId: transactionId } },
      });
    }
  }

  async sendConfirmationCard(phoneNumber: string, transaction: any, business: any) {
    const direction = transaction.direction === 'in' ? 'Money In' : 'Money Out';
    const amount = `₦${Number(transaction.amount).toLocaleString()}`;
    const category = transaction.category?.name || 'Uncategorized';

    const body = `*Transaction Detected*\n\n` +
      `Amount: ${amount}\n` +
      `Type: ${direction}\n` +
      `From/To: ${transaction.counterpartyName || 'Unknown'}\n` +
      `Category: ${category}\n` +
      `Source: ${transaction.sourceType}`;

    const buttons = [
      { type: 'reply', reply: { id: `confirm_${transaction.id}`, title: 'Confirm' } },
      { type: 'reply', reply: { id: `edit_${transaction.id}`, title: 'Edit' } },
      { type: 'reply', reply: { id: `discard_${transaction.id}`, title: 'Discard' } },
    ];

    await this.sendInteractiveMessage(phoneNumber, body, buttons);
  }

  async sendClarifyingQuestion(phoneNumber: string, parsed: any) {
    const amount = parsed.amount ? `₦${Number(parsed.amount).toLocaleString()}` : 'unknown amount';

    const body = `I detected a transaction of *${amount}* but I'm not sure about the details.\n\n` +
      `Is this money *coming in* (income) or *going out* (expense)?`;

    const buttons = [
      { type: 'reply', reply: { id: 'clarify_income', title: 'Money In' } },
      { type: 'reply', reply: { id: 'clarify_expense', title: 'Money Out' } },
    ];

    await this.sendInteractiveMessage(phoneNumber, body, buttons);
  }

  async sendTextMessage(phoneNumber: string, text: string) {
    const phoneNumberId = this.config.get('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = this.config.get('WHATSAPP_ACCESS_TOKEN');

    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/${phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'text',
            text: { body: text },
          },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ),
      );
    } catch (error) {
      this.logger.error('Failed to send WhatsApp message', error);
    }
  }

  async sendInteractiveMessage(phoneNumber: string, body: string, buttons: any[]) {
    const phoneNumberId = this.config.get('WHATSAPP_PHONE_NUMBER_ID');
    const accessToken = this.config.get('WHATSAPP_ACCESS_TOKEN');

    try {
      await firstValueFrom(
        this.httpService.post(
          `${this.apiUrl}/${phoneNumberId}/messages`,
          {
            messaging_product: 'whatsapp',
            to: phoneNumber,
            type: 'interactive',
            interactive: {
              type: 'button',
              body: { text: body },
              action: { buttons },
            },
          },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ),
      );
    } catch (error) {
      this.logger.error('Failed to send interactive message', error);
    }
  }

  private async parseTransactionText(text: string, businessId: string) {
    const nlpServiceUrl = this.config.get('NLP_SERVICE_URL', 'http://localhost:8001');

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${nlpServiceUrl}/parse-text`, {
          text,
          businessId,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.error('NLP service failed, using fallback parser', error);
      return this.fallbackParser(text);
    }
  }

  private fallbackParser(text: string) {
    const amountMatch = text.match(/(\d[\d,]*\.?\d*)\s*(k|thousand|million|mn|m)?/i);
    let amount = 0;
    if (amountMatch) {
      amount = parseFloat(amountMatch[1].replace(/,/g, ''));
      const suffix = amountMatch[2]?.toLowerCase();
      if (suffix === 'k') amount *= 1000;
      if (suffix === 'million' || suffix === 'mn' || suffix === 'm') amount *= 1000000;
    }

    const direction = /received|got|earned|sold|from|in/i.test(text) ? 'in' : 'out';

    const partyMatch = text.match(/(?:from|to|paid|received from|sold to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    const counterparty = partyMatch ? partyMatch[1] : null;

    return {
      amount,
      direction,
      counterparty,
      confidence: amount > 0 ? 0.7 : 0.3,
      categoryId: null,
      transcript: text,
    };
  }

  private handleStatusUpdate(status: any) {
    this.logger.debug(`Message status update: ${status.status} for ${status.id}`);
  }
}
