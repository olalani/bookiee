import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TeamService } from './team.service';

@ApiTags('Team')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('team')
export class TeamController {
  constructor(private teamService: TeamService) {}

  @Get('members')
  @ApiOperation({ summary: 'List team members' })
  async getMembers(@Request() req) {
    return this.teamService.getMembers(req.user.businessId);
  }

  @Post('invite')
  @ApiOperation({ summary: 'Invite a team member' })
  async invite(@Request() req, @Body() body: { phoneNumber: string; role: string }) {
    return this.teamService.inviteMember(
      req.user.businessId,
      body.phoneNumber,
      body.role,
      req.user.sub,
    );
  }

  @Patch('members/:userId/role')
  @ApiOperation({ summary: 'Update member role' })
  async updateRole(@Param('userId') userId: string, @Request() req, @Body() body: { role: string }) {
    return this.teamService.updateRole(req.user.businessId, userId, body.role, req.user.sub);
  }

  @Delete('members/:userId')
  @ApiOperation({ summary: 'Revoke member access' })
  async revoke(@Param('userId') userId: string, @Request() req) {
    return this.teamService.revokeMember(req.user.businessId, userId, req.user.sub);
  }

  @Get('audit-log')
  @ApiOperation({ summary: 'View audit log' })
  async getAuditLog(
    @Request() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.teamService.getAuditLog(
      req.user.businessId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
    );
  }
}
