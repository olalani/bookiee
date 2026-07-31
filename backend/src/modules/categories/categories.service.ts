import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string) {
    return this.prisma.category.findMany({
      where: { businessId },
      orderBy: [{ isSystemDefault: 'desc' }, { name: 'asc' }],
    });
  }

  async create(businessId: string, name: string) {
    const existing = await this.prisma.category.findUnique({
      where: { businessId_name: { businessId, name } },
    });
    if (existing) throw new ConflictException('Category already exists');

    return this.prisma.category.create({
      data: { businessId, name },
    });
  }

  async delete(id: string, businessId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, businessId },
    });
    if (!category) throw new NotFoundException('Category not found');
    if (category.isSystemDefault) {
      throw new ConflictException('Cannot delete system default category');
    }

    await this.prisma.transaction.updateMany({
      where: { categoryId: id },
      data: { categoryId: null },
    });

    return this.prisma.category.delete({ where: { id } });
  }
}
