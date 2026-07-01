import { ConfigService } from '@nestjs/config';
import { RefreshTokenDto } from '@patrol/shared';
import { createHash } from 'crypto';
import { sign } from 'jsonwebtoken';

import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { InvalidCredentialsError } from '../../common/errors/invalid-credentials.error';
import { AppConfig } from '../../config/app.config';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RefreshTokenStore } from './refresh-token.store';
import { RefreshTokensRepository } from './refresh-tokens.repository';

type ConfigServiceMock = {
  get: jest.Mock<string | number | undefined, [string]>;
};
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
type UsersServiceMock = Pick<
  UsersService,
  'findByAccessKey' | 'findEntityById' | 'updateLastLogin'
>;

const ACCESS_SECRET = 'a'.repeat(64);
const REFRESH_SECRET = 'b'.repeat(64);

describe('AuthService', () => {
  let configService: jest.Mocked<ConfigServiceMock>;
  let refreshTokenStore: jest.Mocked<RefreshTokenStoreMock>;
  let refreshTokensRepository: jest.Mocked<RefreshTokensRepositoryMock>;
  let service: AuthService;
  let usersService: jest.Mocked<UsersServiceMock>;

  beforeEach(() => {
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
    usersService = {
      findByAccessKey: jest.fn(),
      findEntityById: jest.fn(),
      updateLastLogin: jest.fn(),
    };

    service = new AuthService(
      configService as unknown as ConfigService<AppConfig, true>,
      refreshTokenStore as unknown as RefreshTokenStore,
      refreshTokensRepository as unknown as RefreshTokensRepository,
      usersService as unknown as UsersService,
    );
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
      service.logout({ deviceId: 'device-1', refreshToken }),
    ).resolves.toEqual({ success: true });

    expect(refreshTokensRepository.revokeByHash).toHaveBeenCalledWith(
      hashToken(refreshToken),
      expect.any(Date),
    );
    expect(refreshTokenStore.revoke).toHaveBeenCalledWith(user.id, 'device-1');
  });

  it('returns domain error when login is rate-limited', async () => {
    refreshTokenStore.assertLoginAllowed.mockRejectedValue(new Error('AUTH_TOO_MANY_ATTEMPTS'));

    await expect(
      service.login({ accessKey: 'MEMP-SEED-0001', deviceId: 'device-1' }),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(usersService.findByAccessKey).not.toHaveBeenCalled();
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
    role: 'employee',
    sessionVersion: 0,
    updatedAt: new Date(),
    username: 'mobile.employee',
    ...overrides,
  } as UserEntity;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
