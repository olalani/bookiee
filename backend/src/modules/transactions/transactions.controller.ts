import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Post()
  @Roles('owner', 'accountant', 'staff')
  @ApiOperation({ summary: 'Create a transaction' })
  async create(@Request() req, @Body() body: {
    sourceType: string;
    direction: string;
    amount: number;
    counterpartyName?: string;
    counterpartyPhone?: string;
    categoryId?: string;
    confidenceScore?: number;
    inboundMessageId?: string;
  }) {
    return this.transactionsService.create({
      ...body,
      businessId: req.user.businessId,
      createdBy: req.user.sub,
    });
  }

  @Get()
  @Roles('owner', 'accountant', 'staff')
  @ApiOperation({ summary: 'List transactions with filters' })
  async findAll(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sourceType') sourceType?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.transactionsService.findAll(req.user.businessId, {
      startDate, endDate, categoryId, sourceType, status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Get('export')
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'Export transactions as CSV/PDF data' })
  async export(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('categoryId') categoryId?: string,
    @Query('sourceType') sourceType?: string,
  ) {
    return this.transactionsService.getExportData(req.user.businessId, {
      startDate, endDate, categoryId, sourceType,
    });
  }

  @Get(':id')
  @Roles('owner', 'accountant', 'staff')
  @ApiOperation({ summary: 'Get transaction detail' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.transactionsService.findById(id, req.user.businessId);
  }

  @Patch(':id')
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'Update a transaction' })
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() body: {
      amount?: number;
      counterpartyName?: string;
      counterpartyPhone?: string;
      categoryId?: string;
      direction?: string;
    },
  ) {
    return this.transactionsService.update(id, req.user.businessId, req.user.sub, body);
  }

  @Patch(':id/confirm')
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'Confirm a pending transaction' })
  async confirm(@Param('id') id: string, @Request() req) {
    return this.transactionsService.confirm(id, req.user.businessId, req.user.sub);
  }

  @Patch(':id/discard')
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'Discard a transaction' })
  async discard(@Param('id') id: string, @Request() req) {
    return this.transactionsService.discard(id, req.user.businessId, req.user.sub);
  }
}
