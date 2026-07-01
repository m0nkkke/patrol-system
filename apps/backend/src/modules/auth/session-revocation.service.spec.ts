import { RefreshTokenStore } from './refresh-token.store';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { SessionRevocationService } from './session-revocation.service';

type RefreshTokenStoreMock = Pick<RefreshTokenStore, 'revokeAllForUser'>;
type RefreshTokensRepositoryMock = Pick<RefreshTokensRepository, 'revokeByUserId'>;

describe('SessionRevocationService', () => {
  it('revokes all user refresh sessions', async () => {
    const refreshTokenStore: jest.Mocked<RefreshTokenStoreMock> = {
      revokeAllForUser: jest.fn(),
    };
    const refreshTokensRepository: jest.Mocked<RefreshTokensRepositoryMock> = {
      revokeByUserId: jest.fn(),
    };
    const service = new SessionRevocationService(
      refreshTokenStore as unknown as RefreshTokenStore,
      refreshTokensRepository as unknown as RefreshTokensRepository,
    );
    const revokedAt = new Date('2026-06-30T10:00:00.000Z');

    await service.revokeUserSessions('user-id', revokedAt);

    expect(refreshTokenStore.revokeAllForUser).toHaveBeenCalledWith('user-id');
    expect(refreshTokensRepository.revokeByUserId).toHaveBeenCalledWith('user-id', revokedAt);
  });
});
