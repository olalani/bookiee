import { Controller, Get, Patch, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessesService } from './businesses.service';

@ApiTags('Businesses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private businessesService: BusinessesService) {}

  @Get('current')
  @ApiOperation({ summary: 'Get current business' })
  async getCurrent(@Request() req) {
    return this.businessesService.findById(req.user.businessId);
  }

  @Patch('current')
  @ApiOperation({ summary: 'Update business settings' })
  async updateCurrent(@Request() req, @Body() body: {
    name?: string;
    businessType?: string;
    logoUrl?: string;
    autoConfirmThreshold?: number;
  }) {
    return this.businessesService.update(req.user.businessId, body);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get business monthly stats' })
  async getStats(@Request() req) {
    return this.businessesService.getBusinessStats(req.user.businessId);
  }
}
