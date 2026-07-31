import {
  Controller, Get, Post, Patch, Param, Body, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { PayrollService } from './payroll.service';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private payrollService: PayrollService) {}

  @Get('staff')
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'List all staff' })
  async getStaff(@Request() req) {
    return this.payrollService.getStaff(req.user.businessId);
  }

  @Post('staff')
  @Roles('owner')
  @ApiOperation({ summary: 'Add staff member' })
  async addStaff(@Request() req, @Body() body: {
    fullName: string;
    salaryAmount: number;
    pensionRate?: number;
  }) {
    return this.payrollService.addStaff(req.user.businessId, body);
  }

  @Patch('staff/:id')
  @Roles('owner')
  @ApiOperation({ summary: 'Update staff member' })
  async updateStaff(@Param('id') id: string, @Request() req, @Body() body: {
    fullName?: string;
    salaryAmount?: number;
    pensionRate?: number;
    active?: boolean;
  }) {
    return this.payrollService.updateStaff(id, req.user.businessId, body);
  }

  @Get('periods')
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'List payroll periods' })
  async getPeriods(@Request() req) {
    return this.payrollService.getAllPeriods(req.user.businessId);
  }

  @Post('generate')
  @Roles('owner')
  @ApiOperation({ summary: 'Generate payroll for a period' })
  async generate(@Request() req, @Body() body: {
    periodStart: string;
    periodEnd: string;
  }) {
    return this.payrollService.generatePayroll(req.user.businessId, body.periodStart, body.periodEnd);
  }

  @Get('periods/:id')
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'Get payroll period detail' })
  async getPeriod(@Param('id') id: string, @Request() req) {
    return this.payrollService.getPayrollPeriod(req.user.businessId, id);
  }

  @Post('periods/:id/mark-paid')
  @Roles('owner')
  @ApiOperation({ summary: 'Mark payroll as paid' })
  async markAsPaid(@Param('id') id: string, @Request() req) {
    return this.payrollService.markAsPaid(id, req.user.businessId);
  }
}
