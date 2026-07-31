import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user' })
  async getMe(@Request() req) {
    return this.usersService.findById(req.user.sub);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile' })
  async updateMe(@Request() req, @Body() body: { fullName?: string }) {
    return this.usersService.updateProfile(req.user.sub, body);
  }
}
