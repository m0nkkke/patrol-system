import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoginDto, LogoutDto, RefreshTokenDto, UniversalRouteSetterLoginDto, USER_ROLES } from '@patrol/shared';
import { createHash, randomUUID } from 'crypto';
import { SignOptions, sign, verify } from 'jsonwebtoken';

import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { InvalidCredentialsError } from '../../common/errors/invalid-credentials.error';
import { AppConfig } from '../../config/app.config';
import { AuditLogService } from '../audit/audit-log.service';
import { UsersService } from '../users/users.service';
import { AuthTokens, JwtPayload } from './auth.types';
import { RefreshTokenStore } from './sessions/refresh-token.store';
import { RefreshTokensRepository } from './sessions/refresh-tokens.repository';
import { UniversalAuthSessionsRepository } from './sessions/universal-auth-sessions.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly refreshTokenStore: RefreshTokenStore,
    private readonly refreshTokensRepository: RefreshTokensRepository,
    private readonly universalAuthSessionsRepository: UniversalAuthSessionsRepository,
    private readonly usersService: UsersService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string): Promise<AuthTokens> {
    try {
      await this.assertLoginAllowed(ipAddress, dto.deviceId);
    } catch (error) {
      await this.recordAuthAuditSafely('auth.login.rate_limited', {
        deviceId: dto.deviceId,
        ipAddress,
        meta: { accessKeyFingerprint: fingerprint(dto.accessKey), reason: 'rate_limited' },
      });
      throw error;
    }

    const user = await this.usersService.findByAccessKey(dto.accessKey);

    if (user !== null && user.isActive && user.isUniversalRouteSetter) {
      await this.recordAuthAuditSafely('auth.universal_route_setter.login.challenge', {
        deviceId: dto.deviceId,
        ipAddress,
        meta: {
          accessKeyFingerprint: fingerprint(dto.accessKey),
          reason: 'actor_full_name_required',
        },
        userId: user.id,
      });
      throw new DomainValidationError(
        'AUTH_ACTOR_FULL_NAME_REQUIRED',
        'Actor full name is required',
      );
    }

    if (user === null || !user.isActive) {
      await this.refreshTokenStore.recordFailedLogin(ipAddress, dto.deviceId);
      await this.recordAuthAuditSafely('auth.login.failure', {
        deviceId: dto.deviceId,
        ipAddress,
        meta: {
          accessKeyFingerprint: fingerprint(dto.accessKey),
          reason: user === null ? 'invalid_access_key' : 'inactive_user',
        },
        userId: user?.id ?? null,
      });
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
    await this.recordAuthAuditSafely('auth.login.success', {
      deviceId: dto.deviceId,
      ipAddress,
      meta: {
        accessKeyFingerprint: fingerprint(dto.accessKey),
        role: user.role,
        username: user.username,
      },
      userId: user.id,
    });

    return tokens;
  }

  async loginUniversalRouteSetter(
    dto: UniversalRouteSetterLoginDto,
    ipAddress?: string,
  ): Promise<AuthTokens & { authorizationFullName: string; authorizationId: string }> {
    try {
      await this.assertLoginAllowed(ipAddress, dto.deviceId);
    } catch (error) {
      await this.recordAuthAuditSafely('auth.universal_route_setter.login.rate_limited', {
        deviceId: dto.deviceId,
        ipAddress,
        meta: { accessKeyFingerprint: fingerprint(dto.accessKey), reason: 'rate_limited' },
      });
      throw error;
    }

    const user = await this.usersService.findByAccessKey(dto.accessKey);

    if (
      user === null ||
      !user.isActive ||
      user.role !== 'route_setter' ||
      !user.isUniversalRouteSetter
    ) {
      await this.refreshTokenStore.recordFailedLogin(ipAddress, dto.deviceId);
      await this.recordAuthAuditSafely('auth.universal_route_setter.login.failure', {
        deviceId: dto.deviceId,
        ipAddress,
        meta: {
          accessKeyFingerprint: fingerprint(dto.accessKey),
          actorFullName: dto.actorFullName,
          reason:
            user === null
              ? 'invalid_access_key'
              : !user.isActive
                ? 'inactive_user'
                : 'not_universal_route_setter',
        },
        userId: user?.id ?? null,
      });
      throw new InvalidCredentialsError();
    }

    await this.refreshTokenStore.clearFailedLogin(ipAddress, dto.deviceId);
    await this.usersService.updateLastLogin(user.id, new Date());

    const expiresAt = new Date(
      Date.now() + this.configService.get('jwt.refreshTtlSeconds', { infer: true }) * 1000,
    );
    const authSession = await this.universalAuthSessionsRepository.create({
      actorFullName: dto.actorFullName.trim(),
      deviceId: dto.deviceId,
      expiresAt,
      ipAddress,
      userId: user.id,
    });
    const payload: JwtPayload = {
      authorizationFullName: authSession.actorFullName,
      authorizationId: authSession.id,
      role: user.role,
      sessionVersion: user.sessionVersion,
      sub: user.id,
      username: user.username,
    };
    const tokens = this.issueTokens(payload);
    const refreshTokenHash = hashToken(tokens.refreshToken);

    await this.refreshTokenStore.save(user.id, dto.deviceId, refreshTokenHash);
    await this.refreshTokensRepository.createAudit({
      deviceId: dto.deviceId,
      expiresAt,
      ipAddress,
      tokenHash: refreshTokenHash,
      userId: user.id,
    });
    await this.recordAuthAuditSafely('auth.universal_route_setter.login.success', {
      deviceId: dto.deviceId,
      ipAddress,
      meta: {
        accessKeyFingerprint: fingerprint(dto.accessKey),
        actorFullName: authSession.actorFullName,
        authorizationId: authSession.id,
        role: user.role,
        username: user.username,
      },
      userId: user.id,
    });

    return {
      ...tokens,
      authorizationFullName: authSession.actorFullName,
      authorizationId: authSession.id,
    };
  }

  async refresh(dto: RefreshTokenDto, ipAddress?: string): Promise<AuthTokens> {
    let payload: JwtPayload;

    try {
      payload = this.verifyRefreshToken(dto.refreshToken);
    } catch (error) {
      await this.recordAuthAuditSafely('auth.refresh.failure', {
        deviceId: dto.deviceId,
        ipAddress,
        meta: { reason: 'invalid_token' },
      });
      throw error;
    }

    const user = (await this.usersService.findEntityById(payload.sub)) ?? null;
    const tokenHash = hashToken(dto.refreshToken);
    const storedTokenHash = await this.refreshTokenStore.get(payload.sub, dto.deviceId);
    const auditToken = await this.refreshTokensRepository.findValidByHash(tokenHash, new Date());

    if (storedTokenHash !== tokenHash || auditToken === null || auditToken.userId !== payload.sub) {
      await this.recordAuthAuditSafely('auth.refresh.failure', {
        deviceId: dto.deviceId,
        ipAddress,
        meta: {
          reason: 'session_mismatch',
          tokenSubject: payload.sub,
          username: payload.username,
        },
        userId: user?.id ?? null,
      });
      throw new InvalidCredentialsError();
    }

    if (user === null || !user.isActive || user.sessionVersion !== payload.sessionVersion) {
      await this.recordAuthAuditSafely('auth.refresh.failure', {
        deviceId: dto.deviceId,
        ipAddress,
        meta: {
          reason:
            user === null ? 'user_not_found' : !user.isActive ? 'inactive_user' : 'session_version_changed',
          tokenSubject: payload.sub,
          username: payload.username,
        },
        userId: user?.id ?? null,
      });
      throw new InvalidCredentialsError();
    }

    if (payload.authorizationId !== undefined) {
      const authSession = await this.universalAuthSessionsRepository.findActiveById(
        payload.authorizationId,
      );

      if (
        authSession === null ||
        authSession.userId !== user.id ||
        authSession.actorFullName !== payload.authorizationFullName
      ) {
        await this.recordAuthAuditSafely('auth.refresh.failure', {
          deviceId: dto.deviceId,
          ipAddress,
          meta: {
            authorizationId: payload.authorizationId,
            reason: 'universal_auth_session_invalid',
            username: payload.username,
          },
          userId: payload.sub,
        });
        throw new InvalidCredentialsError();
      }
    }

    const nextPayload: JwtPayload = {
      authorizationFullName: payload.authorizationFullName,
      authorizationId: payload.authorizationId,
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
    await this.recordAuthAuditSafely('auth.refresh.success', {
      deviceId: dto.deviceId,
      ipAddress,
      meta: {
        role: user.role,
        username: user.username,
      },
      userId: user.id,
    });

    return tokens;
  }

  async logout(dto: LogoutDto, ipAddress?: string): Promise<{ success: true }> {
    const payload = this.verifyRefreshToken(dto.refreshToken);
    const tokenHash = hashToken(dto.refreshToken);
    const user = (await this.usersService.findEntityById(payload.sub)) ?? null;

    await this.refreshTokensRepository.revokeByHash(tokenHash, new Date());
    await this.refreshTokenStore.revoke(payload.sub, dto.deviceId);
    if (payload.authorizationId !== undefined) {
      await this.universalAuthSessionsRepository.revoke(payload.authorizationId);
    }
    await this.recordAuthAuditSafely('auth.logout.success', {
      deviceId: dto.deviceId,
      ipAddress,
      meta: {
        authorizationFullName: payload.authorizationFullName,
        authorizationId: payload.authorizationId,
        tokenSubject: payload.sub,
        username: payload.username,
      },
      userId: user?.id ?? null,
    });

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

  private async recordAuthAuditSafely(
    action: string,
    data: {
      deviceId?: string;
      ipAddress?: string;
      meta?: Record<string, unknown>;
      userId?: string | null;
    },
  ): Promise<void> {
    await this.auditLogService.recordSafely({
      action,
      deviceId: data.deviceId,
      entityType: 'auth',
      ipAddress: data.ipAddress,
      meta: data.meta,
      userId: data.userId ?? null,
    });
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function fingerprint(value: string): string {
  return hashToken(value).slice(0, 12);
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
    typeof payload.role === 'string' &&
    (USER_ROLES as readonly string[]).includes(payload.role) &&
    (
      !('authorizationId' in payload) ||
      payload.authorizationId === undefined ||
      typeof payload.authorizationId === 'string'
    ) &&
    (
      !('authorizationFullName' in payload) ||
      payload.authorizationFullName === undefined ||
      typeof payload.authorizationFullName === 'string'
    )
  );
}
