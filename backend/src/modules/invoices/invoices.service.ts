import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private httpService: HttpService,
    private transactionsService: TransactionsService,
  ) {}

  async create(businessId: string, data: {
    clientName: string;
    clientContact: string;
    dueDate?: string;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
  }) {
    const totalAmount = data.lineItems.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice, 0,
    );

    const invoice = await this.prisma.invoice.create({
      data: {
        businessId,
        clientName: data.clientName,
        clientContact: data.clientContact,
        totalAmount,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        lineItems: {
          create: data.lineItems.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
          })),
        },
      },
      include: { lineItems: true },
    });

    await this.prisma.invoiceEvent.create({
      data: { invoiceId: invoice.id, eventType: 'created' },
    });

    return invoice;
  }

  async findAll(businessId: string, filters: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 50 } = filters;
    const where: any = { businessId };
    if (status) where.status = status;

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { lineItems: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string, businessId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, businessId },
      include: {
        lineItems: true,
        events: { orderBy: { eventAt: 'desc' } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async generatePaymentLink(id: string, businessId: string) {
    const invoice = await this.findById(id, businessId);

    const paystackSecret = this.config.get('PAYSTACK_SECRET_KEY');
    if (!paystackSecret) throw new BadRequestException('Payment provider not configured');

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.paystack.co/transaction/initialize',
          {
            email: invoice.clientContact,
            amount: Math.round(Number(invoice.totalAmount) * 100),
            metadata: { invoiceId: invoice.id, businessId },
          },
          { headers: { Authorization: `Bearer ${paystackSecret}` } },
        ),
      );

      const updated = await this.prisma.invoice.update({
        where: { id },
        data: {
          paymentLink: response.data.data.authorization_url,
          paymentProvider: 'paystack',
          status: 'sent',
        },
      });

      await this.prisma.invoiceEvent.create({
        data: { invoiceId: id, eventType: 'sent' },
      });

      return updated;
    } catch (error) {
      throw new BadRequestException('Failed to generate payment link');
    }
  }

  async handlePaymentWebhook(provider: string, payload: any) {
    const providerRef = payload.data?.reference;
    if (!providerRef) return;

    const existing = await this.prisma.paymentWebhookEvent.findUnique({
      where: { provider_providerReference: { provider, providerReference: providerRef } },
    });
    if (existing) return;

    await this.prisma.paymentWebhookEvent.create({
      data: {
        provider,
        providerReference: providerRef,
        invoiceId: payload.data?.metadata?.invoiceId,
        rawPayload: payload,
        processed: false,
      },
    });

    if (payload.data?.status === 'success' && payload.data?.metadata?.invoiceId) {
      const invoiceId = payload.data.metadata.invoiceId;
      const amountPaid = payload.data.amount / 100;

      const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) return;

      const newAmountPaid = Number(invoice.amountPaid) + amountPaid;
      const totalAmount = Number(invoice.totalAmount);

      const newStatus = newAmountPaid >= totalAmount ? 'paid' : 'partially_paid';

      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid: newAmountPaid, status: newStatus },
      });

      const transaction = await this.transactionsService.create({
        businessId: invoice.businessId,
        sourceType: 'invoice',
        direction: 'in',
        amount: amountPaid,
        counterpartyName: invoice.clientName,
        counterpartyPhone: invoice.clientContact,
        status: 'confirmed',
      });

      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { transactionId: transaction.id },
      });

      await this.prisma.invoiceEvent.create({
        data: {
          invoiceId,
          eventType: newStatus === 'paid' ? 'paid' : 'partially_paid',
        },
      });

      await this.prisma.paymentWebhookEvent.updateMany({
        where: { provider, providerReference: providerRef },
        data: { processed: true },
      });
    }
  }

  async markAsPaid(id: string, businessId: string) {
    const invoice = await this.findById(id, businessId);

    const transaction = await this.transactionsService.create({
      businessId,
      sourceType: 'invoice',
      direction: 'in',
      amount: Number(invoice.totalAmount) - Number(invoice.amountPaid),
      counterpartyName: invoice.clientName,
      counterpartyPhone: invoice.clientContact,
      status: 'confirmed',
    });

    return this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'paid',
        amountPaid: invoice.totalAmount,
        transactionId: transaction.id,
      },
    });
  }

  async sendFollowUp(id: string, businessId: string) {
    const invoice = await this.findById(id, businessId);

    if (invoice.status !== 'sent' && invoice.status !== 'viewed' && invoice.status !== 'overdue') {
      throw new BadRequestException('Invoice not in follow-up eligible status');
    }

    await this.prisma.invoice.update({
      where: { id },
      data: { followUpCount: { increment: 1 } },
    });

    await this.prisma.invoiceEvent.create({
      data: { invoiceId: id, eventType: 'reminder_sent' },
    });

    return { message: 'Follow-up sent' };
  }
}
