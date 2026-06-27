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

  get(userId: string, deviceId: string): Promise<string | null> {
    return this.redis.get(buildRefreshKey(userId, deviceId));
  }

  async revoke(userId: string, deviceId: string): Promise<void> {
    await this.redis.del(buildRefreshKey(userId, deviceId));
  }

  async assertLoginAllowed(ipAddress: string | undefined, deviceId: string): Promise<void> {
    const key = buildLoginAttemptsKey(ipAddress, deviceId);
    const attempts = Number((await this.redis.get(key)) ?? '0');

    if (attempts >= 5) {
      throw new Error('AUTH_TOO_MANY_ATTEMPTS');
    }
  }

  async recordFailedLogin(ipAddress: string | undefined, deviceId: string): Promise<void> {
    const key = buildLoginAttemptsKey(ipAddress, deviceId);
    const attempts = await this.redis.incr(key);

    if (attempts === 1) {
      await this.redis.expire(key, 60);
    }
  }

  async clearFailedLogin(ipAddress: string | undefined, deviceId: string): Promise<void> {
    await this.redis.del(buildLoginAttemptsKey(ipAddress, deviceId));
  }
}

function buildRefreshKey(userId: string, deviceId: string): string {
  return `refresh:${userId}:${deviceId}`;
}

function buildLoginAttemptsKey(ipAddress: string | undefined, deviceId: string): string {
  return `auth:login-attempts:${ipAddress ?? 'unknown'}:${deviceId}`;
}
