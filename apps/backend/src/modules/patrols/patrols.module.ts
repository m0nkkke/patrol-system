import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NotificationsModule } from '../notifications/notifications.module';
import { PatrolPointsModule } from '../patrol-points/patrol-points.module';
import { ShopsModule } from '../shops/shops.module';
import { UsersModule } from '../users/users.module';
import { PatrolEventEntity } from './entities/patrol-event.entity';
import { PatrolIncidentEntity } from './entities/patrol-incident.entity';
import { PatrolRouteIntervalEntity } from './entities/patrol-route-interval.entity';
import { PatrolScheduleEntity } from './entities/patrol-schedule.entity';
import { PatrolEntity } from './entities/patrol.entity';
import { PatrolSchedulesController } from './patrol-schedules.controller';
import { PatrolSchedulesRepository } from './patrol-schedules.repository';
import { PatrolSchedulesService } from './patrol-schedules.service';
import { PatrolOverdueService } from './patrol-overdue.service';
import { PatrolsController } from './patrols.controller';
import { PatrolsRepository } from './patrols.repository';
import { PatrolsService } from './patrols.service';

@Module({
  controllers: [PatrolSchedulesController, PatrolsController],
  exports: [PatrolSchedulesService, PatrolsService],
  imports: [
    NotificationsModule,
    PatrolPointsModule,
    ShopsModule,
    UsersModule,
    TypeOrmModule.forFeature([
      PatrolEntity,
      PatrolEventEntity,
      PatrolIncidentEntity,
      PatrolRouteIntervalEntity,
      PatrolScheduleEntity,
    ]),
  ],
  providers: [
    PatrolOverdueService,
    PatrolSchedulesRepository,
    PatrolSchedulesService,
    PatrolsRepository,
    PatrolsService,
  ],
})
export class PatrolsModule {}
