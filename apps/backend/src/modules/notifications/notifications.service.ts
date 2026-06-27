import { Injectable } from '@nestjs/common';
import { RegisterDevicePushTokenDto } from '@patrol/shared';

import { DevicePushTokenEntity } from './entities/device-push-token.entity';
import { NotificationsRepository } from './notifications.repository';

@Injectable()
export class NotificationsService {
  constructor(private readonly notificationsRepository: NotificationsRepository) {}

  registerDevicePushToken(
    userId: string,
    dto: RegisterDevicePushTokenDto,
  ): Promise<DevicePushTokenEntity> {
    return this.notificationsRepository.upsertDevicePushToken({
      appVersion: dto.appVersion,
      deviceId: dto.deviceId,
      platform: dto.platform,
      pushToken: normalizePushToken(dto.pushToken),
      userId,
    });
  }

  deactivateDevicePushToken(userId: string, deviceId: string): Promise<void> {
    return this.notificationsRepository.deactivateDevicePushToken(userId, deviceId);
  }
}

function normalizePushToken(pushToken: string): string {
  return pushToken.trim();
}
