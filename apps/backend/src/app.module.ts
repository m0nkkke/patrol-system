import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { appConfig, validationSchema } from './config/app.config';
import { databaseConfig } from './database/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { PatrolPointsModule } from './modules/patrol-points/patrol-points.module';
import { PatrolsModule } from './modules/patrols/patrols.module';
import { ShopsModule } from './modules/shops/shops.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      expandVariables: true,
      isGlobal: true,
      load: [appConfig],
      validationSchema,
    }),
    TypeOrmModule.forRootAsync(databaseConfig),
    HealthModule,
    ShopsModule,
    UsersModule,
    AuthModule,
    MobileModule,
    PatrolPointsModule,
    PatrolsModule,
  ],
})
export class AppModule {}
