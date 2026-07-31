import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CategoriesService } from './categories.service';

@ApiTags('Categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all categories' })
  async findAll(@Request() req) {
    return this.categoriesService.findAll(req.user.businessId);
  }

  @Post()
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'Create a category' })
  async create(@Request() req, @Body() body: { name: string }) {
    return this.categoriesService.create(req.user.businessId, body.name);
  }

  @Delete(':id')
  @Roles('owner')
  @ApiOperation({ summary: 'Delete a category' })
  async delete(@Param('id') id: string, @Request() req) {
    return this.categoriesService.delete(id, req.user.businessId);
  }
}
