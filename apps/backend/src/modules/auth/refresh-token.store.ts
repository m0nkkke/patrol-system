import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { AppConfig } from '../../config/app.config';
import { REDIS_CLIENT } from './redis.provider';

@Injectable()
export class RefreshTokenStore {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async save(userId: string, deviceId: string, tokenHash: string): Promise<void> {
    const ttlSeconds = this.configService.get('jwt.refreshTtlSeconds', { infer: true });
    await this.redis.set(buildRefreshKey(userId, deviceId), tokenHash, 'EX', ttlSeconds);
  }
}

function buildRefreshKey(userId: string, deviceId: string): string {
  return `refresh:${userId}:${deviceId}`;
}
