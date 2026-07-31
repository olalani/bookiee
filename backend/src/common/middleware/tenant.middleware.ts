import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    try {
      const token = authHeader.split(' ')[1];
      const payload = this.jwtService.verify(token);

      const businessUser = await this.prisma.businessUser.findFirst({
        where: {
          userId: payload.sub,
          revokedAt: null,
        },
        orderBy: { invitedAt: 'desc' },
      });

      if (businessUser) {
        (req as any).user = {
          ...payload,
          businessId: businessUser.businessId,
          businessRole: businessUser.role,
          businessScope: businessUser.scope,
        };
      }
    } catch {
      // Invalid token — let auth guard handle it downstream
    }

    next();
  }
}
