import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { FileAssetEntity } from '../files/entities/file-asset.entity';
import { NfcTagEntity } from '../patrol-points/entities/nfc-tag.entity';
import { PatrolPointEntity } from '../patrol-points/entities/patrol-point.entity';
import { PatrolRouteEntity } from '../patrols/entities/patrol-route.entity';
import { ShopEntity } from '../shops/entities/shop.entity';
import { UserEntity } from '../users/entities/user.entity';
import { ArchiveController } from './archive.controller';
import { ArchiveService } from './archive.service';

@Module({
  controllers: [ArchiveController],
  imports: [
    TypeOrmModule.forFeature([
      FileAssetEntity,
      NfcTagEntity,
      PatrolPointEntity,
      PatrolRouteEntity,
      ShopEntity,
      UserEntity,
    ]),
  ],
  providers: [ArchiveService],
})
export class ArchiveModule {}
