import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { redisProvider } from './redis.provider';
import { RefreshTokenStore } from './refresh-token.store';
import { RefreshTokensRepository } from './refresh-tokens.repository';
import { SessionRevocationService } from './session-revocation.service';

@Module({
  exports: [RefreshTokenStore, RefreshTokensRepository, SessionRevocationService],
  imports: [TypeOrmModule.forFeature([RefreshTokenEntity])],
  providers: [redisProvider, RefreshTokenStore, RefreshTokensRepository, SessionRevocationService],
})
export class AuthSessionsModule {}
