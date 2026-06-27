import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DevicePushTokenEntity } from './entities/device-push-token.entity';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

@Module({
  exports: [NotificationsService],
  imports: [TypeOrmModule.forFeature([DevicePushTokenEntity])],
  providers: [NotificationsRepository, NotificationsService],
})
export class NotificationsModule {}
