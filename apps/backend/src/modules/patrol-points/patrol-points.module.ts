import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { NfcTagEntity } from './entities/nfc-tag.entity';
import { NfcTagReplacementEntity } from './entities/nfc-tag-replacement.entity';
import { PatrolPointEntity } from './entities/patrol-point.entity';
import { PatrolPointsController } from './patrol-points.controller';
import { PatrolPointsRepository } from './patrol-points.repository';
import { PatrolPointsService } from './patrol-points.service';

@Module({
  controllers: [PatrolPointsController],
  exports: [PatrolPointsService],
  imports: [TypeOrmModule.forFeature([NfcTagEntity, NfcTagReplacementEntity, PatrolPointEntity])],
  providers: [PatrolPointsRepository, PatrolPointsService],
})
export class PatrolPointsModule {}
