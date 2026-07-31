import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class PayrollService {
  constructor(
    private prisma: PrismaService,
    private transactionsService: TransactionsService,
  ) {}

  // PAYE Tax Calculation (Nigeria 2024 rates)
  private calculatePAYE(grossSalary: number): number {
    const annualSalary = grossSalary * 12;
    let tax = 0;

    if (annualSalary <= 300000) {
      tax = 0;
    } else if (annualSalary <= 660000) {
      tax = (annualSalary - 300000) * 0.07;
    } else if (annualSalary <= 1100000) {
      tax = (360000 * 0.07) + ((annualSalary - 660000) * 0.11);
    } else if (annualSalary <= 1600000) {
      tax = (360000 * 0.07) + (440000 * 0.11) + ((annualSalary - 1100000) * 0.15);
    } else if (annualSalary <= 3200000) {
      tax = (360000 * 0.07) + (440000 * 0.11) + (500000 * 0.15) + ((annualSalary - 1600000) * 0.19);
    } else if (annualSalary <= 50000000) {
      tax = (360000 * 0.07) + (440000 * 0.11) + (500000 * 0.15) + (1600000 * 0.19) + ((annualSalary - 3200000) * 0.21);
    } else if (annualSalary <= 100000000) {
      tax = (360000 * 0.07) + (440000 * 0.11) + (500000 * 0.15) + (1600000 * 0.19) + (46800000 * 0.21) + ((annualSalary - 50000000) * 0.23);
    } else {
      tax = (360000 * 0.07) + (440000 * 0.11) + (500000 * 0.15) + (1600000 * 0.19) + (46800000 * 0.21) + (50000000 * 0.23) + ((annualSalary - 100000000) * 0.25);
    }

    // Monthly PAYE with consolidated relief (20% of gross or ₦200,000, whichever is higher)
    const consolidatedRelief = Math.max(grossSalary * 0.2, 200000 / 12);
    const monthlyTax = Math.max(0, (tax / 12) - consolidatedRelief);

    return Math.round(monthlyTax);
  }

  // Pension Calculation (8% of gross, employer 10% - simplified for v1)
  private calculatePension(grossSalary: number, pensionRate: number = 8): number {
    return Math.round(grossSalary * (pensionRate / 100));
  }

  async addStaff(businessId: string, data: {
    fullName: string;
    salaryAmount: number;
    pensionRate?: number;
  }) {
    return this.prisma.staff.create({
      data: {
        businessId,
        fullName: data.fullName,
        salaryAmount: data.salaryAmount,
        pensionRate: data.pensionRate || 8,
      },
    });
  }

  async getStaff(businessId: string) {
    return this.prisma.staff.findMany({
      where: { businessId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStaff(id: string, businessId: string, data: {
    fullName?: string;
    salaryAmount?: number;
    pensionRate?: number;
    active?: boolean;
  }) {
    const staff = await this.prisma.staff.findFirst({ where: { id, businessId } });
    if (!staff) throw new NotFoundException('Staff not found');

    return this.prisma.staff.update({ where: { id }, data });
  }

  async generatePayroll(businessId: string, periodStart: string, periodEnd: string) {
    const existing = await this.prisma.payrollPeriod.findUnique({
      where: { businessId_periodStart_periodEnd: {
        businessId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      }},
    });

    if (existing) throw new BadRequestException('Payroll for this period already exists');

    const staffList = await this.prisma.staff.findMany({
      where: { businessId, active: true },
    });

    if (staffList.length === 0) throw new BadRequestException('No active staff found');

    const period = await this.prisma.payrollPeriod.create({
      data: {
        businessId,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
    });

    const entries = await Promise.all(
      staffList.map(async (s) => {
        const grossSalary = Number(s.salaryAmount);
        const payeTax = this.calculatePAYE(grossSalary);
        const pensionContribution = this.calculatePension(grossSalary, Number(s.pensionRate));
        const netPay = grossSalary - payeTax - pensionContribution;

        return this.prisma.payrollEntry.create({
          data: {
            payrollPeriodId: period.id,
            staffId: s.id,
            salarySnapshot: grossSalary,
            payeTax,
            pensionContribution,
            netPay,
          },
          include: { staff: true },
        });
      }),
    );

    return { period, entries };
  }

  async getPayrollPeriod(businessId: string, periodId: string) {
    const period = await this.prisma.payrollPeriod.findFirst({
      where: { id: periodId, businessId },
      include: {
        entries: { include: { staff: true } },
      },
    });
    if (!period) throw new NotFoundException('Payroll period not found');
    return period;
  }

  async getAllPeriods(businessId: string) {
    return this.prisma.payrollPeriod.findMany({
      where: { businessId },
      include: { entries: true },
      orderBy: { periodStart: 'desc' },
    });
  }

  async markAsPaid(periodId: string, businessId: string) {
    const period = await this.getPayrollPeriod(businessId, periodId);

    if (period.status === 'paid') throw new BadRequestException('Already marked as paid');

    for (const entry of period.entries) {
      await this.transactionsService.create({
        businessId,
        sourceType: 'payroll',
        direction: 'out',
        amount: Number(entry.netPay),
        counterpartyName: entry.staff.fullName,
        status: 'confirmed',
      });
    }

    return this.prisma.payrollPeriod.update({
      where: { id: periodId },
      data: { status: 'paid' },
    });
  }
}
