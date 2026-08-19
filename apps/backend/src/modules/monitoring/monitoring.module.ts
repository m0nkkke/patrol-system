import { Module } from '@nestjs/common';

import { AuthSessionsModule } from '../auth/sessions/auth-sessions.module';
import { ReportsModule } from '../reports/reports.module';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

@Module({
  controllers: [MonitoringController],
  imports: [AuthSessionsModule, ReportsModule],
  providers: [MonitoringService],
})
export class MonitoringModule {}
