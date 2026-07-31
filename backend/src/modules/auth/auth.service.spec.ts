import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock }; business: { create: jest.Mock }; businessUser: { create: jest.Mock; findFirst: jest.Mock }; whatsappSession: { findUnique: jest.Mock; create: jest.Mock } };
  let jwt: { sign: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn(), create: jest.fn() },
      business: { create: jest.fn() },
      businessUser: { create: jest.fn(), findFirst: jest.fn() },
      whatsappSession: { findUnique: jest.fn(), create: jest.fn() },
    };
    jwt = { sign: jest.fn().mockReturnValue('mock-token') };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwt },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('signup', () => {
    it('should create user and business, return tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({ id: 'user1', phoneNumber: '+2348012345678' });
      prisma.business.create.mockResolvedValue({ id: 'biz1' });
      prisma.businessUser.create.mockResolvedValue({});

      const result = await service.signup('+2348012345678', 'password123', 'Test Business');

      expect(result).toHaveProperty('accessToken');
      expect(prisma.user.create).toHaveBeenCalled();
      expect(prisma.business.create).toHaveBeenCalled();
      expect(prisma.businessUser.create).toHaveBeenCalledWith({
        data: { businessId: 'biz1', userId: 'user1', role: 'owner' },
      });
    });

    it('should throw ConflictException if phone exists', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.signup('+2348012345678', 'password', 'Biz')).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', phoneNumber: '+2348012345678', passwordHash: hashedPassword });
      prisma.businessUser.findFirst.mockResolvedValue({ businessId: 'biz1' });

      const result = await service.login('+2348012345678', 'password123');

      expect(result).toHaveProperty('accessToken');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.login('+2348012345678', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if no business associated', async () => {
      const hashedPassword = await bcrypt.hash('password123', 12);
      prisma.user.findUnique.mockResolvedValue({ id: 'user1', passwordHash: hashedPassword });
      prisma.businessUser.findFirst.mockResolvedValue(null);

      await expect(service.login('+2348012345678', 'password123')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('linkWhatsApp', () => {
    it('should return existing session if already linked', async () => {
      const existing = { id: 'session1', phoneNumber: '+2348012345678' };
      prisma.whatsappSession.findUnique.mockResolvedValue(existing);

      const result = await service.linkWhatsApp('user1', 'biz1', '+2348012345678');

      expect(result).toEqual(existing);
      expect(prisma.whatsappSession.create).not.toHaveBeenCalled();
    });

    it('should create new session if not linked', async () => {
      prisma.whatsappSession.findUnique.mockResolvedValue(null);
      prisma.whatsappSession.create.mockResolvedValue({ id: 'session1' });

      const result = await service.linkWhatsApp('user1', 'biz1', '+2348012345678');

      expect(result).toHaveProperty('id', 'session1');
    });
  });
});
