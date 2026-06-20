import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RefreshTokenEntity } from './entities/refresh-token.entity';
import { redisProvider } from './redis.provider';
import { RefreshTokenStore } from './refresh-token.store';
import { RefreshTokensRepository } from './refresh-tokens.repository';

@Module({
  controllers: [AuthController],
  imports: [TypeOrmModule.forFeature([RefreshTokenEntity]), UsersModule],
  providers: [AuthService, redisProvider, RefreshTokenStore, RefreshTokensRepository],
})
export class AuthModule {}
