import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { AppConfig } from '../../config/app.config';

export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

export const redisProvider = {
  inject: [ConfigService],
  provide: REDIS_CLIENT,
  useFactory: (configService: ConfigService<AppConfig, true>): Redis => {
    return new Redis({
      host: configService.get('redis.host', { infer: true }),
      password: configService.get('redis.password', { infer: true }),
      port: configService.get('redis.port', { infer: true }),
    });
  },
};
