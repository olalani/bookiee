import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(phoneNumber: string, password: string, businessName: string, businessType?: string) {
    const existing = await this.prisma.user.findUnique({ where: { phoneNumber } });
    if (existing) {
      throw new ConflictException('Phone number already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.prisma.user.create({
      data: {
        phoneNumber,
        passwordHash,
        fullName: '',
      },
    });

    const business = await this.prisma.business.create({
      data: {
        name: businessName,
        businessType: businessType || 'sme',
        categories: {
          create: [
            { name: 'Sales', isSystemDefault: true },
            { name: 'Expenses', isSystemDefault: true },
            { name: 'Salary', isSystemDefault: true },
            { name: 'Utilities', isSystemDefault: true },
            { name: 'Transport', isSystemDefault: true },
            { name: 'Food & Drinks', isSystemDefault: true },
            { name: 'Rent', isSystemDefault: true },
            { name: 'Miscellaneous', isSystemDefault: true },
          ],
        },
      },
    });

    await this.prisma.businessUser.create({
      data: {
        businessId: business.id,
        userId: user.id,
        role: 'owner',
      },
    });

    return this.generateTokens(user.id, business.id);
  }

  async login(phoneNumber: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { phoneNumber } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const businessUser = await this.prisma.businessUser.findFirst({
      where: { userId: user.id, revokedAt: null },
      orderBy: { invitedAt: 'desc' },
    });

    if (!businessUser) {
      throw new UnauthorizedException('No business associated');
    }

    return this.generateTokens(user.id, businessUser.businessId);
  }

  async linkWhatsApp(userId: string, businessId: string, whatsappPhone: string) {
    const existing = await this.prisma.whatsappSession.findUnique({
      where: { businessId_phoneNumber: { businessId, phoneNumber: whatsappPhone } },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.whatsappSession.create({
      data: {
        businessId,
        phoneNumber: whatsappPhone,
      },
    });
  }

  async validateToken(payload: any) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();

    const businessUser = await this.prisma.businessUser.findFirst({
      where: { userId: user.id, revokedAt: null },
    });

    return {
      id: user.id,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      businessId: businessUser?.businessId,
      businessRole: businessUser?.role,
    };
  }

  private generateTokens(userId: string, businessId: string) {
    const payload = { sub: userId, businessId };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: userId, businessId },
    };
  }
}
