import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';

import { AppConfig } from '../config/app.config';

export const databaseConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (configService: ConfigService<AppConfig, true>) => ({
    autoLoadEntities: true,
    database: configService.get('database.name', { infer: true }),
    host: configService.get('database.host', { infer: true }),
    migrations: ['dist/database/migrations/*.js'],
    password: configService.get('database.password', { infer: true }),
    port: configService.get('database.port', { infer: true }),
    ssl: configService.get('database.ssl', { infer: true }),
    synchronize: false,
    type: 'postgres',
    username: configService.get('database.username', { infer: true }),
  }),
};
