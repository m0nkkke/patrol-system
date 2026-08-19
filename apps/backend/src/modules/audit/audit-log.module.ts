import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuditLogController } from './audit-log.controller';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogService } from './audit-log.service';
import { AuditLogEntity } from './entities/audit-log.entity';
import { AuditLogExportService } from './export/audit-log-export.service';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';

@Global()
@Module({
  controllers: [AuditLogController],
  exports: [AuditLogService],
  imports: [TypeOrmModule.forFeature([AuditLogEntity])],
  providers: [
    AuditLogExportService,
    AuditLogRepository,
    AuditLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AuditLogModule {}
