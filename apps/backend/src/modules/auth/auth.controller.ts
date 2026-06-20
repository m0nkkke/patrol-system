import { Body, Controller, HttpCode, Ip, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto } from '@patrol/shared';

import { AuthService } from './auth.service';
import { AuthTokens } from './auth.types';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ description: 'JWT access and refresh tokens' })
  login(@Body() dto: LoginDto, @Ip() ipAddress: string): Promise<AuthTokens> {
    return this.authService.login(dto, ipAddress);
  }
}
