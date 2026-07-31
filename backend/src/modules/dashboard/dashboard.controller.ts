import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Get dashboard overview' })
  async getOverview(@Request() req) {
    return this.dashboardService.getOverview(req.user.businessId);
  }

  @Get('trend')
  @ApiOperation({ summary: 'Get income/expense trend' })
  async getTrend(@Request() req, @Query('months') months?: string) {
    return this.dashboardService.getTrend(req.user.businessId, months ? parseInt(months) : 6);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Get category breakdown' })
  async getCategoryBreakdown(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.dashboardService.getCategoryBreakdown(req.user.businessId, startDate, endDate);
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent transactions' })
  async getRecent(@Request() req, @Query('limit') limit?: string) {
    return this.dashboardService.getRecentTransactions(req.user.businessId, limit ? parseInt(limit) : 10);
  }
}
