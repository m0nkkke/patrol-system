import { PatrolIncidentType } from '@patrol/shared';

import { PatrolPointsService } from '../patrol-points/patrol-points.service';
import { PatrolPointEntity } from '../patrol-points/entities/patrol-point.entity';
import { ShopsService } from '../shops/shops.service';
import { UsersService } from '../users/users.service';
import { PatrolEventEntity } from './entities/patrol-event.entity';
import { PatrolIncidentEntity } from './entities/patrol-incident.entity';
import { PatrolRouteIntervalEntity } from './entities/patrol-route-interval.entity';
import { PatrolEntity } from './entities/patrol.entity';
import { PatrolSchedulesService } from './patrol-schedules.service';
import { PatrolsRepository } from './patrols.repository';
import { PatrolsService } from './patrols.service';

type PatrolsRepositoryMock = Pick<
  PatrolsRepository,
  | 'countRouteIntervalsByShop'
  | 'createPatrol'
  | 'createPatrolEvent'
  | 'createPatrolIncident'
  | 'createPatrolRouteInterval'
  | 'findById'
  | 'findByEmployee'
  | 'findByShop'
  | 'findEventsByPatrolOrdered'
  | 'findEventByClientLocalId'
  | 'findEventByPatrolAndPoint'
  | 'findIncidents'
  | 'findPreviousEventByRouteOrder'
  | 'findRouteInterval'
  | 'markCompleted'
  | 'markCancelled'
  | 'markOverdue'
  | 'updateCompletionReport'
  | 'updateScanProgress'
>;

type PatrolPointsServiceMock = Pick<
  PatrolPointsService,
  'countActiveByShop' | 'findActiveTagByUid' | 'findOne' | 'findRegisteredTagByUid'
>;

type ShopsServiceMock = Pick<ShopsService, 'findOne'>;
type PatrolSchedulesServiceMock = Pick<PatrolSchedulesService, 'resolveDueAt'>;
type UsersServiceMock = Pick<UsersService, 'assertAssignedToShop' | 'findOne'>;

describe('PatrolsService', () => {
  let patrolPointsService: jest.Mocked<PatrolPointsServiceMock>;
  let patrolSchedulesService: jest.Mocked<PatrolSchedulesServiceMock>;
  let patrolsRepository: jest.Mocked<PatrolsRepositoryMock>;
  let service: PatrolsService;
  let shopsService: jest.Mocked<ShopsServiceMock>;
  let usersService: jest.Mocked<UsersServiceMock>;

  beforeEach(() => {
    patrolPointsService = {
      countActiveByShop: jest.fn(),
      findActiveTagByUid: jest.fn(),
      findOne: jest.fn(),
      findRegisteredTagByUid: jest.fn(),
    };
    patrolSchedulesService = {
      resolveDueAt: jest.fn(),
    };
    patrolsRepository = {
      countRouteIntervalsByShop: jest.fn(),
      createPatrol: jest.fn(),
      createPatrolEvent: jest.fn(),
      createPatrolIncident: jest.fn(),
      createPatrolRouteInterval: jest.fn(),
      findById: jest.fn(),
      findByEmployee: jest.fn(),
      findByShop: jest.fn(),
      findEventsByPatrolOrdered: jest.fn(),
      findEventByClientLocalId: jest.fn(),
      findEventByPatrolAndPoint: jest.fn(),
      findIncidents: jest.fn(),
      findPreviousEventByRouteOrder: jest.fn(),
      findRouteInterval: jest.fn(),
      markCancelled: jest.fn(),
      markCompleted: jest.fn(),
      markOverdue: jest.fn(),
      updateCompletionReport: jest.fn(),
      updateScanProgress: jest.fn(),
    };
    shopsService = {
      findOne: jest.fn(),
    };
    usersService = {
      assertAssignedToShop: jest.fn(),
      findOne: jest.fn(),
    };
    service = new PatrolsService(
      patrolPointsService as unknown as PatrolPointsService,
      patrolSchedulesService as unknown as PatrolSchedulesService,
      patrolsRepository as unknown as PatrolsRepository,
      shopsService as unknown as ShopsService,
      usersService as unknown as UsersService,
    );
    patrolsRepository.findEventByClientLocalId.mockResolvedValue(null);
    patrolsRepository.findEventByPatrolAndPoint.mockResolvedValue(null);
  });

  it('creates long interval incident when scan is slower than route baseline', async () => {
    const patrol = createPatrol();
    const event = createEvent({
      patrolPointId: 'point-2',
      scannedAt: new Date('2026-06-19T10:05:00.000Z'),
    });
    const previousEvent = createEvent({
      patrolPoint: createPatrolPoint({ sortOrder: 1 }),
      patrolPointId: 'point-1',
      scannedAt: new Date('2026-06-19T10:00:00.000Z'),
    });

    patrolsRepository.findById.mockResolvedValue(patrol);
    patrolPointsService.findOne.mockResolvedValue({
      id: 'point-2',
      nfcTagId: 'tag-2',
      shopId: patrol.shopId,
      sortOrder: 2,
    } as Awaited<ReturnType<PatrolPointsService['findOne']>>);
    patrolPointsService.findActiveTagByUid.mockResolvedValue({
      id: 'tag-2',
      isActive: true,
      uid: '04tag2',
    } as Awaited<ReturnType<PatrolPointsService['findActiveTagByUid']>>);
    patrolsRepository.createPatrolEvent.mockResolvedValue(event);
    patrolsRepository.findPreviousEventByRouteOrder.mockResolvedValue(previousEvent);
    patrolsRepository.findRouteInterval.mockResolvedValue(
      createRouteInterval({
        baselineSeconds: 60,
        maxSeconds: 120,
        minSeconds: 30,
      }),
    );

    await service.recordEvent(patrol.id, {
      deviceId: 'device-1',
      nfcUid: '04TAG2',
      patrolPointId: 'point-2',
      scannedAt: '2026-06-19T10:05:00.000Z',
    });

    expect(patrolsRepository.createPatrolIncident).toHaveBeenCalledWith({
      actualSeconds: 300,
      expectedSeconds: 60,
      fromPatrolPointId: 'point-1',
      message: 'Слишком длинный интервал: 300 сек. при эталоне 60 сек.',
      patrolEventId: event.id,
      patrolId: patrol.id,
      shopId: patrol.shopId,
      toPatrolPointId: 'point-2',
      type: PatrolIncidentType.LONG_INTERVAL,
    });
  });

  it('returns incidents with filters and pagination', async () => {
    patrolsRepository.findIncidents.mockResolvedValue([[createIncident()], 1]);

    const result = await service.findIncidents({
      employeeId: '11111111-1111-4111-8111-111111111111',
      from: '2026-06-19T00:00:00.000Z',
      limit: 10,
      page: 2,
      shopId: '22222222-2222-4222-8222-222222222222',
      to: '2026-06-19T23:59:59.000Z',
      type: PatrolIncidentType.LONG_INTERVAL,
    });

    expect(patrolsRepository.findIncidents).toHaveBeenCalledWith({
      employeeId: '11111111-1111-4111-8111-111111111111',
      from: new Date('2026-06-19T00:00:00.000Z'),
      limit: 10,
      page: 2,
      shopId: '22222222-2222-4222-8222-222222222222',
      to: new Date('2026-06-19T23:59:59.000Z'),
      type: PatrolIncidentType.LONG_INTERVAL,
    });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
  });

  it('uses server-calculated deadline for scheduled patrol', async () => {
    const dueAt = new Date('2026-06-22T04:00:00.000Z');
    shopsService.findOne.mockResolvedValue({ routeStatus: 'ready' } as Awaited<
      ReturnType<ShopsService['findOne']>
    >);
    patrolPointsService.countActiveByShop.mockResolvedValue(3);
    patrolSchedulesService.resolveDueAt.mockResolvedValue(dueAt);
    patrolsRepository.createPatrol.mockResolvedValue(createPatrol({ dueAt }));

    await service.start({
      employeeId: 'employee-id',
      scheduleId: 'schedule-id',
      shopId: 'shop-id',
    });

    expect(patrolSchedulesService.resolveDueAt).toHaveBeenCalledWith('schedule-id', 'shop-id');
    expect(usersService.assertAssignedToShop).toHaveBeenCalledWith('employee-id', 'shop-id');
    expect(patrolsRepository.createPatrol).toHaveBeenCalledWith(
      expect.objectContaining({
        dueAt,
        scheduleId: 'schedule-id',
      }),
    );
  });

  it('limits employee history to manager shop', async () => {
    usersService.findOne.mockResolvedValue({ id: 'employee-id' } as Awaited<
      ReturnType<UsersService['findOne']>
    >);
    patrolsRepository.findByEmployee.mockResolvedValue([[createPatrol()], 1]);

    const result = await service.findByEmployee(
      'employee-id',
      { limit: 20, page: 1 },
      {
        fullName: 'Manager',
        id: 'manager-id',
        role: 'manager',
        shopId: 'shop-id',
        username: 'manager',
      },
    );

    expect(patrolsRepository.findByEmployee).toHaveBeenCalledWith(
      'employee-id',
      1,
      20,
      ['shop-id'],
    );
    expect(result.total).toBe(1);
  });

  it('returns existing event for repeated offline localId', async () => {
    const existingEvent = createEvent({
      clientLocalId: '11111111-1111-4111-8111-111111111111',
      id: 'existing-event-id',
    });
    patrolsRepository.findEventByClientLocalId.mockResolvedValue(existingEvent);

    const result = await service.recordEventWithStatus(
      'patrol-id',
      {
        deviceId: 'device-1',
        nfcUid: '04TAG2',
        patrolPointId: 'point-2',
        scannedAt: '2026-06-19T10:05:00.000Z',
      },
      undefined,
      { clientLocalId: '11111111-1111-4111-8111-111111111111' },
    );

    expect(result).toEqual({ event: existingEvent, status: 'duplicate' });
    expect(patrolsRepository.createPatrolEvent).not.toHaveBeenCalled();
    expect(patrolsRepository.updateScanProgress).not.toHaveBeenCalled();
  });

  it('returns existing event for repeated patrol point scan', async () => {
    const existingEvent = createEvent({
      id: 'existing-point-event-id',
      patrolPointId: 'point-2',
    });
    patrolsRepository.findEventByPatrolAndPoint.mockResolvedValue(existingEvent);

    const result = await service.recordEventWithStatus(
      'patrol-id',
      {
        deviceId: 'device-1',
        nfcUid: '04TAG2',
        patrolPointId: 'point-2',
        scannedAt: '2026-06-19T10:05:00.000Z',
      },
      undefined,
      { clientLocalId: '11111111-1111-4111-8111-111111111111' },
    );

    expect(result).toEqual({ event: existingEvent, status: 'duplicate' });
    expect(patrolsRepository.createPatrolEvent).not.toHaveBeenCalled();
    expect(patrolsRepository.updateScanProgress).not.toHaveBeenCalled();
  });

  it('stores late offline sync event without changing patrol progress', async () => {
    const patrol = createPatrol({
      scannedPoints: 3,
      status: 'completed',
      totalPoints: 3,
    });
    const event = createEvent({ id: 'late-event-id', lateSync: true });

    patrolsRepository.findById.mockResolvedValue(patrol);
    patrolPointsService.findOne.mockResolvedValue(
      createPatrolPoint({
        id: 'point-2',
        nfcTagId: 'tag-2',
        shopId: patrol.shopId,
        sortOrder: 2,
      }),
    );
    patrolPointsService.findRegisteredTagByUid.mockResolvedValue({
      id: 'tag-2',
      isActive: false,
      uid: '04tag2',
    } as Awaited<ReturnType<PatrolPointsService['findRegisteredTagByUid']>>);
    patrolsRepository.createPatrolEvent.mockResolvedValue(event);

    const result = await service.recordEventWithStatus(
      patrol.id,
      {
        deviceId: 'device-1',
        nfcUid: '04TAG2',
        patrolPointId: 'point-2',
        scannedAt: '2026-06-19T10:05:00.000Z',
      },
      undefined,
      { clientLocalId: '11111111-1111-4111-8111-111111111111' },
    );

    expect(result).toEqual({ event, status: 'late_sync' });
    expect(patrolsRepository.createPatrolEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        clientLocalId: '11111111-1111-4111-8111-111111111111',
        lateSync: true,
      }),
    );
    expect(patrolsRepository.updateScanProgress).not.toHaveBeenCalled();
  });

  it('stores offline sync event for deactivated point with conflict status', async () => {
    const patrol = createPatrol();
    const event = createEvent({
      id: 'deactivated-point-event-id',
      pointDeactivatedAfterScan: true,
    });

    patrolsRepository.findById.mockResolvedValue(patrol);
    patrolPointsService.findOne.mockResolvedValue(
      createPatrolPoint({
        id: 'point-2',
        isActive: false,
        nfcTagId: 'old-tag-id',
        shopId: patrol.shopId,
        sortOrder: 2,
      }),
    );
    patrolPointsService.findRegisteredTagByUid.mockResolvedValue({
      id: 'tag-2',
      isActive: false,
      uid: '04tag2',
    } as Awaited<ReturnType<PatrolPointsService['findRegisteredTagByUid']>>);
    patrolsRepository.createPatrolEvent.mockResolvedValue(event);

    const result = await service.recordEventWithStatus(
      patrol.id,
      {
        deviceId: 'device-1',
        nfcUid: '04TAG2',
        patrolPointId: 'point-2',
        scannedAt: '2026-06-19T10:05:00.000Z',
      },
      undefined,
      { clientLocalId: '11111111-1111-4111-8111-111111111111' },
    );

    expect(result).toEqual({ event, status: 'point_deactivated' });
    expect(patrolsRepository.createPatrolEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        pointDeactivatedAfterScan: true,
      }),
    );
    expect(patrolsRepository.updateScanProgress).not.toHaveBeenCalled();
  });

  it('allows overdue patrol to continue and preserves overdue status', async () => {
    const patrol = createPatrol({ status: 'overdue' });
    const event = createEvent({ patrolPointId: 'point-2' });
    patrolsRepository.findById.mockResolvedValue(patrol);
    patrolPointsService.findOne.mockResolvedValue(
      createPatrolPoint({ id: 'point-2', nfcTagId: 'tag-2', sortOrder: 2 }),
    );
    patrolPointsService.findActiveTagByUid.mockResolvedValue({
      id: 'tag-2',
      isActive: true,
      uid: '04tag2',
    } as Awaited<ReturnType<PatrolPointsService['findActiveTagByUid']>>);
    patrolsRepository.createPatrolEvent.mockResolvedValue(event);
    patrolsRepository.findPreviousEventByRouteOrder.mockResolvedValue(null);

    await service.recordEvent(patrol.id, {
      deviceId: 'device-1',
      nfcUid: '04TAG2',
      patrolPointId: 'point-2',
      scannedAt: '2026-06-19T10:05:00.000Z',
    });

    expect(patrolsRepository.updateScanProgress).toHaveBeenCalledWith(patrol.id, 2, 'overdue');
  });

  it('stores completion report for already auto-completed patrol', async () => {
    const completedPatrol = createPatrol({ status: 'completed' });
    patrolsRepository.findById.mockResolvedValueOnce(completedPatrol).mockResolvedValueOnce({
      ...completedPatrol,
      completionReport: 'Покупатель попросил помочь найти товар.',
    });

    const result = await service.complete(completedPatrol.id, {
      completionReport: 'Покупатель попросил помочь найти товар.',
    });

    expect(patrolsRepository.updateCompletionReport).toHaveBeenCalledWith(
      completedPatrol.id,
      'Покупатель попросил помочь найти товар.',
    );
    expect(patrolsRepository.markCompleted).not.toHaveBeenCalled();
    expect(result.completionReport).toBe('Покупатель попросил помочь найти товар.');
  });

  it('cancels active patrol with employee reason', async () => {
    const patrol = createPatrol();
    patrolsRepository.findById.mockResolvedValueOnce(patrol).mockResolvedValueOnce({
      ...patrol,
      cancellationReason: 'Отвлекло руководство, начну маршрут заново.',
      status: 'cancelled',
    });

    const result = await service.cancel(patrol.id, {
      cancellationReason: 'Отвлекло руководство, начну маршрут заново.',
    });

    expect(patrolsRepository.markCancelled).toHaveBeenCalledWith(
      patrol.id,
      expect.any(Date),
      'Отвлекло руководство, начну маршрут заново.',
    );
    expect(result.status).toBe('cancelled');
  });
});

function createPatrol(overrides: Partial<PatrolEntity> = {}): PatrolEntity {
  return {
    createdAt: new Date(),
    employeeId: 'employee-id',
    id: 'patrol-id',
    scannedPoints: 1,
    shopId: 'shop-id',
    startedAt: new Date('2026-06-19T10:00:00.000Z'),
    status: 'in_progress',
    totalPoints: 3,
    updatedAt: new Date(),
    ...overrides,
  } as PatrolEntity;
}

function createPatrolPoint(overrides: Partial<PatrolPointEntity> = {}): PatrolPointEntity {
  return {
    createdAt: new Date(),
    id: 'point-id',
    isActive: true,
    name: 'Контрольная точка',
    shopId: 'shop-id',
    sortOrder: 1,
    updatedAt: new Date(),
    ...overrides,
  } as PatrolPointEntity;
}

function createEvent(overrides: Partial<PatrolEventEntity> = {}): PatrolEventEntity {
  return {
    createdAt: new Date(),
    deviceId: 'device-1',
    employeeId: 'employee-id',
    id: 'event-id',
    isSuspicious: false,
    nfcTagId: 'tag-id',
    nfcUid: '04tag',
    patrolId: 'patrol-id',
    patrolPointId: 'point-id',
    receivedAt: new Date(),
    scannedAt: new Date(),
    ...overrides,
  } as PatrolEventEntity;
}

function createRouteInterval(
  overrides: Partial<PatrolRouteIntervalEntity> = {},
): PatrolRouteIntervalEntity {
  return {
    baselineSeconds: 60,
    createdAt: new Date(),
    fromPatrolPointId: 'point-1',
    fromSortOrder: 1,
    id: 'interval-id',
    maxSeconds: 120,
    minSeconds: 30,
    shopId: 'shop-id',
    sourcePatrolId: 'source-patrol-id',
    toPatrolPointId: 'point-2',
    toSortOrder: 2,
    updatedAt: new Date(),
    ...overrides,
  } as PatrolRouteIntervalEntity;
}

function createIncident(): PatrolIncidentEntity {
  return {
    createdAt: new Date(),
    id: 'incident-id',
    message: 'Слишком длинный интервал',
    patrolId: 'patrol-id',
    shopId: 'shop-id',
    type: PatrolIncidentType.LONG_INTERVAL,
  } as PatrolIncidentEntity;
}
