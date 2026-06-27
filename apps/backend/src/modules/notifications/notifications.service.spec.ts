import { DevicePushTokenEntity } from './entities/device-push-token.entity';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

type NotificationsRepositoryMock = Pick<
  NotificationsRepository,
  'deactivateDevicePushToken' | 'upsertDevicePushToken'
>;

describe('NotificationsService', () => {
  let repository: jest.Mocked<NotificationsRepositoryMock>;
  let service: NotificationsService;

  beforeEach(() => {
    repository = {
      deactivateDevicePushToken: jest.fn(),
      upsertDevicePushToken: jest.fn(),
    };
    service = new NotificationsService(repository as unknown as NotificationsRepository);
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
