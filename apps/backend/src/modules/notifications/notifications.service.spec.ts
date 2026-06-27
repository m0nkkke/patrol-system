import { ConfigService } from '@nestjs/config';

import { AppConfig } from '../../config/app.config';
import { DevicePushTokenEntity } from './entities/device-push-token.entity';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

type NotificationsRepositoryMock = Pick<
  NotificationsRepository,
  | 'deactivateDevicePushToken'
  | 'deactivatePushTokens'
  | 'findActiveManagerAndAdminPushTokensByShop'
  | 'upsertDevicePushToken'
>;
type ConfigServiceMock = {
  get: jest.Mock<unknown, [string, { infer: true }?]>;
};

describe('NotificationsService', () => {
  let configService: ConfigServiceMock;
  let repository: jest.Mocked<NotificationsRepositoryMock>;
  let service: NotificationsService;

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'notifications.expoAccessToken': undefined,
          'notifications.expoPushEndpoint': 'https://exp.host/--/api/v2/push/send',
          'notifications.pushEnabled': false,
        };

        return values[key];
      }),
    };
    repository = {
      deactivateDevicePushToken: jest.fn(),
      deactivatePushTokens: jest.fn(),
      findActiveManagerAndAdminPushTokensByShop: jest.fn(),
      upsertDevicePushToken: jest.fn(),
    };
    service = new NotificationsService(
      configService as unknown as ConfigService<AppConfig>,
      repository as unknown as NotificationsRepository,
    );
  });

  it('registers normalized device push token for user', async () => {
    const token = createDevicePushToken();
    repository.upsertDevicePushToken.mockResolvedValue(token);

    const result = await service.registerDevicePushToken('user-id', {
      deviceId: 'device-1',
      platform: 'android',
      pushToken: '  ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]  ',
    });

    expect(repository.upsertDevicePushToken).toHaveBeenCalledWith({
      appVersion: undefined,
      deviceId: 'device-1',
      platform: 'android',
      pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      userId: 'user-id',
    });
    expect(result).toBe(token);
  });

  it('does not call Expo when push notifications are disabled', async () => {
    repository.findActiveManagerAndAdminPushTokensByShop.mockResolvedValue([
      createDevicePushToken(),
    ]);
    const fetchMock = jest.spyOn(global, 'fetch');

    await service.notifyPatrolOverdue({
      patrolId: 'patrol-id',
      shopId: 'shop-id',
    });

    expect(fetchMock).not.toHaveBeenCalled();
    fetchMock.mockRestore();
  });

  it('sends incident push and deactivates unregistered Expo token', async () => {
    configService.get.mockImplementation((key: string) => {
      const values: Record<string, unknown> = {
        'notifications.expoAccessToken': 'expo-secret',
        'notifications.expoPushEndpoint': 'https://exp.host/--/api/v2/push/send',
        'notifications.pushEnabled': true,
      };

      return values[key];
    });
    repository.findActiveManagerAndAdminPushTokensByShop.mockResolvedValue([
      createDevicePushToken({
        pushToken: 'ExponentPushToken[invalid]',
      }),
    ]);
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
      json: () => Promise.resolve({
        data: [
          {
            details: { error: 'DeviceNotRegistered' },
            status: 'error',
          },
        ],
      }),
      ok: true,
    } as Response);

    await service.notifyPatrolIncident({
      incidentId: 'incident-id',
      message: 'Слишком длинный интервал',
      patrolId: 'patrol-id',
      shopId: 'shop-id',
      shopName: 'Магазин 1',
      type: 'long_interval',
    });

    const fetchCall = fetchMock.mock.calls[0];
    expect(fetchCall?.[0]).toBe('https://exp.host/--/api/v2/push/send');
    expect(fetchCall?.[1]?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer expo-secret',
      }),
    );
    expect(repository.deactivatePushTokens).toHaveBeenCalledWith([
      'ExponentPushToken[invalid]',
    ]);
    fetchMock.mockRestore();
  });
});

function createDevicePushToken(
  overrides: Partial<DevicePushTokenEntity> = {},
): DevicePushTokenEntity {
  return {
    createdAt: new Date(),
    deviceId: 'device-1',
    id: 'token-id',
    isActive: true,
    pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    updatedAt: new Date(),
    userId: 'user-id',
    ...overrides,
  } as DevicePushTokenEntity;
}
