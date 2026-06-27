import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PatrolIncidentType, RegisterDevicePushTokenDto } from '@patrol/shared';

import { AppConfig } from '../../config/app.config';
import { DevicePushTokenEntity } from './entities/device-push-token.entity';
import { NotificationsRepository } from './notifications.repository';

type PushPayload = {
  body: string;
  data: Record<string, string>;
  title: string;
};

type PatrolNotificationContext = {
  employeeName?: string;
  patrolId: string;
  shopId: string;
  shopName?: string;
};

type PatrolIncidentNotificationContext = PatrolNotificationContext & {
  incidentId: string;
  message: string;
  type: PatrolIncidentType;
};

type ExpoPushMessage = {
  body: string;
  data: Record<string, string>;
  sound: 'default';
  title: string;
  to: string;
};

type ExpoPushTicket = {
  details?: {
    error?: string;
  };
  message?: string;
  status?: string;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly configService: ConfigService<AppConfig>,
    private readonly notificationsRepository: NotificationsRepository,
  ) {}

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

  async notifyPatrolIncident(context: PatrolIncidentNotificationContext): Promise<void> {
    const tokens = await this.notificationsRepository.findActiveManagerAndAdminPushTokensByShop(
      context.shopId,
    );

    await this.sendToTokens(tokens, {
      body: context.message,
      data: {
        incidentId: context.incidentId,
        patrolId: context.patrolId,
        shopId: context.shopId,
        type: context.type,
      },
      title: `Инцидент обхода${formatShopSuffix(context.shopName)}`,
    });
  }

  async notifyPatrolOverdue(context: PatrolNotificationContext): Promise<void> {
    const tokens = await this.notificationsRepository.findActiveManagerAndAdminPushTokensByShop(
      context.shopId,
    );

    await this.sendToTokens(tokens, {
      body: `Обходчик${formatEmployeeSuffix(context.employeeName)} не завершил обход вовремя.`,
      data: {
        patrolId: context.patrolId,
        shopId: context.shopId,
        type: 'patrol_overdue',
      },
      title: `Просрочен обход${formatShopSuffix(context.shopName)}`,
    });
  }

  async notifyPatrolCancelled(
    context: PatrolNotificationContext & { cancellationReason?: string },
  ): Promise<void> {
    const tokens = await this.notificationsRepository.findActiveManagerAndAdminPushTokensByShop(
      context.shopId,
    );

    await this.sendToTokens(tokens, {
      body: context.cancellationReason?.trim() ?? 'Сотрудник отменил текущий обход.',
      data: {
        patrolId: context.patrolId,
        shopId: context.shopId,
        type: 'patrol_cancelled',
      },
      title: `Обход отменен${formatShopSuffix(context.shopName)}`,
    });
  }

  private async sendToTokens(
    tokenRecords: DevicePushTokenEntity[],
    payload: PushPayload,
  ): Promise<void> {
    const pushTokens = uniquePushTokens(tokenRecords);

    if (
      pushTokens.length === 0 ||
      !this.configService.get('notifications.pushEnabled', { infer: true })
    ) {
      return;
    }

    const endpoint =
      this.configService.get('notifications.expoPushEndpoint', { infer: true }) ??
      'https://exp.host/--/api/v2/push/send';
    const accessToken = this.configService.get('notifications.expoAccessToken', { infer: true });

    const messages = pushTokens.map((pushToken): ExpoPushMessage => ({
      body: payload.body,
      data: payload.data,
      sound: 'default',
      title: payload.title,
      to: pushToken,
    }));

    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify(messages),
        headers: buildExpoHeaders(accessToken),
        method: 'POST',
      });

      if (!response.ok) {
        this.logger.warn(`Expo push request failed with status ${response.status}`);
        return;
      }

      const body: unknown = await response.json();
      const invalidTokens = extractInvalidExpoTokens(body, pushTokens);

      if (invalidTokens.length > 0) {
        await this.notificationsRepository.deactivatePushTokens(invalidTokens);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Expo push request failed: ${message}`);
    }
  }
}

function normalizePushToken(pushToken: string): string {
  return pushToken.trim();
}

function uniquePushTokens(tokenRecords: DevicePushTokenEntity[]): string[] {
  return Array.from(
    new Set(
      tokenRecords
        .map((tokenRecord) => tokenRecord.pushToken.trim())
        .filter((pushToken) => pushToken.length > 0),
    ),
  );
}

function buildExpoHeaders(accessToken?: string): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate',
    'Content-Type': 'application/json',
  };

  if (accessToken !== undefined) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

function extractInvalidExpoTokens(body: unknown, pushTokens: string[]): string[] {
  if (!isExpoResponse(body)) {
    return [];
  }

  return body.data
    .map((ticket, index) =>
      ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered'
        ? pushTokens[index]
        : undefined,
    )
    .filter((pushToken): pushToken is string => pushToken !== undefined);
}

function isExpoResponse(body: unknown): body is { data: ExpoPushTicket[] } {
  if (typeof body !== 'object' || body === null || !('data' in body)) {
    return false;
  }

  const data = (body as { data: unknown }).data;
  return Array.isArray(data);
}

function formatShopSuffix(shopName?: string): string {
  return shopName === undefined || shopName.trim().length === 0 ? '' : `: ${shopName.trim()}`;
}

function formatEmployeeSuffix(employeeName?: string): string {
  return employeeName === undefined || employeeName.trim().length === 0
    ? ''
    : ` ${employeeName.trim()}`;
}
