import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all products' })
  async findAll(@Request() req) {
    return this.productsService.findAll(req.user.businessId);
  }

  @Post()
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'Add a product' })
  async create(@Request() req, @Body() body: {
    name: string;
    price: number;
    stockQty?: number;
    imageUrl?: string;
  }) {
    return this.productsService.create(req.user.businessId, body);
  }

  @Patch(':id')
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'Update a product' })
  async update(@Param('id') id: string, @Request() req, @Body() body: {
    name?: string;
    price?: number;
    stockQty?: number;
    imageUrl?: string;
  }) {
    return this.productsService.update(id, req.user.businessId, body);
  }

  @Delete(':id')
  @Roles('owner')
  @ApiOperation({ summary: 'Delete a product' })
  async delete(@Param('id') id: string, @Request() req) {
    return this.productsService.delete(id, req.user.businessId);
  }

  @Post('catalog/share')
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'Generate shareable catalog link' })
  async generateCatalog(@Request() req) {
    return this.productsService.generateCatalogShare(req.user.businessId);
  }
}
