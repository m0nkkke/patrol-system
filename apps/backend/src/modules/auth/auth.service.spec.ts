import { ConfigService } from '@nestjs/config';
import { RefreshTokenDto } from '@patrol/shared';
import { createHash } from 'crypto';
import { sign } from 'jsonwebtoken';

import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { InvalidCredentialsError } from '../../common/errors/invalid-credentials.error';
import { AppConfig } from '../../config/app.config';
import { AuditLogService } from '../audit/audit-log.service';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RefreshTokenStore } from './sessions/refresh-token.store';
import { RefreshTokensRepository } from './sessions/refresh-tokens.repository';
import { UniversalAuthSessionsRepository } from './sessions/universal-auth-sessions.repository';

type ConfigServiceMock = {
  get: jest.Mock<string | number | undefined, [string]>;
};
type AuditLogServiceMock = Pick<AuditLogService, 'recordSafely'>;
type RefreshTokenStoreMock = Pick<
  RefreshTokenStore,
  | 'assertLoginAllowed'
  | 'clearFailedLogin'
  | 'get'
  | 'recordFailedLogin'
  | 'revoke'
  | 'save'
>;
type RefreshTokensRepositoryMock = Pick<
  RefreshTokensRepository,
  'createAudit' | 'findValidByHash' | 'revokeByHash'
>;
type UniversalAuthSessionsRepositoryMock = Pick<
  UniversalAuthSessionsRepository,
  'create' | 'findActiveById' | 'revoke'
>;
type UsersServiceMock = Pick<
  UsersService,
  'findByAccessKey' | 'findEntityById' | 'updateLastLogin'
>;

const ACCESS_SECRET = 'a'.repeat(64);
const REFRESH_SECRET = 'b'.repeat(64);

describe('AuthService', () => {
  let auditLogService: jest.Mocked<AuditLogServiceMock>;
  let configService: jest.Mocked<ConfigServiceMock>;
  let refreshTokenStore: jest.Mocked<RefreshTokenStoreMock>;
  let refreshTokensRepository: jest.Mocked<RefreshTokensRepositoryMock>;
  let service: AuthService;
  let universalAuthSessionsRepository: jest.Mocked<UniversalAuthSessionsRepositoryMock>;
  let usersService: jest.Mocked<UsersServiceMock>;

  beforeEach(() => {
    auditLogService = {
      recordSafely: jest.fn(),
    };
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, string | number> = {
          'jwt.accessSecret': ACCESS_SECRET,
          'jwt.accessTtl': '15m',
          'jwt.refreshSecret': REFRESH_SECRET,
          'jwt.refreshTtlSeconds': 604800,
        };

        return values[key];
      }),
    };
    refreshTokenStore = {
      assertLoginAllowed: jest.fn(),
      clearFailedLogin: jest.fn(),
      get: jest.fn(),
      recordFailedLogin: jest.fn(),
      revoke: jest.fn(),
      save: jest.fn(),
    };
    refreshTokensRepository = {
      createAudit: jest.fn(),
      findValidByHash: jest.fn(),
      revokeByHash: jest.fn(),
    };
    universalAuthSessionsRepository = {
      create: jest.fn(),
      findActiveById: jest.fn(),
      revoke: jest.fn(),
    };
    usersService = {
      findByAccessKey: jest.fn(),
      findEntityById: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    service = new AuthService(
      auditLogService as unknown as AuditLogService,
      configService as unknown as ConfigService<AppConfig, true>,
      refreshTokenStore as unknown as RefreshTokenStore,
      refreshTokensRepository as unknown as RefreshTokensRepository,
      universalAuthSessionsRepository as unknown as UniversalAuthSessionsRepository,
      usersService as unknown as UsersService,
    );
  });

  it('logs in universal route setter with unique authorization id', async () => {
    const user = createUser({
      isUniversalRouteSetter: true,
      role: 'route_setter',
      username: 'universal.setter',
    });
    usersService.findByAccessKey.mockResolvedValue(user);
    universalAuthSessionsRepository.create.mockResolvedValue({
      actorFullName: 'Иван Петров',
      id: '00000000-0000-4000-8000-000000000101',
      userId: user.id,
    } as Awaited<ReturnType<UniversalAuthSessionsRepository['create']>>);

    const result = await service.loginUniversalRouteSetter(
      {
        accessKey: 'SETT-SEED-0001',
        actorFullName: 'Иван Петров',
        deviceId: 'device-1',
      },
      '127.0.0.1',
    );

    expect(result.authorizationId).toBe('00000000-0000-4000-8000-000000000101');
    expect(result.authorizationFullName).toBe('Иван Петров');
    expect(refreshTokenStore.save).toHaveBeenCalledWith(user.id, 'device-1', expect.any(String));
    expect(auditLogService.recordSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.universal_route_setter.login.success',
        meta: expect.objectContaining({
          actorFullName: 'Иван Петров',
          authorizationId: '00000000-0000-4000-8000-000000000101',
        }),
        userId: user.id,
      }),
    );
  });

  it('requests actor full name for universal route setter on regular login endpoint', async () => {
    const user = createUser({
      isUniversalRouteSetter: true,
      role: 'route_setter',
      username: 'universal.setter',
    });
    usersService.findByAccessKey.mockResolvedValue(user);

    await expect(
      service.login({ accessKey: 'SETT-SEED-0001', deviceId: 'device-1' }, '127.0.0.1'),
    ).rejects.toMatchObject({
      code: 'AUTH_ACTOR_FULL_NAME_REQUIRED',
      message: 'Actor full name is required',
    });

    expect(refreshTokenStore.recordFailedLogin).not.toHaveBeenCalled();
    expect(refreshTokenStore.clearFailedLogin).not.toHaveBeenCalled();
    expect(refreshTokenStore.save).not.toHaveBeenCalled();
    expect(universalAuthSessionsRepository.create).not.toHaveBeenCalled();
    const challengeAudit = auditLogService.recordSafely.mock.calls.find(
      ([entry]) => entry.action === 'auth.universal_route_setter.login.challenge',
    )?.[0];
    expect(challengeAudit).toMatchObject({
      action: 'auth.universal_route_setter.login.challenge',
      meta: {
        accessKeyFingerprint: hashToken('SETT-SEED-0001').slice(0, 12),
        reason: 'actor_full_name_required',
      },
      userId: user.id,
    });
  });

  it('does not rate-limit repeated universal route setter challenges', async () => {
    const user = createUser({
      isUniversalRouteSetter: true,
      role: 'route_setter',
      username: 'universal.setter',
    });
    usersService.findByAccessKey.mockResolvedValue(user);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        service.login({ accessKey: 'SETT-SEED-0001', deviceId: 'device-1' }, '127.0.0.1'),
      ).rejects.toMatchObject({ code: 'AUTH_ACTOR_FULL_NAME_REQUIRED' });
    }

    expect(refreshTokenStore.assertLoginAllowed).toHaveBeenCalledTimes(5);
    expect(refreshTokenStore.recordFailedLogin).not.toHaveBeenCalled();
    expect(refreshTokenStore.save).not.toHaveBeenCalled();
    expect(universalAuthSessionsRepository.create).not.toHaveBeenCalled();
  });

  it('rotates refresh token and returns new token pair', async () => {
    const user = createUser();
    const refreshToken = createRefreshToken(user);
    const refreshTokenHash = hashToken(refreshToken);
    const dto: RefreshTokenDto = { deviceId: 'device-1', refreshToken };

    refreshTokenStore.get.mockResolvedValue(refreshTokenHash);
    refreshTokensRepository.findValidByHash.mockResolvedValue({
      tokenHash: refreshTokenHash,
      userId: user.id,
    } as Awaited<ReturnType<RefreshTokensRepository['findValidByHash']>>);
    usersService.findEntityById.mockResolvedValue(user);

    const result = await service.refresh(dto, '127.0.0.1');

    expect(result.accessToken).toEqual(expect.any(String));
    expect(result.refreshToken).toEqual(expect.any(String));
    expect(result.refreshToken).not.toBe(refreshToken);
    expect(refreshTokensRepository.revokeByHash).toHaveBeenCalledWith(refreshTokenHash, expect.any(Date));
    expect(refreshTokenStore.save).toHaveBeenCalledWith(user.id, dto.deviceId, expect.any(String));
    expect(refreshTokensRepository.createAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        deviceId: dto.deviceId,
        ipAddress: '127.0.0.1',
        userId: user.id,
      }),
    );
    expect(auditLogService.recordSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.refresh.success',
        deviceId: dto.deviceId,
        entityType: 'auth',
        ipAddress: '127.0.0.1',
        userId: user.id,
      }),
    );
  });

  it('rejects refresh token when Redis session does not match', async () => {
    const user = createUser();
    const refreshToken = createRefreshToken(user);

    refreshTokenStore.get.mockResolvedValue('another-token-hash');
    refreshTokensRepository.findValidByHash.mockResolvedValue({
      tokenHash: hashToken(refreshToken),
      userId: user.id,
    } as Awaited<ReturnType<RefreshTokensRepository['findValidByHash']>>);

    await expect(
      service.refresh({ deviceId: 'device-1', refreshToken }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(auditLogService.recordSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.refresh.failure',
        meta: expect.objectContaining({ reason: 'session_mismatch' }),
        userId: user.id,
      }),
    );
  });

  it('rejects refresh token when user session version changed', async () => {
    const user = createUser({ sessionVersion: 2 });
    const refreshToken = createRefreshToken(createUser({ sessionVersion: 1 }));
    const refreshTokenHash = hashToken(refreshToken);

    refreshTokenStore.get.mockResolvedValue(refreshTokenHash);
    refreshTokensRepository.findValidByHash.mockResolvedValue({
      tokenHash: refreshTokenHash,
      userId: user.id,
    } as Awaited<ReturnType<RefreshTokensRepository['findValidByHash']>>);
    usersService.findEntityById.mockResolvedValue(user);

    await expect(
      service.refresh({ deviceId: 'device-1', refreshToken }),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);
  });

  it('revokes refresh token on logout', async () => {
    const user = createUser();
    const refreshToken = createRefreshToken(user);

    await expect(
      service.logout({ deviceId: 'device-1', refreshToken }, '127.0.0.1'),
    ).resolves.toEqual({ success: true });

    expect(refreshTokensRepository.revokeByHash).toHaveBeenCalledWith(
      hashToken(refreshToken),
      expect.any(Date),
    );
    expect(refreshTokenStore.revoke).toHaveBeenCalledWith(user.id, 'device-1');
    expect(auditLogService.recordSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.logout.success',
        deviceId: 'device-1',
        ipAddress: '127.0.0.1',
        userId: user.id,
      }),
    );
  });

  it('returns domain error when login is rate-limited', async () => {
    refreshTokenStore.assertLoginAllowed.mockRejectedValue(new Error('AUTH_TOO_MANY_ATTEMPTS'));

    await expect(
      service.login({ accessKey: 'MEMP-SEED-0001', deviceId: 'device-1' }),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(usersService.findByAccessKey).not.toHaveBeenCalled();
    expect(auditLogService.recordSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login.rate_limited',
        deviceId: 'device-1',
        entityType: 'auth',
        meta: expect.objectContaining({
          accessKeyFingerprint: expect.any(String),
          reason: 'rate_limited',
        }),
      }),
    );
  });

  it('records failed login attempts', async () => {
    usersService.findByAccessKey.mockResolvedValue(null);

    await expect(
      service.login({ accessKey: 'BAD-KEY', deviceId: 'device-1' }, '127.0.0.1'),
    ).rejects.toBeInstanceOf(InvalidCredentialsError);

    expect(refreshTokenStore.recordFailedLogin).toHaveBeenCalledWith('127.0.0.1', 'device-1');
    expect(auditLogService.recordSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login.failure',
        deviceId: 'device-1',
        entityType: 'auth',
        ipAddress: '127.0.0.1',
        meta: {
          accessKeyFingerprint: expect.any(String),
          reason: 'invalid_access_key',
        },
        userId: null,
      }),
    );
  });
});

function createRefreshToken(user: UserEntity): string {
  return sign(
    {
      role: user.role,
      sessionVersion: user.sessionVersion,
      sub: user.id,
      username: user.username,
    },
    REFRESH_SECRET,
    { expiresIn: 604800 },
  );
}

function createUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    createdAt: new Date(),
    fullName: 'Mobile Employee',
    id: 'user-id',
    isActive: true,
    passwordHash: 'hash',
    role: 'security_guard',
    sessionVersion: 0,
    updatedAt: new Date(),
    username: 'mobile.employee',
    ...overrides,
  } as UserEntity;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
