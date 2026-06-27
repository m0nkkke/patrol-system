import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { PatrolPointsModule } from '../patrol-points/patrol-points.module';
import { PatrolsModule } from '../patrols/patrols.module';
import { ShopsModule } from '../shops/shops.module';
import { UsersModule } from '../users/users.module';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';

@Module({
  controllers: [MobileController],
  imports: [NotificationsModule, PatrolPointsModule, PatrolsModule, ShopsModule, UsersModule],
  providers: [MobileService],
})
export class MobileModule {}
