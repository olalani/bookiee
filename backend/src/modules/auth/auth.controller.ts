import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto, LinkWhatsAppDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('signup')
  @ApiOperation({ summary: 'Register a new user and business' })
  async signup(@Body() dto: SignupDto) {
    return this.authService.signup(
      dto.phoneNumber,
      dto.password,
      dto.businessName,
      dto.businessType,
    );
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with phone number and password' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.phoneNumber, dto.password);
  }

  @Post('link-whatsapp')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a WhatsApp number to the business' })
  async linkWhatsApp(@Request() req, @Body() dto: LinkWhatsAppDto) {
    return this.authService.linkWhatsApp(
      req.user.sub,
      req.user.businessId,
      dto.phoneNumber,
    );
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async me(@Request() req) {
    return this.authService.validateToken(req.user);
  }
}
