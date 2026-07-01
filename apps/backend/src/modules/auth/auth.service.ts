import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginDto, LogoutDto, RefreshTokenDto } from '@patrol/shared';
import { createHash, randomUUID } from 'crypto';
import { SignOptions, sign, verify } from 'jsonwebtoken';

import { DomainValidationError } from '../../common/errors/domain-validation.error';
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
    await this.assertLoginAllowed(ipAddress, dto.deviceId);

    const user = await this.usersService.findByAccessKey(dto.accessKey);

    if (user === null || !user.isActive) {
      await this.refreshTokenStore.recordFailedLogin(ipAddress, dto.deviceId);
      throw new InvalidCredentialsError();
    }

    await this.refreshTokenStore.clearFailedLogin(ipAddress, dto.deviceId);
    await this.usersService.updateLastLogin(user.id, new Date());

    const payload: JwtPayload = {
      role: user.role,
      sessionVersion: user.sessionVersion,
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

  async refresh(dto: RefreshTokenDto, ipAddress?: string): Promise<AuthTokens> {
    const payload = this.verifyRefreshToken(dto.refreshToken);
    const tokenHash = hashToken(dto.refreshToken);
    const storedTokenHash = await this.refreshTokenStore.get(payload.sub, dto.deviceId);
    const auditToken = await this.refreshTokensRepository.findValidByHash(tokenHash, new Date());

    if (storedTokenHash !== tokenHash || auditToken === null || auditToken.userId !== payload.sub) {
      throw new InvalidCredentialsError();
    }

    const user = await this.usersService.findEntityById(payload.sub);

    if (user === null || !user.isActive || user.sessionVersion !== payload.sessionVersion) {
      throw new InvalidCredentialsError();
    }

    const nextPayload: JwtPayload = {
      role: user.role,
      sessionVersion: user.sessionVersion,
      sub: user.id,
      username: user.username,
    };
    const tokens = this.issueTokens(nextPayload);
    const nextRefreshTokenHash = hashToken(tokens.refreshToken);
    const expiresAt = new Date(
      Date.now() + this.configService.get('jwt.refreshTtlSeconds', { infer: true }) * 1000,
    );

    await this.refreshTokensRepository.revokeByHash(tokenHash, new Date());
    await this.refreshTokenStore.save(user.id, dto.deviceId, nextRefreshTokenHash);
    await this.refreshTokensRepository.createAudit({
      deviceId: dto.deviceId,
      expiresAt,
      ipAddress,
      tokenHash: nextRefreshTokenHash,
      userId: user.id,
    });

    return tokens;
  }

  async logout(dto: LogoutDto): Promise<{ success: true }> {
    const payload = this.verifyRefreshToken(dto.refreshToken);
    const tokenHash = hashToken(dto.refreshToken);

    await this.refreshTokensRepository.revokeByHash(tokenHash, new Date());
    await this.refreshTokenStore.revoke(payload.sub, dto.deviceId);

    return { success: true };
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

  private verifyRefreshToken(refreshToken: string): JwtPayload {
    try {
      const payload = verify(
        refreshToken,
        this.configService.get('jwt.refreshSecret', { infer: true }),
      );

      if (!isJwtPayload(payload)) {
        throw new InvalidCredentialsError();
      }

      return payload;
    } catch {
      throw new InvalidCredentialsError();
    }
  }

  private async assertLoginAllowed(ipAddress: string | undefined, deviceId: string): Promise<void> {
    try {
      await this.refreshTokenStore.assertLoginAllowed(ipAddress, deviceId);
    } catch (error) {
      if (error instanceof Error && error.message === 'AUTH_TOO_MANY_ATTEMPTS') {
        throw new DomainValidationError(
          'AUTH_TOO_MANY_ATTEMPTS',
          'Too many login attempts. Try again later',
        );
      }

      throw error;
    }
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function signToken(payload: JwtPayload, secret: string, expiresIn: SignOptions['expiresIn']): string {
  return sign({ ...payload, jti: randomUUID() }, secret, { expiresIn });
}

function isJwtPayload(payload: string | object): payload is JwtPayload {
  return (
    typeof payload === 'object' &&
    'sub' in payload &&
    'username' in payload &&
    'role' in payload &&
    'sessionVersion' in payload &&
    typeof payload.sub === 'string' &&
    typeof payload.username === 'string' &&
    typeof payload.sessionVersion === 'number' &&
    (payload.role === 'admin' || payload.role === 'manager' || payload.role === 'employee')
  );
}
