import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: {
    category: { findMany: jest.Mock; findUnique: jest.Mock; create: jest.Mock; findFirst: jest.Mock; delete: jest.Mock };
    transaction: { updateMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      category: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), findFirst: jest.fn(), delete: jest.fn() },
      transaction: { updateMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(CategoriesService);
  });

  describe('findAll', () => {
    it('should return categories ordered by system default then name', async () => {
      prisma.category.findMany.mockResolvedValue([
        { id: '1', name: 'Expenses', isSystemDefault: true },
        { id: '2', name: 'Custom', isSystemDefault: false },
      ]);

      const result = await service.findAll('biz1');

      expect(result).toHaveLength(2);
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { businessId: 'biz1' },
        orderBy: [{ isSystemDefault: 'desc' }, { name: 'asc' }],
      });
    });
  });

  describe('create', () => {
    it('should create new category', async () => {
      prisma.category.findUnique.mockResolvedValue(null);
      prisma.category.create.mockResolvedValue({ id: '1', name: 'Marketing', businessId: 'biz1' });

      const result = await service.create('biz1', 'Marketing');

      expect(result).toHaveProperty('name', 'Marketing');
    });

    it('should throw ConflictException if category exists', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: '1', name: 'Marketing' });

      await expect(service.create('biz1', 'Marketing')).rejects.toThrow(ConflictException);
    });
  });

  describe('delete', () => {
    it('should delete custom category', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: '1', isSystemDefault: false });
      prisma.transaction.updateMany.mockResolvedValue({ count: 0 });
      prisma.category.delete.mockResolvedValue({ id: '1' });

      const result = await service.delete('1', 'biz1');

      expect(result).toHaveProperty('id', '1');
      expect(prisma.transaction.updateMany).toHaveBeenCalledWith({
        where: { categoryId: '1' },
        data: { categoryId: null },
      });
    });

    it('should throw NotFoundException if not found', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.delete('invalid', 'biz1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException for system default category', async () => {
      prisma.category.findFirst.mockResolvedValue({ id: '1', isSystemDefault: true });

      await expect(service.delete('1', 'biz1')).rejects.toThrow(ConflictException);
    });
  });
});
