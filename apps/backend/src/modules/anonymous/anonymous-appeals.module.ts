import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ShopsModule } from '../shops/shops.module';
import { AnonymousAppealsController } from './anonymous-appeals.controller';
import { AnonymousAppealsRepository } from './anonymous-appeals.repository';
import { AnonymousAppealsService } from './anonymous-appeals.service';
import { AnonymousAppealEntity } from './entities/anonymous-appeal.entity';

@Module({
  controllers: [AnonymousAppealsController],
  imports: [ShopsModule, TypeOrmModule.forFeature([AnonymousAppealEntity])],
  providers: [AnonymousAppealsRepository, AnonymousAppealsService],
})
export class AnonymousAppealsModule {}
