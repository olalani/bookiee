import { Test, TestingModule } from '@nestjs/testing';
import { RolesGuard } from './roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ROLES_KEY } from '../decorators/roles.decorator';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let prisma: { businessUser: { findUnique: jest.Mock } };
  let reflector: { getAllAndOverride: jest.Mock };

  beforeEach(async () => {
    prisma = { businessUser: { findUnique: jest.fn() } };
    reflector = { getAllAndOverride: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: Reflector, useValue: reflector },
      ],
    }).compile();

    guard = module.get(RolesGuard);
  });

  const mockContext = (user?: any) => ({
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
    getHandler: () => jest.fn(),
    getClass: () => jest.fn(),
  }) as unknown as ExecutionContext;

  describe('canActivate', () => {
    it('should allow if no roles required', async () => {
      reflector.getAllAndOverride.mockReturnValue(null);

      const result = await guard.canActivate(mockContext({ id: 'user1', businessId: 'biz1' }));

      expect(result).toBe(true);
    });

    it('should throw if no user context', async () => {
      reflector.getAllAndOverride.mockReturnValue(['owner']);

      await expect(guard.canActivate(mockContext(null))).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if no business context', async () => {
      reflector.getAllAndOverride.mockReturnValue(['owner']);

      await expect(guard.canActivate(mockContext({ id: 'user1' }))).rejects.toThrow(UnauthorizedException);
    });

    it('should allow if user has required role', async () => {
      reflector.getAllAndOverride.mockReturnValue(['owner']);
      prisma.businessUser.findUnique.mockResolvedValue({ role: 'owner', revokedAt: null });

      const req = { user: { id: 'user1', businessId: 'biz1' } };
      const ctx = {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => jest.fn(),
        getClass: () => jest.fn(),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(req).toHaveProperty('businessRole', 'owner');
    });

    it('should throw if user has wrong role', async () => {
      reflector.getAllAndOverride.mockReturnValue(['owner']);
      prisma.businessUser.findUnique.mockResolvedValue({ role: 'staff', revokedAt: null });

      const ctx = mockContext({ id: 'user1', businessId: 'biz1' });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw if access revoked', async () => {
      reflector.getAllAndOverride.mockReturnValue(['owner']);
      prisma.businessUser.findUnique.mockResolvedValue({ role: 'owner', revokedAt: new Date() });

      const ctx = mockContext({ id: 'user1', businessId: 'biz1' });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });
});
