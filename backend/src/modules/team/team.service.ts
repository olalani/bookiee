import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TeamService {
  constructor(private prisma: PrismaService) {}

  async getMembers(businessId: string) {
    return this.prisma.businessUser.findMany({
      where: { businessId, revokedAt: null },
      include: {
        user: { select: { id: true, phoneNumber: true, fullName: true } },
      },
      orderBy: { invitedAt: 'asc' },
    });
  }

  async inviteMember(businessId: string, phoneNumber: string, role: string, invitedBy: string) {
    const caller = await this.prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId: invitedBy } },
    });

    if (!caller || caller.role !== 'owner') {
      throw new ForbiddenException('Only owners can invite members');
    }

    let user = await this.prisma.user.findUnique({ where: { phoneNumber } });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          phoneNumber,
          fullName: '',
        },
      });
    }

    const existing = await this.prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId: user.id } },
    });

    if (existing) {
      if (existing.revokedAt) {
        return this.prisma.businessUser.update({
          where: { id: existing.id },
          data: { revokedAt: null, role },
        });
      }
      throw new ConflictException('User already a member');
    }

    return this.prisma.businessUser.create({
      data: {
        businessId,
        userId: user.id,
        role,
      },
      include: { user: { select: { id: true, phoneNumber: true, fullName: true } } },
    });
  }

  async updateRole(businessId: string, userId: string, newRole: string, callerId: string) {
    const caller = await this.prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId: callerId } },
    });

    if (!caller || caller.role !== 'owner') {
      throw new ForbiddenException('Only owners can change roles');
    }

    const member = await this.prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });

    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.businessUser.update({
      where: { id: member.id },
      data: { role: newRole },
    });
  }

  async revokeMember(businessId: string, userId: string, callerId: string) {
    const caller = await this.prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId: callerId } },
    });

    if (!caller || caller.role !== 'owner') {
      throw new ForbiddenException('Only owners can revoke members');
    }

    if (userId === callerId) {
      throw new ForbiddenException('Cannot revoke yourself');
    }

    const member = await this.prisma.businessUser.findUnique({
      where: { businessId_userId: { businessId, userId } },
    });

    if (!member) throw new NotFoundException('Member not found');

    return this.prisma.businessUser.update({
      where: { id: member.id },
      data: { revokedAt: new Date() },
    });
  }

  async getAuditLog(businessId: string, page: number = 1, limit: number = 50) {
    const [logs, total] = await Promise.all([
      this.prisma.transactionAuditLog.findMany({
        where: { transaction: { businessId } },
        include: {
          user: { select: { id: true, fullName: true } },
          transaction: { select: { id: true, amount: true, counterpartyName: true } },
        },
        orderBy: { changedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transactionAuditLog.count({
        where: { transaction: { businessId } },
      }),
    ]);

    return {
      data: logs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }
}
