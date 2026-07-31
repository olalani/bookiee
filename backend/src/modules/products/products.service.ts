import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(businessId: string) {
    return this.prisma.product.findMany({
      where: { businessId, active: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(businessId: string, data: {
    name: string;
    price: number;
    stockQty?: number;
    imageUrl?: string;
  }) {
    return this.prisma.product.create({
      data: {
        businessId,
        name: data.name,
        price: data.price,
        stockQty: data.stockQty || 0,
        imageUrl: data.imageUrl,
      },
    });
  }

  async update(id: string, businessId: string, data: {
    name?: string;
    price?: number;
    stockQty?: number;
    imageUrl?: string;
    active?: boolean;
  }) {
    const product = await this.prisma.product.findFirst({ where: { id, businessId } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.update({ where: { id }, data });
  }

  async delete(id: string, businessId: string) {
    const product = await this.prisma.product.findFirst({ where: { id, businessId } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.product.update({
      where: { id },
      data: { active: false },
    });
  }

  async generateCatalogShare(businessId: string) {
    const shareToken = crypto.randomBytes(32).toString('hex');

    return this.prisma.catalogShare.create({
      data: {
        businessId,
        shareToken,
        expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      },
    });
  }

  async getCatalogByToken(shareToken: string) {
    const share = await this.prisma.catalogShare.findUnique({
      where: { shareToken },
      include: { business: { select: { id: true, name: true, logoUrl: true } } },
    });

    if (!share) throw new NotFoundException('Catalog not found');
    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new NotFoundException('Catalog link expired');
    }

    const products = await this.prisma.product.findMany({
      where: { businessId: share.businessId, active: true },
      orderBy: { name: 'asc' },
    });

    return {
      business: share.business,
      products,
      shareToken,
    };
  }
}
