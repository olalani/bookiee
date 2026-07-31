import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private httpService: HttpService,
  ) {}

  async generateForTransaction(transactionId: string, businessId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id: transactionId, businessId },
      include: { business: true },
    });

    if (!transaction) return null;
    if (transaction.direction !== 'in') return null;

    const referenceNumber = `RCP-${Date.now()}-${uuidv4().slice(0, 4).toUpperCase()}`;

    const receipt = await this.prisma.receipt.create({
      data: {
        transactionId,
        businessId,
        pdfUrl: '', // Will be populated by PDF generation service
        referenceNumber,
      },
    });

    return receipt;
  }

  async sendReceipt(receiptId: string, sendToPhone: string) {
    const receipt = await this.prisma.receipt.update({
      where: { id: receiptId },
      data: {
        sentToPhone: sendToPhone,
        sentAt: new Date(),
      },
    });

    return receipt;
  }

  async findByTransaction(transactionId: string) {
    return this.prisma.receipt.findMany({
      where: { transactionId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(businessId: string, page = 1, limit = 50) {
    const [receipts, total] = await Promise.all([
      this.prisma.receipt.findMany({
        where: { businessId },
        include: { transaction: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.receipt.count({ where: { businessId } }),
    ]);

    return {
      data: receipts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
