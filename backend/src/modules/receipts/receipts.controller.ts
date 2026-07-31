import { Controller, Get, Post, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ReceiptsService } from './receipts.service';

@ApiTags('Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('receipts')
export class ReceiptsController {
  constructor(private receiptsService: ReceiptsService) {}

  @Get()
  @ApiOperation({ summary: 'List all receipts' })
  async findAll(@Request() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.receiptsService.findAll(
      req.user.businessId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post('generate/:transactionId')
  @ApiOperation({ summary: 'Generate receipt for a transaction' })
  async generate(@Param('transactionId') transactionId: string, @Request() req) {
    return this.receiptsService.generateForTransaction(transactionId, req.user.businessId);
  }

  @Post(':id/send')
  @ApiOperation({ summary: 'Send receipt to customer' })
  async send(@Param('id') id: string, @Body() body: { phoneNumber: string }) {
    return this.receiptsService.sendReceipt(id, body.phoneNumber);
  }
}
