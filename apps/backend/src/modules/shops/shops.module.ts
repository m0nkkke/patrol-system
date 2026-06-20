import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PatrolPointsModule } from '../patrol-points/patrol-points.module';
import { RegionEntity } from './entities/region.entity';
import { ShopEntity } from './entities/shop.entity';
import { ShopsController } from './shops.controller';
import { ShopsRepository } from './shops.repository';
import { ShopsService } from './shops.service';

@Module({
  controllers: [ShopsController],
  exports: [ShopsService],
  imports: [PatrolPointsModule, TypeOrmModule.forFeature([RegionEntity, ShopEntity])],
  providers: [ShopsRepository, ShopsService],
})
export class ShopsModule {}
