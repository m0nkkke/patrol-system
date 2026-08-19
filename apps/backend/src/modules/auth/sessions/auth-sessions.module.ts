import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RefreshTokenEntity } from '../entities/refresh-token.entity';
import { UniversalAuthSessionEntity } from '../entities/universal-auth-session.entity';
import { REDIS_CLIENT, redisProvider } from './redis.provider';
import { RefreshTokenStore } from './refresh-token.store';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { SessionRevocationService } from './session-revocation.service';
import { UniversalAuthSessionsRepository } from './universal-auth-sessions.repository';

@Module({
  exports: [
    REDIS_CLIENT,
    RefreshTokenStore,
    RefreshTokensRepository,
    SessionRevocationService,
    UniversalAuthSessionsRepository,
  ],
  imports: [TypeOrmModule.forFeature([RefreshTokenEntity, UniversalAuthSessionEntity])],
  providers: [
    redisProvider,
    RefreshTokenStore,
    RefreshTokensRepository,
    SessionRevocationService,
    UniversalAuthSessionsRepository,
  ],
})
export class AuthSessionsModule {}
