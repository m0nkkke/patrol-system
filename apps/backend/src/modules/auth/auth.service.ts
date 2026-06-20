import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginDto } from '@patrol/shared';
import { createHash } from 'crypto';
import { SignOptions, sign } from 'jsonwebtoken';

import { InvalidCredentialsError } from '../../common/errors/invalid-credentials.error';
import { AppConfig } from '../../config/app.config';
import { UsersService } from '../users/users.service';
import { AuthTokens, JwtPayload } from './auth.types';
import { RefreshTokenStore } from './refresh-token.store';
import { RefreshTokensRepository } from './refresh-tokens.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly refreshTokenStore: RefreshTokenStore,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly usersService: UsersService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string): Promise<AuthTokens> {
    const user = await this.usersService.findByAccessKey(dto.accessKey);

    if (user === null || !user.isActive) {
      throw new InvalidCredentialsError();
    }

    await this.usersService.updateLastLogin(user.id, new Date());

    const payload: JwtPayload = {
      role: user.role,
      sub: user.id,
      username: user.username,
    };
    const tokens = this.issueTokens(payload);
    const refreshTokenHash = hashToken(tokens.refreshToken);
    const expiresAt = new Date(
      Date.now() + this.configService.get('jwt.refreshTtlSeconds', { infer: true }) * 1000,
    );

    await this.refreshTokenStore.save(user.id, dto.deviceId, refreshTokenHash);
    await this.refreshTokensRepository.createAudit({
      deviceId: dto.deviceId,
      expiresAt,
      ipAddress,
      tokenHash: refreshTokenHash,
      userId: user.id,
    });

    return tokens;
  }

  private issueTokens(payload: JwtPayload): AuthTokens {
    return {
      accessToken: signToken(
        payload,
        this.configService.get('jwt.accessSecret', { infer: true }),
        this.configService.get('jwt.accessTtl', { infer: true }),
      ),
      refreshToken: signToken(
        payload,
        this.configService.get('jwt.refreshSecret', { infer: true }),
        this.configService.get('jwt.refreshTtlSeconds', { infer: true }),
      ),
    };
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function signToken(payload: JwtPayload, secret: string, expiresIn: SignOptions['expiresIn']): string {
  return sign(payload, secret, { expiresIn });
}
