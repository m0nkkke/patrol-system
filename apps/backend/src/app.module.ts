import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';

import { appConfig, validationSchema } from './config/app.config';
import { databaseConfig } from './database/database.config';
import { AnonymousAppealsModule } from './modules/anonymous/anonymous-appeals.module';
import { ArchiveModule } from './modules/archive/archive.module';
import { AuthModule } from './modules/auth/auth.module';
import { AuditLogModule } from './modules/audit/audit-log.module';
import { FilesModule } from './modules/files/files.module';
import { HealthModule } from './modules/health/health.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { PatrolPointsModule } from './modules/patrol-points/patrol-points.module';
import { PatrolsModule } from './modules/patrols/patrols.module';
import { ReportsModule } from './modules/reports/reports.module';
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
    ScheduleModule.forRoot(),
    HealthModule,
    FilesModule,
    ShopsModule,
    UsersModule,
    AnonymousAppealsModule,
    ArchiveModule,
    AuditLogModule,
    AuthModule,
    MobileModule,
    MonitoringModule,
    PatrolPointsModule,
    PatrolsModule,
    ReportsModule,
  ],
})
export class AppModule {}
