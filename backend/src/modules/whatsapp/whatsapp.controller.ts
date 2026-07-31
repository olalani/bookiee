import { Controller, Post, Get, Req, Res, Body, Query, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private whatsappService: WhatsappService,
    private config: ConfigService,
  ) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = this.config.get('WHATSAPP_VERIFY_TOKEN', 'bookiee-webhook-verify');

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('Webhook verified');
      res.status(200).send(challenge);
    } else {
      this.logger.warn('Webhook verification failed');
      res.status(403).send('Forbidden');
    }
  }

  @Post('webhook')
  async handleWebhook(@Req() req: Request, @Res() res: Response) {
    try {
      const signature = req.headers['x-hub-signature-256'] as string;
      const body = req.body;

      if (body.object === 'whatsapp_business_account') {
        await this.whatsappService.handleIncomingMessage(body);
      }

      res.status(200).send('OK');
    } catch (error) {
      this.logger.error('Webhook handling error', error);
      res.status(200).send('OK');
    }
  }
}
