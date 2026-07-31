import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DeadLetterService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string, status?: string, page = 1, limit = 50) {
    const where: any = { businessId };
    if (status) where.status = status;

    const [items, total] = await Promise.all([
      this.prisma.deadLetterItem.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.deadLetterItem.count({ where }),
    ]);

    return {
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async resolve(id: string, businessId: string, userId: string) {
    const item = await this.prisma.deadLetterItem.findFirst({ where: { id, businessId } });
    if (!item) throw new NotFoundException('Item not found');

    return this.prisma.deadLetterItem.update({
      where: { id },
      data: { status: 'resolved', reviewedBy: userId, resolvedAt: new Date() },
    });
  }

  async dismiss(id: string, businessId: string, userId: string) {
    const item = await this.prisma.deadLetterItem.findFirst({ where: { id, businessId } });
    if (!item) throw new NotFoundException('Item not found');

    return this.prisma.deadLetterItem.update({
      where: { id },
      data: { status: 'dismissed', reviewedBy: userId, resolvedAt: new Date() },
    });
  }
}
