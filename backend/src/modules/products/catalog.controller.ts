import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ProductsService } from './products.service';

@ApiTags('Public')
@Controller('catalog')
export class CatalogController {
  constructor(private productsService: ProductsService) {}

  @Get(':token')
  @ApiOperation({ summary: 'View public catalog' })
  async getCatalog(@Param('token') token: string) {
    return this.productsService.getCatalogByToken(token);
  }
}
