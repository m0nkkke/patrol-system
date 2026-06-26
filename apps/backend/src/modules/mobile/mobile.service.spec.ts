import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { PatrolPointsService } from '../patrol-points/patrol-points.service';
import { PatrolSchedulesService } from '../patrols/patrol-schedules.service';
import { PatrolsService } from '../patrols/patrols.service';
import { ShopsService } from '../shops/shops.service';
import { MobileService } from './mobile.service';

type PatrolPointsServiceMock = Pick<PatrolPointsService, 'findByShop'>;
type PatrolSchedulesServiceMock = Pick<PatrolSchedulesService, 'findAvailableByShop'>;
type PatrolsServiceMock = Pick<
  PatrolsService,
  | 'cancel'
  | 'complete'
  | 'findActiveByEmployee'
  | 'findOne'
  | 'recordEvent'
  | 'recordEventWithStatus'
  | 'start'
>;
type ShopsServiceMock = Pick<
  ShopsService,
  'bindRoutePointNfc' | 'getRouteSetup' | 'resetRouteSetup' | 'startRouteSetup'
>;

describe('MobileService', () => {
  let patrolPointsService: jest.Mocked<PatrolPointsServiceMock>;
  let patrolSchedulesService: jest.Mocked<PatrolSchedulesServiceMock>;
  let patrolsService: jest.Mocked<PatrolsServiceMock>;
  let service: MobileService;
  let shopsService: jest.Mocked<ShopsServiceMock>;

  beforeEach(() => {
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

    await service.scanNextRoutePoint('shop-id', { uid: '04A1B2C3' });

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

    await expect(service.scanNextRoutePoint('shop-id', { uid: '04A1B2C3' })).rejects.toBeInstanceOf(
      DomainValidationError,
    );
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

    const result = await service.syncPatrolEvents(
      createUser({ id: 'user-id' }),
      'patrol-id',
      {
        events: [
          {
            deviceId: 'device-1',
            localId: '11111111-1111-4111-8111-111111111111',
            nfcUid: '04A1B2C3',
            patrolPointId: '22222222-2222-4222-8222-222222222222',
            scannedAt: '2026-06-19T10:00:00.000Z',
          },
        ],
      },
    );

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
    role: 'employee',
    username: 'mobile.user',
    ...overrides,
  };
}
