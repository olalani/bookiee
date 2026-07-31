import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { DeadLetterService } from './dead-letter.service';

@ApiTags('Dead Letter Queue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dead-letter')
export class DeadLetterController {
  constructor(private deadLetterService: DeadLetterService) {}

  @Get()
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'List failed parse items' })
  async findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.deadLetterService.findAll(
      req.user.businessId,
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }

  @Post(':id/resolve')
  @Roles('owner', 'accountant')
  @ApiOperation({ summary: 'Mark item as resolved' })
  async resolve(@Param('id') id: string, @Request() req) {
    return this.deadLetterService.resolve(id, req.user.businessId, req.user.sub);
  }

  @Post(':id/dismiss')
  @Roles('owner')
  @ApiOperation({ summary: 'Dismiss item' })
  async dismiss(@Param('id') id: string, @Request() req) {
    return this.deadLetterService.dismiss(id, req.user.businessId, req.user.sub);
  }
}
