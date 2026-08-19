import { Injectable } from '@nestjs/common';

import { RefreshTokenStore } from './refresh-token.store';
import { RefreshTokensRepository } from './refresh-tokens.repository';

@Injectable()
export class SessionRevocationService {
  constructor(
    private readonly refreshTokenStore: RefreshTokenStore,
    private readonly refreshTokensRepository: RefreshTokensRepository,
  ) {}

  async revokeUserSessions(userId: string, revokedAt: Date = new Date()): Promise<void> {
    await Promise.all([
      this.refreshTokenStore.revokeAllForUser(userId),
      this.refreshTokensRepository.revokeByUserId(userId, revokedAt),
    ]);
  }
}
