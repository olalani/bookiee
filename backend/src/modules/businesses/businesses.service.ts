import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('Business not found');
    return business;
  }

  async update(id: string, data: {
    name?: string;
    businessType?: string;
    logoUrl?: string;
    autoConfirmThreshold?: number;
  }) {
    return this.prisma.business.update({ where: { id }, data });
  }

  async getBusinessStats(businessId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [income, expense, transactionCount] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { businessId, direction: 'in', status: 'confirmed', transactionDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { businessId, direction: 'out', status: 'confirmed', transactionDate: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({
        where: { businessId, status: 'confirmed', transactionDate: { gte: startOfMonth } },
      }),
    ]);

    return {
      monthlyIncome: income._sum.amount || 0,
      monthlyExpense: expense._sum.amount || 0,
      transactionCount,
    };
  }
}
