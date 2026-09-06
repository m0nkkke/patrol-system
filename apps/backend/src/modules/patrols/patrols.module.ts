import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationsModule } from '../notifications/notifications.module';
import { PatrolPointsModule } from '../patrol-points/patrol-points.module';
import { ShopsModule } from '../shops/shops.module';
import { UsersModule } from '../users/users.module';
import { PatrolEventEntity } from './entities/patrol-event.entity';
import { PatrolIncidentEntity } from './entities/patrol-incident.entity';
import { PatrolPointVisitEntity } from './entities/patrol-point-visit.entity';
import { PatrolRoutePointEntity } from './entities/patrol-route-point.entity';
import { PatrolRouteEntity } from './entities/patrol-route.entity';
import { PatrolRouteVersionEntity } from './entities/patrol-route-version.entity';
import { PatrolRouteIntervalEntity } from './entities/patrol-route-interval.entity';
import { PatrolScheduleEntity } from './entities/patrol-schedule.entity';
import { PatrolEntity } from './entities/patrol.entity';
import { RouteTimingProfileEntity } from './entities/route-timing-profile.entity';
import { PatrolOverdueService } from './overdue/patrol-overdue.service';
import { PatrolRoutesController } from './routes/patrol-routes.controller';
import { PatrolRoutesRepository } from './routes/patrol-routes.repository';
import { PatrolRoutesService } from './routes/patrol-routes.service';
import { PatrolSchedulesController } from './schedules/patrol-schedules.controller';
import { PatrolSchedulesRepository } from './schedules/patrol-schedules.repository';
import { PatrolSchedulesService } from './schedules/patrol-schedules.service';
import { PatrolsController } from './patrols.controller';
import { PatrolsRepository } from './patrols.repository';
import { PatrolsService } from './patrols.service';

@Module({
  controllers: [PatrolRoutesController, PatrolSchedulesController, PatrolsController],
  exports: [PatrolRoutesService, PatrolSchedulesService, PatrolsService],
  imports: [
    NotificationsModule,
    PatrolPointsModule,
    ShopsModule,
    UsersModule,
    TypeOrmModule.forFeature([
      PatrolEntity,
      PatrolEventEntity,
      PatrolIncidentEntity,
      PatrolPointVisitEntity,
      PatrolRouteEntity,
      PatrolRouteVersionEntity,
      PatrolRoutePointEntity,
      PatrolRouteIntervalEntity,
      PatrolScheduleEntity,
      RouteTimingProfileEntity,
    ]),
  ],
  providers: [
    PatrolOverdueService,
    PatrolRoutesRepository,
    PatrolRoutesService,
    PatrolSchedulesRepository,
    PatrolSchedulesService,
    PatrolsRepository,
    PatrolsService,
  ],
})
export class PatrolsModule {}
