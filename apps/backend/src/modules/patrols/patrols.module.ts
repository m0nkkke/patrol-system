import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PatrolPointsModule } from '../patrol-points/patrol-points.module';
import { ShopsModule } from '../shops/shops.module';
import { PatrolEventEntity } from './entities/patrol-event.entity';
import { PatrolIncidentEntity } from './entities/patrol-incident.entity';
import { PatrolRouteIntervalEntity } from './entities/patrol-route-interval.entity';
import { PatrolScheduleEntity } from './entities/patrol-schedule.entity';
import { PatrolEntity } from './entities/patrol.entity';
import { PatrolsController } from './patrols.controller';
import { PatrolsRepository } from './patrols.repository';
import { PatrolsService } from './patrols.service';

@Module({
  controllers: [PatrolsController],
  exports: [PatrolsService],
  imports: [
    PatrolPointsModule,
    ShopsModule,
    TypeOrmModule.forFeature([
      PatrolEntity,
      PatrolEventEntity,
      PatrolIncidentEntity,
      PatrolRouteIntervalEntity,
      PatrolScheduleEntity,
    ]),
  ],
  providers: [PatrolsRepository, PatrolsService],
})
export class PatrolsModule {}
