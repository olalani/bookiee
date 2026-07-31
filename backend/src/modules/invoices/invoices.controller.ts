import {
  Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { InvoicesService } from './invoices.service';

@ApiTags('Invoices')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  async findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.invoicesService.findAll(req.user.businessId, {
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 50,
    });
  }

  @Post()
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'Create invoice' })
  async create(@Request() req, @Body() body: {
    clientName: string;
    clientContact: string;
    dueDate?: string;
    lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
  }) {
    return this.invoicesService.create(req.user.businessId, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice detail' })
  async findOne(@Param('id') id: string, @Request() req) {
    return this.invoicesService.findById(id, req.user.businessId);
  }

  @Post(':id/payment-link')
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'Generate payment link' })
  async generatePaymentLink(@Param('id') id: string, @Request() req) {
    return this.invoicesService.generatePaymentLink(id, req.user.businessId);
  }

  @Post(':id/mark-paid')
  @Roles('owner')
  @ApiOperation({ summary: 'Manually mark invoice as paid' })
  async markAsPaid(@Param('id') id: string, @Request() req) {
    return this.invoicesService.markAsPaid(id, req.user.businessId);
  }

  @Post(':id/follow-up')
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'Send follow-up reminder' })
  async sendFollowUp(@Param('id') id: string, @Request() req) {
    return this.invoicesService.sendFollowUp(id, req.user.businessId);
  }
}
