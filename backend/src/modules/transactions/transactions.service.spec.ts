import { Test, TestingModule } from '@nestjs/testing';
import { TransactionsService } from './transactions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('TransactionsService', () => {
  let service: TransactionsService;
  let prisma: {
    business: { findUnique: jest.Mock };
    transaction: { create: jest.Mock; findMany: jest.Mock; count: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    transactionAuditLog: { create: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      business: { findUnique: jest.fn() },
      transaction: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      transactionAuditLog: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TransactionsService);
  });

  describe('create', () => {
    it('should create transaction with low confidence requiring review', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'biz1', autoConfirmThreshold: 50000 });
      prisma.transaction.findFirst.mockResolvedValue(null);
      prisma.transaction.create.mockResolvedValue({
        id: 'tx1',
        businessId: 'biz1',
        amount: 1000,
        confidenceScore: 0.5,
        requiresReview: true,
      });

      const result = await service.create({
        businessId: 'biz1',
        sourceType: 'whatsapp',
        direction: 'income',
        amount: 1000,
        confidenceScore: 0.5,
      });

      expect(result.requiresReview).toBe(true);
      expect(prisma.transactionAuditLog.create).toHaveBeenCalled();
    });

    it('should mark high amount transactions for review', async () => {
      prisma.business.findUnique.mockResolvedValue({ id: 'biz1', autoConfirmThreshold: 50000 });
      prisma.transaction.findFirst.mockResolvedValue(null);
      prisma.transaction.create.mockResolvedValue({
        id: 'tx1',
        amount: 100000,
        requiresReview: true,
      });

      const result = await service.create({
        businessId: 'biz1',
        sourceType: 'manual',
        direction: 'income',
        amount: 100000,
        confidenceScore: 0.95,
      });

      expect(result.requiresReview).toBe(true);
    });

    it('should throw NotFoundException for invalid business', async () => {
      prisma.business.findUnique.mockResolvedValue(null);

      await expect(service.create({
        businessId: 'invalid',
        sourceType: 'manual',
        direction: 'income',
        amount: 1000,
      })).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated transactions', async () => {
      prisma.transaction.findMany.mockResolvedValue([{ id: 'tx1' }, { id: 'tx2' }]);
      prisma.transaction.count.mockResolvedValue(2);

      const result = await service.findAll('biz1', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by category', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);

      await service.findAll('biz1', { categoryId: 'cat1' });

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ categoryId: 'cat1' }),
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return transaction with relations', async () => {
      prisma.transaction.findFirst.mockResolvedValue({
        id: 'tx1',
        category: { name: 'Sales' },
        creator: { fullName: 'John' },
        receipts: [],
        auditLogs: [],
      });

      const result = await service.findById('tx1', 'biz1');

      expect(result).toHaveProperty('id', 'tx1');
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      await expect(service.findById('invalid', 'biz1')).rejects.toThrow(NotFoundException);
    });
  });
});
