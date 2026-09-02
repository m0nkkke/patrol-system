import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FilesModule } from '../files/files.module';
import { PatrolsModule } from '../patrols/patrols.module';
import { ShopsModule } from '../shops/shops.module';
import { UsersModule } from '../users/users.module';
import { ControlIncidentsController } from './control/control-incidents.controller';
import { ControlIncidentsRepository } from './control/control-incidents.repository';
import { ControlIncidentsService } from './control/control-incidents.service';
import { ControlPatrolsController } from './control/control-patrols.controller';
import { ControlPatrolsRepository } from './control/control-patrols.repository';
import { ControlPatrolsService } from './control/control-patrols.service';
import { ControlReportsController } from './control/control-reports.controller';
import { ControlShopOverviewController } from './control/control-shop-overview.controller';
import { ControlShopOverviewRepository } from './control/control-shop-overview.repository';
import { ControlShopOverviewService } from './control/control-shop-overview.service';
import { ControlStaffController } from './control/control-staff.controller';
import { ControlStaffRepository } from './control/control-staff.repository';
import { ControlStaffService } from './control/control-staff.service';
import { PatrolReportFileEntity } from './entities/patrol-report-file.entity';
import { PatrolReportEntity } from './entities/patrol-report.entity';
import { ReportOutboxEventEntity } from './entities/report-outbox-event.entity';
import { ReportsExportService } from './export/reports-export.service';
import { PatrolIncidentEntity } from '../patrols/entities/patrol-incident.entity';
import { PatrolEventEntity } from '../patrols/entities/patrol-event.entity';
import { PatrolPointVisitEntity } from '../patrols/entities/patrol-point-visit.entity';
import { PatrolEntity } from '../patrols/entities/patrol.entity';
import { RouteTimingProfileEntity } from '../patrols/entities/route-timing-profile.entity';
import { ShopEntity } from '../shops/entities/shop.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ManagementBreakdownController } from './management/management-breakdown.controller';
import { ManagementBreakdownRepository } from './management/management-breakdown.repository';
import { ManagementBreakdownService } from './management/management-breakdown.service';
import { ManagementMetricsController } from './management/management-metrics.controller';
import { ManagementMetricsRepository } from './management/management-metrics.repository';
import { ManagementMetricsService } from './management/management-metrics.service';
import { ManagementScorecardsController } from './management/management-scorecards.controller';
import { ManagementScorecardsRepository } from './management/management-scorecards.repository';
import { ManagementScorecardsService } from './management/management-scorecards.service';
import { ManagementTrendsController } from './management/management-trends.controller';
import { ManagementTrendsRepository } from './management/management-trends.repository';
import { ManagementTrendsService } from './management/management-trends.service';
import { MobileReportsController } from './operational/mobile-reports.controller';
import { ReportsRepository } from './operational/reports.repository';
import { ReportsService } from './operational/reports.service';
import { DisabledReportingCoreClientService } from './outbox/disabled-reporting-core-client.service';
import { HttpReportingCoreClientService } from './outbox/http-reporting-core-client.service';
import { ReportOutboxMonitoringController } from './outbox/report-outbox-monitoring.controller';
import { ReportOutboxMonitoringService } from './outbox/report-outbox-monitoring.service';
import { ReportOutboxRepository } from './outbox/report-outbox.repository';
import { ReportOutboxPublisherService } from './outbox/report-outbox-publisher.service';
import { ReportOutboxService } from './outbox/report-outbox.service';
import { REPORTING_CORE_CLIENT } from './outbox/reporting-core-client.port';

@Module({
  controllers: [
    MobileReportsController,
    ControlIncidentsController,
    ControlPatrolsController,
    ControlReportsController,
    ControlShopOverviewController,
    ControlStaffController,
    ManagementBreakdownController,
    ManagementMetricsController,
    ManagementScorecardsController,
    ManagementTrendsController,
    ReportOutboxMonitoringController,
  ],
  exports: [ReportOutboxMonitoringService, ReportsService],
  imports: [
    FilesModule,
    PatrolsModule,
    ShopsModule,
    UsersModule,
    TypeOrmModule.forFeature([
      PatrolIncidentEntity,
      PatrolEventEntity,
      PatrolPointVisitEntity,
      PatrolEntity,
      PatrolReportEntity,
      PatrolReportFileEntity,
      ReportOutboxEventEntity,
      ShopEntity,
      UserEntity,
      RouteTimingProfileEntity,
    ]),
  ],
  providers: [
    ControlIncidentsRepository,
    ControlIncidentsService,
    ControlPatrolsRepository,
    ControlPatrolsService,
    ControlShopOverviewRepository,
    ControlShopOverviewService,
    ControlStaffRepository,
    ControlStaffService,
    DisabledReportingCoreClientService,
    HttpReportingCoreClientService,
    ManagementBreakdownRepository,
    ManagementBreakdownService,
    ManagementMetricsRepository,
    ManagementMetricsService,
    ManagementScorecardsRepository,
    ManagementScorecardsService,
    ManagementTrendsRepository,
    ManagementTrendsService,
    ReportOutboxPublisherService,
    ReportOutboxMonitoringService,
    ReportOutboxRepository,
    ReportOutboxService,
    {
      inject: [
        ConfigService,
        DisabledReportingCoreClientService,
        HttpReportingCoreClientService,
      ],
      provide: REPORTING_CORE_CLIENT,
      useFactory: (
        configService: ConfigService,
        disabledClient: DisabledReportingCoreClientService,
        httpClient: HttpReportingCoreClientService,
      ) =>
        configService.get('reportingCore.transport') === 'http' ? httpClient : disabledClient,
    },
    ReportsExportService,
    ReportsRepository,
    ReportsService,
  ],
})
export class ReportsModule {}
