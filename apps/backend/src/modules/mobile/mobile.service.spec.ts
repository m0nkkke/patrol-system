import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { NotificationsService } from '../notifications/notifications.service';
import { PatrolPointsService } from '../patrol-points/patrol-points.service';
import { PatrolSchedulesService } from '../patrols/schedules/patrol-schedules.service';
import { PatrolsService } from '../patrols/patrols.service';
import { ShopsService } from '../shops/shops.service';
import { MobileService } from './mobile.service';
import { PatrolEntity } from '../patrols/entities/patrol.entity';

type PatrolPointsServiceMock = Pick<PatrolPointsService, 'findByShop'>;
type NotificationsServiceMock = Pick<NotificationsService, 'registerDevicePushToken'>;
type PatrolSchedulesServiceMock = Pick<PatrolSchedulesService, 'findAvailableByShop'>;
type PatrolsServiceMock = Pick<
  PatrolsService,
  | 'cancel'
  | 'complete'
  | 'findActiveByEmployee'
  | 'findOne'
  | 'getNfcWaitState'
  | 'recordEvent'
  | 'recordEventWithStatus'
  | 'start'
>;
type ShopsServiceMock = Pick<
  ShopsService,
  'bindRoutePointNfc' | 'getRouteSetup' | 'resetRouteSetup' | 'startRouteSetup'
>;

describe('MobileService', () => {
  let notificationsService: jest.Mocked<NotificationsServiceMock>;
  let patrolPointsService: jest.Mocked<PatrolPointsServiceMock>;
  let patrolSchedulesService: jest.Mocked<PatrolSchedulesServiceMock>;
  let patrolsService: jest.Mocked<PatrolsServiceMock>;
  let service: MobileService;
  let shopsService: jest.Mocked<ShopsServiceMock>;

  beforeEach(() => {
    notificationsService = {
      registerDevicePushToken: jest.fn(),
    };
    patrolPointsService = {
      findByShop: jest.fn(),
    };
    patrolSchedulesService = {
      findAvailableByShop: jest.fn(),
    };
    patrolsService = {
      cancel: jest.fn(),
      complete: jest.fn(),
      findActiveByEmployee: jest.fn(),
      findOne: jest.fn(),
      getNfcWaitState: jest.fn(),
      recordEvent: jest.fn(),
      recordEventWithStatus: jest.fn(),
      start: jest.fn(),
    };
    shopsService = {
      bindRoutePointNfc: jest.fn(),
      getRouteSetup: jest.fn(),
      resetRouteSetup: jest.fn(),
      startRouteSetup: jest.fn(),
    };
    service = new MobileService(
      notificationsService as unknown as NotificationsService,
      patrolPointsService as unknown as PatrolPointsService,
      patrolSchedulesService as unknown as PatrolSchedulesService,
      patrolsService as unknown as PatrolsService,
      shopsService as unknown as ShopsService,
    );
  });

  it('returns route registration capability for admin user', () => {
    const profile = service.getProfile(createUser({ role: 'admin' }));

    expect(profile.capabilities.canRegisterRoutes).toBe(true);
    expect(profile.capabilities.canRunPatrols).toBe(false);
  });

  it('forwards the explicitly selected route when starting a mobile patrol', async () => {
    await service.startPatrol(createUser({ role: 'security_guard', shopId: 'shop-id' }), {
      lateStartReason: 'авария на дороге',
      shopId: 'shop-id',
      routeId: 'route-b',
    });
    expect(patrolsService.start).toHaveBeenCalledWith(
      expect.objectContaining({
        lateStartReason: 'авария на дороге',
        shopId: 'shop-id',
        routeId: 'route-b',
      }),
    );
  });

  it('returns only the active patrol snapshot with route order and individual dwell times', async () => {
    const routeSnapshot = [
      {
        id: 'point-b',
        shopId: 'shop-id',
        name: 'B',
        sortOrder: 1,
        dwellSeconds: 0,
        isActive: true,
      },
      {
        id: 'point-a',
        shopId: 'shop-id',
        name: 'A',
        sortOrder: 2,
        dwellSeconds: 120,
        isActive: true,
      },
    ];
    patrolsService.findActiveByEmployee.mockResolvedValue(
      Object.assign(new PatrolEntity(), {
        shopId: 'shop-id',
        routeId: 'route-b',
        routeSnapshot,
      }),
    );
    await expect(
      service.getRouteForShop(createUser({ role: 'security_guard', shopId: 'shop-id' }), 'shop-id'),
    ).resolves.toEqual(routeSnapshot);
    expect(patrolPointsService.findByShop).not.toHaveBeenCalled();
  });

  it('does not substitute shop points when there is no matching active patrol or snapshot', async () => {
    const user = createUser({ role: 'security_guard', shopIds: ['shop-id', 'other-shop'] });
    for (const patrol of [null, Object.assign(new PatrolEntity(), { shopId: 'other-shop' })]) {
      patrolsService.findActiveByEmployee.mockResolvedValue(patrol);
      await expect(service.getRouteForShop(user, 'shop-id')).rejects.toMatchObject({
        code: 'MOBILE_ACTIVE_PATROL_REQUIRED',
      });
    }
    patrolsService.findActiveByEmployee.mockResolvedValue(
      Object.assign(new PatrolEntity(), { shopId: 'shop-id' }),
    );
    await expect(service.getRouteForShop(user, 'shop-id')).rejects.toMatchObject({
      code: 'PATROL_ROUTE_SNAPSHOT_UNAVAILABLE',
    });
    await expect(service.getRouteForShop(user, 'unassigned')).rejects.toMatchObject({
      code: 'MOBILE_SHOP_FORBIDDEN',
    });
    expect(patrolPointsService.findByShop).not.toHaveBeenCalled();
  });

  it('registers current device push token', async () => {
    notificationsService.registerDevicePushToken.mockResolvedValue({
      deviceId: 'device-1',
      id: 'token-id',
      isActive: true,
      pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      userId: 'user-id',
    } as Awaited<ReturnType<NotificationsService['registerDevicePushToken']>>);

    const result = await service.registerDevicePushToken(createUser({ id: 'user-id' }), {
      deviceId: 'device-1',
      platform: 'android',
      pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    });

    expect(notificationsService.registerDevicePushToken).toHaveBeenCalledWith('user-id', {
      deviceId: 'device-1',
      platform: 'android',
      pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    });
    expect(result.isActive).toBe(true);
  });

  it('binds scanned NFC UID to next route point', async () => {
    shopsService.getRouteSetup.mockResolvedValue({
      expectedPoints: 3,
      nextSortOrder: 2,
      points: [],
      registeredPoints: 1,
      routeStatus: 'setup_in_progress',
      shopId: 'shop-id',
    });
    shopsService.bindRoutePointNfc.mockResolvedValue({
      expectedPoints: 3,
      nextSortOrder: 3,
      points: [],
      registeredPoints: 2,
      routeStatus: 'setup_in_progress',
      shopId: 'shop-id',
    });

    await service.scanNextRoutePoint(
      createUser({ role: 'local_route_setter', shopId: 'shop-id' }),
      'shop-id',
      { uid: '04A1B2C3' },
    );

    expect(shopsService.bindRoutePointNfc).toHaveBeenCalledWith('shop-id', 2, {
      uid: '04A1B2C3',
    });
  });

  it('rejects scan before route setup is started', async () => {
    shopsService.getRouteSetup.mockResolvedValue({
      expectedPoints: 0,
      points: [],
      registeredPoints: 0,
      routeStatus: 'not_configured',
      shopId: 'shop-id',
    });

    await expect(
      service.scanNextRoutePoint(
        createUser({ role: 'local_route_setter', shopId: 'shop-id' }),
        'shop-id',
        { uid: '04A1B2C3' },
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
  });

  it('rejects local route setup for a shop outside the setter assignments', async () => {
    await expect(
      service.startRouteSetup(
        createUser({ role: 'local_route_setter', shopId: 'shop-id' }),
        'other-shop-id',
        { expectedPoints: 3 },
      ),
    ).rejects.toMatchObject({ code: 'MOBILE_ROUTE_SETUP_FORBIDDEN' });

    expect(shopsService.startRouteSetup).not.toHaveBeenCalled();
  });

  it('rejects local route setup for an unassigned shop', async () => {
    await expect(
      service.getRouteSetup(
        createUser({ role: 'local_route_setter', shopId: 'assigned-shop-id' }),
        'other-shop-id',
      ),
    ).rejects.toMatchObject({ code: 'MOBILE_ROUTE_SETUP_FORBIDDEN' });

    expect(shopsService.getRouteSetup).not.toHaveBeenCalled();
  });

  it('returns per-event status for offline sync', async () => {
    patrolsService.findOne.mockResolvedValue({
      employeeId: 'user-id',
      id: 'patrol-id',
    } as Awaited<ReturnType<PatrolsService['findOne']>>);
    patrolsService.recordEventWithStatus.mockResolvedValue({
      event: { id: 'server-event-id' },
      status: 'duplicate',
    } as Awaited<ReturnType<PatrolsService['recordEventWithStatus']>>);

    const result = await service.syncPatrolEvents(createUser({ id: 'user-id' }), 'patrol-id', {
      events: [
        {
          deviceId: 'device-1',
          localId: '11111111-1111-4111-8111-111111111111',
          nfcUid: '04A1B2C3',
          patrolPointId: '22222222-2222-4222-8222-222222222222',
          scannedAt: '2026-06-19T10:00:00.000Z',
        },
      ],
    });

    expect(result).toEqual({
      items: [
        {
          localId: '11111111-1111-4111-8111-111111111111',
          serverId: 'server-event-id',
          status: 'duplicate',
        },
      ],
    });
  });

  it('starts patrol for explicitly selected assigned shop', async () => {
    patrolsService.start.mockResolvedValue({
      employeeId: 'user-id',
      id: 'patrol-id',
      shopId: 'shop-2',
      status: 'in_progress',
    } as Awaited<ReturnType<PatrolsService['start']>>);

    await service.startPatrol(createUser({ id: 'user-id', shopIds: ['shop-1', 'shop-2'] }), {
      shopId: 'shop-2',
    });

    expect(patrolsService.start).toHaveBeenCalledWith({
      employeeId: 'user-id',
      scheduleId: undefined,
      shopId: 'shop-2',
    });
  });

  it('returns active patrol NFC wait state', async () => {
    patrolsService.findActiveByEmployee.mockResolvedValue({
      employeeId: 'user-id',
      id: 'patrol-id',
    } as Awaited<ReturnType<PatrolsService['findActiveByEmployee']>>);
    patrolsService.getNfcWaitState.mockResolvedValue({
      canAcceptNfc: true,
      mode: 'waiting_for_nfc',
      patrolId: 'patrol-id',
      pointDwellSeconds: 90,
      requiresForegroundNfcListening: true,
      scanContract: {
        endpoint: '/api/v1/mobile/patrols/patrol-id/events',
        method: 'POST',
        requiredFields: ['patrolPointId', 'nfcUid', 'scannedAt', 'deviceId'],
      },
      scannedPoints: 0,
      shopId: 'shop-id',
      status: 'in_progress',
      totalPoints: 3,
    });

    const result = await service.getActivePatrolNfcWaitState(createUser({ id: 'user-id' }));

    expect(patrolsService.getNfcWaitState).toHaveBeenCalledWith(
      'patrol-id',
      createUser({ id: 'user-id' }),
    );
    expect(result?.mode).toBe('waiting_for_nfc');
  });

  it('returns null NFC wait state when user has no active patrol', async () => {
    patrolsService.findActiveByEmployee.mockResolvedValue(null);

    await expect(
      service.getActivePatrolNfcWaitState(createUser({ id: 'user-id' })),
    ).resolves.toBeNull();
    expect(patrolsService.getNfcWaitState).not.toHaveBeenCalled();
  });

  it('rejects patrol start for unassigned shop', async () => {
    await expect(
      service.startPatrol(createUser({ id: 'user-id', shopIds: ['shop-1'] }), { shopId: 'shop-2' }),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(patrolsService.start).not.toHaveBeenCalled();
  });

  it('completes only current employee patrol with report', async () => {
    patrolsService.findOne.mockResolvedValue({
      employeeId: 'user-id',
      id: 'patrol-id',
    } as Awaited<ReturnType<PatrolsService['findOne']>>);
    patrolsService.complete.mockResolvedValue({
      completionReport: 'Отвлек покупатель, поэтому интервал был длиннее.',
      employeeId: 'user-id',
      id: 'patrol-id',
      status: 'completed',
    } as Awaited<ReturnType<PatrolsService['complete']>>);

    const result = await service.completePatrol(createUser({ id: 'user-id' }), 'patrol-id', {
      completionReport: 'Отвлек покупатель, поэтому интервал был длиннее.',
    });

    expect(patrolsService.complete).toHaveBeenCalledWith('patrol-id', {
      completionReport: 'Отвлек покупатель, поэтому интервал был длиннее.',
    });
    expect(result.status).toBe('completed');
  });

  it('cancels only current employee patrol', async () => {
    patrolsService.findOne.mockResolvedValue({
      employeeId: 'user-id',
      id: 'patrol-id',
    } as Awaited<ReturnType<PatrolsService['findOne']>>);
    patrolsService.cancel.mockResolvedValue({
      cancellationReason: 'Отвлекло руководство, начну заново.',
      employeeId: 'user-id',
      id: 'patrol-id',
      status: 'cancelled',
    } as Awaited<ReturnType<PatrolsService['cancel']>>);

    const result = await service.cancelPatrol(createUser({ id: 'user-id' }), 'patrol-id', {
      cancellationReason: 'Отвлекло руководство, начну заново.',
    });

    expect(patrolsService.cancel).toHaveBeenCalledWith('patrol-id', {
      cancellationReason: 'Отвлекло руководство, начну заново.',
    });
    expect(result.status).toBe('cancelled');
  });
});

function createUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    fullName: 'Mobile Admin',
    id: 'user-id',
    role: 'security_guard',
    username: 'mobile.user',
    ...overrides,
  };
}
