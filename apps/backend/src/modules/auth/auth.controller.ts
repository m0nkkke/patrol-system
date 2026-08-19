import { Body, Controller, Get, HttpCode, Ip, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { LoginDto, LogoutDto, RefreshTokenDto, UniversalRouteSetterLoginDto } from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { AuthTokens } from './auth.types';

type AuthProfile = Pick<AuthenticatedUser, 'fullName' | 'id' | 'role' | 'username'> & {
  shopId: string | null;
  shopIds: string[];
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOkResponse({ description: 'Current authenticated user profile' })
  me(@CurrentUser() user: AuthenticatedUser): AuthProfile {
    return {
      fullName: user.fullName,
      id: user.id,
      role: user.role,
      shopId: user.shopId ?? null,
      shopIds: user.shopIds ?? [],
      username: user.username,
    };
  }

  @Post('login')
  @HttpCode(200)
  @ApiOkResponse({ description: 'JWT access and refresh tokens' })
  login(@Body() dto: LoginDto, @Ip() ipAddress: string): Promise<AuthTokens> {
    return this.authService.login(dto, ipAddress);
  }

  @Post('universal-route-setter/login')
  @HttpCode(200)
  @ApiOkResponse({ description: 'JWT tokens and unique authorization id for universal route setter session' })
  loginUniversalRouteSetter(
    @Body() dto: UniversalRouteSetterLoginDto,
    @Ip() ipAddress: string,
  ): Promise<AuthTokens & { authorizationFullName: string; authorizationId: string }> {
    return this.authService.loginUniversalRouteSetter(dto, ipAddress);
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Refreshed JWT access and refresh tokens' })
  refresh(@Body() dto: RefreshTokenDto, @Ip() ipAddress: string): Promise<AuthTokens> {
    return this.authService.refresh(dto, ipAddress);
  }

  @Post('logout')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Refresh token revoked' })
  logout(@Body() dto: LogoutDto, @Ip() ipAddress: string): Promise<{ success: true }> {
    return this.authService.logout(dto, ipAddress);
  }
}
