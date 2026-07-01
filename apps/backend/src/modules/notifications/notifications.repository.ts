import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { MobilePlatform } from '@patrol/shared';

import { DevicePushTokenEntity } from './entities/device-push-token.entity';

type UpsertDevicePushTokenRecord = {
  appVersion?: string;
  deviceId: string;
  platform?: MobilePlatform;
  pushToken: string;
  userId: string;
};

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(DevicePushTokenEntity)
    private readonly devicePushTokens: Repository<DevicePushTokenEntity>,
  ) {}

  async upsertDevicePushToken(
    data: UpsertDevicePushTokenRecord,
  ): Promise<DevicePushTokenEntity> {
    await this.devicePushTokens
      .createQueryBuilder()
      .update(DevicePushTokenEntity)
      .set({ isActive: false })
      .where('user_id = :userId', { userId: data.userId })
      .andWhere('device_id = :deviceId', { deviceId: data.deviceId })
      .andWhere('push_token != :pushToken', { pushToken: data.pushToken })
      .execute();

    let existing = await this.devicePushTokens.findOne({
      where: {
        pushToken: data.pushToken,
      },
    });

    if (existing !== null) {
      existing.deviceId = data.deviceId;
      existing.userId = data.userId;
    } else {
      existing = this.devicePushTokens.create({
        deviceId: data.deviceId,
        pushToken: data.pushToken,
        userId: data.userId,
      });
    }

    existing.appVersion = data.appVersion;
    existing.isActive = true;
    existing.platform = data.platform;

    return this.devicePushTokens.save(existing);
  }

  async deactivateDevicePushToken(userId: string, deviceId: string): Promise<void> {
    await this.devicePushTokens.update({ deviceId, userId }, { isActive: false });
  }

  async deactivatePushTokens(pushTokens: string[]): Promise<void> {
    if (pushTokens.length === 0) {
      return;
    }

    await this.devicePushTokens.update({ pushToken: In(pushTokens) }, { isActive: false });
  }

  findActivePushTokensByUserIds(userIds: string[]): Promise<DevicePushTokenEntity[]> {
    if (userIds.length === 0) {
      return Promise.resolve([]);
    }

    return this.devicePushTokens.find({
      where: {
        isActive: true,
        userId: In(userIds),
      },
    });
  }

  findActiveManagerPushTokensByShop(shopId: string): Promise<DevicePushTokenEntity[]> {
    return this.devicePushTokens
      .createQueryBuilder('token')
      .innerJoin('token.user', 'user')
      .leftJoin('user.shops', 'assignedShop')
      .where('token.is_active = :isActive', { isActive: true })
      .andWhere('user.is_active = :userIsActive', { userIsActive: true })
      .andWhere(
        'user.role = :managerRole AND (user.shop_id = :shopId OR assignedShop.id = :shopId)',
        {
          managerRole: 'manager',
          shopId,
        },
      )
      .getMany();
  }
}
