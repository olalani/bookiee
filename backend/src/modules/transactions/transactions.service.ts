import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: {
    businessId: string;
    sourceType: string;
    direction: string;
    amount: number;
    counterpartyName?: string;
    counterpartyPhone?: string;
    categoryId?: string;
    confidenceScore?: number;
    inboundMessageId?: string;
    createdBy?: string;
    status?: string;
    requiresReview?: boolean;
  }) {
    const business = await this.prisma.business.findUnique({ where: { id: data.businessId } });
    if (!business) throw new NotFoundException('Business not found');

    if (data.confidenceScore && data.confidenceScore < 0.8) {
      data.requiresReview = true;
    }

    if (data.amount > Number(business.autoConfirmThreshold)) {
      data.requiresReview = true;
    }

    const duplicate = await this.findDuplicate(
      data.businessId,
      data.amount,
      data.counterpartyName,
    );
    if (duplicate) {
      data.requiresReview = true;
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        businessId: data.businessId,
        sourceType: data.sourceType,
        direction: data.direction as any,
        amount: new Prisma.Decimal(data.amount),
        counterpartyName: data.counterpartyName,
        counterpartyPhone: data.counterpartyPhone,
        categoryId: data.categoryId,
        confidenceScore: data.confidenceScore ? new Prisma.Decimal(data.confidenceScore) : null,
        inboundMessageId: data.inboundMessageId,
        createdBy: data.createdBy,
        status: data.status || 'confirmed',
        requiresReview: data.requiresReview || false,
      },
      include: { category: true },
    });

    await this.prisma.transactionAuditLog.create({
      data: {
        transactionId: transaction.id,
        changedBy: data.createdBy,
        changeType: 'created',
        diff: JSON.parse(JSON.stringify(transaction)),
      },
    });

    return transaction;
  }

  async findAll(
    businessId: string,
    filters: {
      startDate?: string;
      endDate?: string;
      categoryId?: string;
      sourceType?: string;
      status?: string;
      createdBy?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const { startDate, endDate, categoryId, sourceType, status, createdBy, page = 1, limit = 50 } = filters;

    const where: Prisma.TransactionWhereInput = { businessId };

    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) (where.transactionDate as any).gte = new Date(startDate);
      if (endDate) (where.transactionDate as any).lte = new Date(endDate);
    }
    if (categoryId) where.categoryId = categoryId;
    if (sourceType) where.sourceType = sourceType;
    if (status) where.status = status;
    if (createdBy) where.createdBy = createdBy;

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: true, creator: { select: { id: true, fullName: true } } },
        orderBy: { transactionDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: string, businessId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, businessId },
      include: {
        category: true,
        creator: { select: { id: true, fullName: true } },
        receipts: true,
        auditLogs: {
          include: { user: { select: { id: true, fullName: true } } },
          orderBy: { changedAt: 'desc' },
        },
      },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  async update(id: string, businessId: string, userId: string, data: {
    amount?: number;
    counterpartyName?: string;
    counterpartyPhone?: string;
    categoryId?: string;
    direction?: string;
    status?: string;
  }) {
    const existing = await this.findById(id, businessId);

    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && (existing as any)[key] !== value) {
        oldValues[key] = (existing as any)[key];
        newValues[key] = value;
      }
    }

    if (Object.keys(newValues).length === 0) return existing;

    const updated = await this.prisma.transaction.update({
      where: { id },
      data: {
        ...data,
        amount: data.amount ? new Prisma.Decimal(data.amount) : undefined,
      },
      include: { category: true },
    });

    await this.prisma.transactionAuditLog.create({
      data: {
        transactionId: id,
        changedBy: userId,
        changeType: 'edited',
        diff: { old: oldValues, new: newValues },
      },
    });

    return updated;
  }

  async confirm(id: string, businessId: string, userId: string) {
    return this.update(id, businessId, userId, { status: 'confirmed' });
  }

  async discard(id: string, businessId: string, userId: string) {
    return this.update(id, businessId, userId, { status: 'discarded' });
  }

  async getExportData(businessId: string, filters: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    sourceType?: string;
  }) {
    const where: Prisma.TransactionWhereInput = {
      businessId,
      status: 'confirmed',
    };

    if (filters.startDate || filters.endDate) {
      where.transactionDate = {};
      if (filters.startDate) (where.transactionDate as any).gte = new Date(filters.startDate);
      if (filters.endDate) (where.transactionDate as any).lte = new Date(filters.endDate);
    }
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.sourceType) where.sourceType = filters.sourceType;

    return this.prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { transactionDate: 'desc' },
    });
  }

  private async findDuplicate(businessId: string, amount: number, counterpartyName?: string) {
    if (!counterpartyName) return null;

    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    return this.prisma.transaction.findFirst({
      where: {
        businessId,
        amount: new Prisma.Decimal(amount),
        counterpartyName,
        createdAt: { gte: sixtySecondsAgo },
        status: { not: 'discarded' },
      },
    });
  }
}
