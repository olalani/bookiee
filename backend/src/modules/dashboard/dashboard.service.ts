import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getOverview(businessId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [thisMonthIn, thisMonthOut, lastMonthIn, lastMonthOut, totalTransactions, pendingReview] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { businessId, direction: 'in', status: 'confirmed', transactionDate: { gte: startOfMonth } },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { businessId, direction: 'out', status: 'confirmed', transactionDate: { gte: startOfMonth } },
        _sum: { amount: true }, _count: true,
      }),
      this.prisma.transaction.aggregate({
        where: { businessId, direction: 'in', status: 'confirmed', transactionDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { businessId, direction: 'out', status: 'confirmed', transactionDate: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.count({ where: { businessId, status: 'confirmed' } }),
      this.prisma.transaction.count({ where: { businessId, requiresReview: true, status: 'pending' } }),
    ]);

    const thisMonthIncome = Number(thisMonthIn._sum.amount || 0);
    const thisMonthExpense = Number(thisMonthOut._sum.amount || 0);
    const lastMonthIncome = Number(lastMonthIn._sum.amount || 0);
    const lastMonthExpense = Number(lastMonthOut._sum.amount || 0);

    return {
      thisMonth: {
        income: thisMonthIncome,
        expense: thisMonthExpense,
        net: thisMonthIncome - thisMonthExpense,
        incomeCount: thisMonthIn._count,
        expenseCount: thisMonthOut._count,
      },
      lastMonth: {
        income: lastMonthIncome,
        expense: lastMonthExpense,
        net: lastMonthIncome - lastMonthExpense,
      },
      totalTransactions,
      pendingReview,
    };
  }

  async getTrend(businessId: string, months: number = 6) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        businessId,
        status: 'confirmed',
        transactionDate: { gte: startDate },
      },
      select: { amount: true, direction: true, transactionDate: true },
    });

    const monthlyData: Record<string, { income: number; expense: number }> = {};

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyData[key] = { income: 0, expense: 0 };
    }

    for (const txn of transactions) {
      const d = txn.transactionDate;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyData[key]) {
        if (txn.direction === 'in') {
          monthlyData[key].income += Number(txn.amount);
        } else {
          monthlyData[key].expense += Number(txn.amount);
        }
      }
    }

    return Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }

  async getCategoryBreakdown(businessId: string, startDate?: string, endDate?: string) {
    const where: any = { businessId, status: 'confirmed' };
    if (startDate || endDate) {
      where.transactionDate = {};
      if (startDate) where.transactionDate.gte = new Date(startDate);
      if (endDate) where.transactionDate.lte = new Date(endDate);
    }

    const transactions = await this.prisma.transaction.findMany({
      where,
      select: { amount: true, direction: true, categoryId: true, category: { select: { name: true } } },
    });

    const breakdown: Record<string, { income: number; expense: number; count: number }> = {};

    for (const txn of transactions) {
      const name = txn.category?.name || 'Uncategorized';
      if (!breakdown[name]) breakdown[name] = { income: 0, expense: 0, count: 0 };
      if (txn.direction === 'in') {
        breakdown[name].income += Number(txn.amount);
      } else {
        breakdown[name].expense += Number(txn.amount);
      }
      breakdown[name].count++;
    }

    return Object.entries(breakdown)
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => (b.income + b.expense) - (a.income + a.expense));
  }

  async getRecentTransactions(businessId: string, limit: number = 10) {
    return this.prisma.transaction.findMany({
      where: { businessId, status: 'confirmed' },
      include: { category: true },
      orderBy: { transactionDate: 'desc' },
      take: limit,
    });
  }
}
