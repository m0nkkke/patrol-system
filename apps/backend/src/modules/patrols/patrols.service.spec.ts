import { PatrolIncidentType, PatrolPointVisitStatus, PatrolScanAction } from '@patrol/shared';

import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { NotificationsService } from '../notifications/notifications.service';
import { PatrolPointsService } from '../patrol-points/patrol-points.service';
import { PatrolPointEntity } from '../patrol-points/entities/patrol-point.entity';
import { ShopsService } from '../shops/shops.service';
import { UsersService } from '../users/users.service';
import { PatrolEventEntity } from './entities/patrol-event.entity';
import { PatrolIncidentEntity } from './entities/patrol-incident.entity';
import { PatrolPointVisitEntity } from './entities/patrol-point-visit.entity';
import { PatrolRouteIntervalEntity } from './entities/patrol-route-interval.entity';
import { PatrolRoutePointEntity } from './entities/patrol-route-point.entity';
import { PatrolEntity } from './entities/patrol.entity';
import { RouteTimingProfileEntity } from './entities/route-timing-profile.entity';
import { PatrolRoutesService } from './routes/patrol-routes.service';
import { PatrolSchedulesService } from './schedules/patrol-schedules.service';
import { PatrolsRepository } from './patrols.repository';
import { PatrolsService } from './patrols.service';

type PatrolsRepositoryMock = Pick<
  PatrolsRepository,
  | 'countRouteIntervalsByShop'
  | 'attachArrivalEventToPointVisit'
  | 'createPatrol'
  | 'createPatrolEvent'
  | 'createPatrolIncident'
  | 'createPointVisit'
  | 'createPatrolRouteInterval'
  | 'completePointVisit'
  | 'findById'
  | 'findByEmployee'
  | 'findByShop'
  | 'findEventsByPatrolOrdered'
  | 'findAcceptedEventByPatrolPointAndAction'
  | 'findEventByClientLocalId'
  | 'findExistingScheduledPatrol'
  | 'findIncidentByClientLocalId'
  | 'findIncidents'
  | 'findNextExpectedPoint'
  | 'findPointVisitByPatrolAndPoint'
  | 'findPreviousEventByRouteOrder'
  | 'findRouteInterval'
  | 'markCompleted'
  | 'markCancelled'
  | 'markOverdue'
  | 'recalculateRouteTimingProfile'
  | 'updateCompletionReport'
  | 'updateScanProgress'
>;

type PatrolPointsServiceMock = Pick<
  PatrolPointsService,
  'countActiveByShop' | 'findActiveTagByUid' | 'findOne' | 'findRegisteredTagByUid'
>;

type ShopsServiceMock = Pick<ShopsService, 'findOne'>;
type PatrolSchedulesServiceMock = Pick<PatrolSchedulesService, 'findOne' | 'resolveDueAt'>;
type PatrolRoutesServiceMock = Pick<
  PatrolRoutesService,
  'assertPointInRoute' | 'assertRouteUsable' | 'countActivePoints'
>;
type UsersServiceMock = Pick<UsersService, 'assertAssignedToShop' | 'findOne'>;
type NotificationsServiceMock = Pick<
  NotificationsService,
  'notifyPatrolCancelled' | 'notifyPatrolIncident'
>;

describe('PatrolsService', () => {
  let patrolPointsService: jest.Mocked<PatrolPointsServiceMock>;
  let patrolSchedulesService: jest.Mocked<PatrolSchedulesServiceMock>;
  let patrolRoutesService: jest.Mocked<PatrolRoutesServiceMock>;
  let patrolsRepository: jest.Mocked<PatrolsRepositoryMock>;
  let notificationsService: jest.Mocked<NotificationsServiceMock>;
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
      findOne: jest.fn(),
      resolveDueAt: jest.fn(),
    };
    patrolRoutesService = {
      assertPointInRoute: jest.fn(),
      assertRouteUsable: jest.fn(),
      countActivePoints: jest.fn(),
    };
    patrolsRepository = {
      attachArrivalEventToPointVisit: jest.fn(),
      completePointVisit: jest.fn(),
      countRouteIntervalsByShop: jest.fn(),
      createPatrol: jest.fn(),
      createPatrolEvent: jest.fn(),
      createPatrolIncident: jest.fn(),
      createPointVisit: jest.fn(),
      createPatrolRouteInterval: jest.fn(),
      findById: jest.fn(),
      findByEmployee: jest.fn(),
      findByShop: jest.fn(),
      findAcceptedEventByPatrolPointAndAction: jest.fn(),
      findEventsByPatrolOrdered: jest.fn(),
      findEventByClientLocalId: jest.fn(),
      findExistingScheduledPatrol: jest.fn(),
      findIncidentByClientLocalId: jest.fn(),
      findIncidents: jest.fn(),
      findNextExpectedPoint: jest.fn(),
      findPointVisitByPatrolAndPoint: jest.fn(),
      findPreviousEventByRouteOrder: jest.fn(),
      findRouteInterval: jest.fn(),
      markCancelled: jest.fn(),
      markCompleted: jest.fn(),
      markOverdue: jest.fn(),
      recalculateRouteTimingProfile: jest.fn(),
      updateCompletionReport: jest.fn(),
      updateScanProgress: jest.fn(),
    };
    notificationsService = {
      notifyPatrolCancelled: jest.fn(),
      notifyPatrolIncident: jest.fn(),
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
      notificationsService as unknown as NotificationsService,
      shopsService as unknown as ShopsService,
      usersService as unknown as UsersService,
      patrolRoutesService as unknown as PatrolRoutesService,
    );
    patrolsRepository.findEventByClientLocalId.mockResolvedValue(null);
    patrolsRepository.findIncidentByClientLocalId.mockResolvedValue(null);
    patrolsRepository.findAcceptedEventByPatrolPointAndAction.mockResolvedValue(null);
    patrolsRepository.findPointVisitByPatrolAndPoint.mockResolvedValue(null);
    patrolsRepository.recalculateRouteTimingProfile.mockResolvedValue(null);
    patrolsRepository.findExistingScheduledPatrol.mockResolvedValue(null);
    patrolsRepository.createPatrolIncident.mockImplementation((data) =>
      Promise.resolve(createIncident(data)),
    );
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
    patrolsRepository.findPointVisitByPatrolAndPoint.mockResolvedValue(
      createPointVisit({
        arrivedAt: new Date('2026-06-19T10:03:00.000Z'),
        lockedUntil: new Date('2026-06-19T10:04:30.000Z'),
        patrolPointId: 'point-2',
      }),
    );
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
      scanAction: PatrolScanAction.DEPART,
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
    expect(notificationsService.notifyPatrolIncident).toHaveBeenCalledWith({
      employeeName: undefined,
      incidentId: 'incident-id',
      message: 'Слишком длинный интервал: 300 сек. при эталоне 60 сек.',
      patrolId: patrol.id,
      shopId: patrol.shopId,
      shopName: undefined,
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
      search: undefined,
      shopId: '22222222-2222-4222-8222-222222222222',
      sort: undefined,
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

  it('returns NFC waiting state with expected next point', async () => {
    const patrol = createPatrol({ routeId: 'route-id', scannedPoints: 1, totalPoints: 3 });
    patrolsRepository.findById.mockResolvedValue(patrol);
    patrolsRepository.findNextExpectedPoint.mockResolvedValue({
      description: 'Near entrance',
      id: 'point-2',
      name: 'Point 2',
      nfcTagId: 'tag-2',
      pointDwellSeconds: 0,
      photoFileId: 'photo-2',
      sortOrder: 2,
    });

    await expect(
      service.getNfcWaitState(patrol.id, {
        fullName: 'Security Guard',
        id: patrol.employeeId,
        role: 'security_guard',
        username: 'guard',
      }),
    ).resolves.toMatchObject({
      canAcceptNfc: true,
      expectedPoint: {
        description: 'Near entrance',
        id: 'point-2',
        name: 'Point 2',
        nfcTagId: 'tag-2',
        photoFileId: 'photo-2',
        sortOrder: 2,
      },
      mode: 'waiting_for_nfc',
      patrolId: patrol.id,
      pointDwellSeconds: 0,
      routeId: 'route-id',
      scanContract: {
        endpoint: `/api/v1/mobile/patrols/${patrol.id}/point-visits/scan`,
        method: 'POST',
        requiredFields: ['patrolPointId', 'nfcUid', 'scannedAt', 'deviceId', 'scanAction'],
      },
    });
  });

  it('rejects NFC waiting state for another employee patrol', async () => {
    patrolsRepository.findById.mockResolvedValue(createPatrol({ employeeId: 'employee-id' }));

    await expect(
      service.getNfcWaitState('patrol-id', {
        fullName: 'Other Guard',
        id: 'other-employee-id',
        role: 'security_guard',
        username: 'other.guard',
      }),
    ).rejects.toMatchObject({ code: 'MOBILE_PATROL_FORBIDDEN' });
    expect(patrolsRepository.findNextExpectedPoint).not.toHaveBeenCalled();
  });

  it('rejects duplicate patrol for the same schedule dueAt', async () => {
    const dueAt = new Date('2026-06-22T04:00:00.000Z');
    shopsService.findOne.mockResolvedValue({ routeStatus: 'ready' } as Awaited<
      ReturnType<ShopsService['findOne']>
    >);
    patrolPointsService.countActiveByShop.mockResolvedValue(3);
    patrolSchedulesService.resolveDueAt.mockResolvedValue(dueAt);
    patrolsRepository.findExistingScheduledPatrol.mockResolvedValue(createPatrol({ dueAt }));

    await expect(
      service.start({
        employeeId: 'employee-id',
        scheduleId: 'schedule-id',
        shopId: 'shop-id',
      }),
    ).rejects.toMatchObject({ code: 'PATROL_SCHEDULE_ALREADY_STARTED' });
    expect(patrolsRepository.createPatrol).not.toHaveBeenCalled();
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
        role: 'inspector',
        shopId: 'shop-id',
        username: 'manager',
      },
    );

    expect(patrolsRepository.findByEmployee).toHaveBeenCalledWith(
      'employee-id',
      { limit: 20, page: 1 },
      ['shop-id'],
    );
    expect(result.total).toBe(1);
  });

  it('rejects manager patrol history outside assigned shops', async () => {
    await expect(
      service.findByShop(
        'other-shop-id',
        { limit: 20, page: 1 },
        {
          fullName: 'Manager',
          id: 'manager-id',
          role: 'inspector',
          shopId: 'shop-id',
          username: 'manager',
        },
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);

    expect(patrolsRepository.findByShop).not.toHaveBeenCalled();
  });

  it('limits manager incidents to assigned shops when shop filter is omitted', async () => {
    patrolsRepository.findIncidents.mockResolvedValue([[createIncident()], 1]);

    await service.findIncidents(
      { limit: 20, page: 1 },
      {
        fullName: 'Manager',
        id: 'manager-id',
        role: 'inspector',
        shopIds: ['shop-1', 'shop-2'],
        username: 'manager',
      },
    );

    expect(patrolsRepository.findIncidents).toHaveBeenCalledWith({
      employeeId: undefined,
      from: undefined,
      limit: 20,
      page: 1,
      search: undefined,
      shopId: undefined,
      shopIds: ['shop-1', 'shop-2'],
      sort: undefined,
      to: undefined,
      type: undefined,
    });
  });

  it('rejects manager patrol details outside assigned shops', async () => {
    patrolsRepository.findById.mockResolvedValue(createPatrol({ shopId: 'other-shop-id' }));

    await expect(
      service.findOneForActor('patrol-id', {
        fullName: 'Manager',
        id: 'manager-id',
        role: 'inspector',
        shopId: 'shop-id',
        username: 'manager',
      }),
    ).rejects.toBeInstanceOf(DomainValidationError);
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

  it('returns existing event for repeated patrol point action scan', async () => {
    const existingEvent = createEvent({
      id: 'existing-point-event-id',
      patrolPointId: 'point-2',
      scanAction: PatrolScanAction.ARRIVE,
    });
    patrolsRepository.findById.mockResolvedValue(createPatrol());
    patrolsRepository.findAcceptedEventByPatrolPointAndAction.mockResolvedValue(existingEvent);
    patrolPointsService.findOne.mockResolvedValue(
      createPatrolPoint({ id: 'point-2', nfcTagId: 'tag-2' }),
    );
    patrolPointsService.findActiveTagByUid.mockResolvedValue({
      id: 'tag-2',
      isActive: true,
      uid: '04tag2',
    } as Awaited<ReturnType<PatrolPointsService['findActiveTagByUid']>>);
    patrolPointsService.findRegisteredTagByUid.mockResolvedValue({
      id: 'tag-2',
      isActive: true,
      uid: '04tag2',
    } as Awaited<ReturnType<PatrolPointsService['findRegisteredTagByUid']>>);

    const result = await service.recordEventWithStatus(
      'patrol-id',
      {
        deviceId: 'device-1',
        nfcUid: '04TAG2',
        patrolPointId: 'point-2',
        scanAction: PatrolScanAction.ARRIVE,
        scannedAt: '2026-06-19T10:05:00.000Z',
      },
      undefined,
      { clientLocalId: '11111111-1111-4111-8111-111111111111' },
    );

    expect(result).toEqual({ event: existingEvent, status: 'duplicate' });
    expect(patrolsRepository.createPatrolEvent).not.toHaveBeenCalled();
    expect(patrolsRepository.updateScanProgress).not.toHaveBeenCalled();
  });

  it.each([0, 120])(
    'uses snapshot dwell %i after the current route has changed',
    async (dwellSeconds) => {
      const scannedAt = new Date('2026-06-19T10:05:00.000Z');
      const patrol = createPatrol({
        routeId: 'route-id',
        routeSnapshot: [
          {
            id: 'point-2',
            shopId: 'shop-id',
            name: 'Point',
            sortOrder: 1,
            dwellSeconds,
            isActive: true,
          },
        ],
      });
      const point = createPatrolPoint({ id: 'point-2', nfcTagId: 'tag-2' });
      const visit = createPointVisit({ arrivedAt: scannedAt, lockedUntil: scannedAt });
      const event = createEvent({ patrolPointId: point.id, scanAction: PatrolScanAction.ARRIVE });
      patrolsRepository.findById.mockResolvedValue(patrol);
      patrolPointsService.findOne.mockResolvedValue(point);
      patrolRoutesService.assertPointInRoute.mockResolvedValue({
        dwellSeconds: 0,
        sortOrder: 2,
      } as PatrolRoutePointEntity);
      patrolPointsService.findActiveTagByUid.mockResolvedValue({
        id: 'tag-2',
        isActive: true,
        uid: '04tag2',
      } as Awaited<ReturnType<PatrolPointsService['findActiveTagByUid']>>);
      patrolsRepository.createPointVisit.mockResolvedValue(visit);
      patrolsRepository.createPatrolEvent.mockResolvedValue(event);

      await service.recordEvent(patrol.id, {
        deviceId: 'device-1',
        nfcUid: '04TAG2',
        patrolPointId: point.id,
        scanAction: PatrolScanAction.ARRIVE,
        scannedAt: scannedAt.toISOString(),
      });

      expect(patrolsRepository.createPointVisit).toHaveBeenCalledWith({
        arrivedAt: scannedAt,
        lockedUntil: new Date(scannedAt.getTime() + dwellSeconds * 1000),
        patrolId: patrol.id,
        patrolPointId: point.id,
      });
      expect(patrolRoutesService.assertPointInRoute).not.toHaveBeenCalled();
    },
  );

  it('rejects a shop point that was not captured in the patrol snapshot', async () => {
    const patrol = createPatrol({ routeId: 'route-id', routeSnapshot: [] });
    patrolsRepository.findById.mockResolvedValue(patrol);
    patrolPointsService.findOne.mockResolvedValue(createPatrolPoint({ id: 'new-point' }));
    await expect(
      service.recordEvent(patrol.id, {
        deviceId: 'test',
        nfcUid: '04aabbcc',
        patrolPointId: 'new-point',
        scanAction: PatrolScanAction.ARRIVE,
        scannedAt: new Date().toISOString(),
      }),
    ).rejects.toMatchObject({ code: 'PATROL_POINT_NOT_IN_ROUTE' });
    expect(patrolsRepository.createPointVisit).not.toHaveBeenCalled();
  });

  it('detects skipped points using snapshot order even when shop order is reversed', async () => {
    const patrol = createPatrol({
      routeSnapshot: [
        {
          id: 'point-a',
          shopId: 'shop-id',
          name: 'A',
          sortOrder: 1,
          dwellSeconds: 0,
          isActive: true,
        },
        {
          id: 'point-b',
          shopId: 'shop-id',
          name: 'B',
          sortOrder: 2,
          dwellSeconds: 120,
          isActive: true,
        },
      ],
    });
    patrolsRepository.findById.mockResolvedValue(patrol);
    patrolPointsService.findOne
      .mockResolvedValueOnce(createPatrolPoint({ id: 'point-a', sortOrder: 20 }))
      .mockResolvedValueOnce(createPatrolPoint({ id: 'point-b', sortOrder: 10 }));
    await service.recordMissedPointAttempt(patrol.id, {
      clientLocalId: 'attempt-id',
      expectedPatrolPointId: 'point-a',
      attemptedPatrolPointId: 'point-b',
      nfcUid: '04aabbcc',
      deviceId: 'test',
      scannedAt: new Date().toISOString(),
    });
    expect(patrolsRepository.createPatrolIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        fromPatrolPointId: 'point-a',
        toPatrolPointId: 'point-b',
        type: PatrolIncidentType.MISSED_POINT,
      }),
    );
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
    patrolsRepository.findPointVisitByPatrolAndPoint.mockResolvedValue(
      createPointVisit({
        arrivedAt: new Date('2026-06-19T10:03:00.000Z'),
        lockedUntil: new Date('2026-06-19T10:04:30.000Z'),
        patrolPointId: 'point-2',
      }),
    );

    await service.recordEvent(patrol.id, {
      deviceId: 'device-1',
      nfcUid: '04TAG2',
      patrolPointId: 'point-2',
      scanAction: PatrolScanAction.DEPART,
      scannedAt: '2026-06-19T10:05:00.000Z',
    });

    expect(patrolsRepository.updateScanProgress).toHaveBeenCalledWith(patrol.id, 2, 'overdue');
  });

  it('creates an idempotent missed point attempt incident', async () => {
    const patrol = createPatrol();
    patrolsRepository.findById.mockResolvedValue(patrol);
    patrolPointsService.findOne
      .mockResolvedValueOnce(createPatrolPoint({ id: 'point-1', sortOrder: 1 }))
      .mockResolvedValueOnce(createPatrolPoint({ id: 'point-2', sortOrder: 2 }));

    await service.recordMissedPointAttempt(patrol.id, {
      attemptedPatrolPointId: 'point-2',
      clientLocalId: '11111111-1111-4111-8111-111111111111',
      deviceId: 'device-1',
      expectedPatrolPointId: 'point-1',
      nfcUid: '04tag2',
      scannedAt: '2026-06-19T10:05:00.000Z',
    });

    expect(patrolsRepository.createPatrolIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        clientLocalId: '11111111-1111-4111-8111-111111111111',
        fromPatrolPointId: 'point-1',
        patrolId: patrol.id,
        toPatrolPointId: 'point-2',
        type: PatrolIncidentType.MISSED_POINT,
      }),
    );
    expect(notificationsService.notifyPatrolIncident).toHaveBeenCalledTimes(1);
  });

  it('accepts a duplicate missed point attempt without creating or notifying again', async () => {
    const existingIncident = createIncident({
      clientLocalId: '11111111-1111-4111-8111-111111111111',
      patrolId: 'patrol-id',
    });
    patrolsRepository.findIncidentByClientLocalId.mockResolvedValue(existingIncident);

    await expect(
      service.recordMissedPointAttempt('patrol-id', {
        attemptedPatrolPointId: 'point-2',
        clientLocalId: '11111111-1111-4111-8111-111111111111',
        deviceId: 'device-1',
        expectedPatrolPointId: 'point-1',
        nfcUid: '04tag2',
        scannedAt: '2026-06-19T10:05:00.000Z',
      }),
    ).resolves.toBeUndefined();

    expect(patrolsRepository.findById).not.toHaveBeenCalled();
    expect(patrolsRepository.createPatrolIncident).not.toHaveBeenCalled();
    expect(notificationsService.notifyPatrolIncident).not.toHaveBeenCalled();
  });

  it('accepts a concurrent duplicate missed point attempt without notifying', async () => {
    const patrol = createPatrol();
    patrolsRepository.findById.mockResolvedValue(patrol);
    patrolPointsService.findOne
      .mockResolvedValueOnce(createPatrolPoint({ id: 'point-1', sortOrder: 1 }))
      .mockResolvedValueOnce(createPatrolPoint({ id: 'point-2', sortOrder: 2 }));
    patrolsRepository.createPatrolIncident.mockRejectedValue({ code: '23505' });

    await expect(
      service.recordMissedPointAttempt(patrol.id, {
        attemptedPatrolPointId: 'point-2',
        clientLocalId: '11111111-1111-4111-8111-111111111111',
        deviceId: 'device-1',
        expectedPatrolPointId: 'point-1',
        nfcUid: '04tag2',
        scannedAt: '2026-06-19T10:05:00.000Z',
      }),
    ).resolves.toBeUndefined();

    expect(notificationsService.notifyPatrolIncident).not.toHaveBeenCalled();
  });

  it.each(['completed', 'cancelled'] as const)(
    'accepts an idempotent late missed point attempt for a %s patrol',
    async (status) => {
      const patrol = createPatrol({ status });
      patrolsRepository.findById.mockResolvedValue(patrol);
      patrolPointsService.findOne
        .mockResolvedValueOnce(createPatrolPoint({ id: 'point-1', sortOrder: 1 }))
        .mockResolvedValueOnce(createPatrolPoint({ id: 'point-2', sortOrder: 2 }));

      await expect(
        service.recordMissedPointAttempt(patrol.id, {
          attemptedPatrolPointId: 'point-2',
          clientLocalId: '11111111-1111-4111-8111-111111111111',
          deviceId: 'device-1',
          expectedPatrolPointId: 'point-1',
          nfcUid: '04tag2',
          scannedAt: '2026-06-19T10:05:00.000Z',
        }),
      ).resolves.toBeUndefined();

      expect(patrolsRepository.createPatrolIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          clientLocalId: '11111111-1111-4111-8111-111111111111',
          patrolId: patrol.id,
          type: PatrolIncidentType.MISSED_POINT,
        }),
      );
      expect(notificationsService.notifyPatrolIncident).toHaveBeenCalledTimes(1);
    },
  );

  it('rejects a missed point attempt before the patrol starts', async () => {
    const patrol = createPatrol({ status: 'pending' });
    patrolsRepository.findById.mockResolvedValue(patrol);

    await expect(
      service.recordMissedPointAttempt(patrol.id, {
        attemptedPatrolPointId: 'point-2',
        clientLocalId: '11111111-1111-4111-8111-111111111111',
        deviceId: 'device-1',
        expectedPatrolPointId: 'point-1',
        nfcUid: '04tag2',
        scannedAt: '2026-06-19T10:05:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'PATROL_NOT_IN_PROGRESS' });

    expect(patrolsRepository.createPatrolIncident).not.toHaveBeenCalled();
  });

  it('creates route timing incident after completed patrol exceeds route profile', async () => {
    const patrol = createPatrol({
      routeId: 'route-id',
      scannedPoints: 2,
      startedAt: new Date(Date.now() - 600_000),
      totalPoints: 3,
    });
    const event = createEvent({
      patrolPointId: 'point-3',
      scanAction: PatrolScanAction.DEPART,
    });

    patrolsRepository.findById.mockResolvedValue(patrol);
    patrolPointsService.findOne.mockResolvedValue(
      createPatrolPoint({ id: 'point-3', nfcTagId: 'tag-3', sortOrder: 3 }),
    );
    patrolRoutesService.assertPointInRoute.mockResolvedValue({
      dwellSeconds: 90,
      sortOrder: 3,
    } as PatrolRoutePointEntity);
    patrolPointsService.findActiveTagByUid.mockResolvedValue({
      id: 'tag-3',
      isActive: true,
      uid: '04tag3',
    } as Awaited<ReturnType<PatrolPointsService['findActiveTagByUid']>>);
    patrolsRepository.createPatrolEvent.mockResolvedValue(event);
    patrolsRepository.findPointVisitByPatrolAndPoint.mockResolvedValue(
      createPointVisit({
        arrivedAt: new Date(Date.now() - 120_000),
        lockedUntil: new Date(Date.now() - 30_000),
        patrolPointId: 'point-3',
      }),
    );
    patrolsRepository.findPreviousEventByRouteOrder.mockResolvedValue(null);
    patrolsRepository.countRouteIntervalsByShop.mockResolvedValue(1);
    patrolsRepository.recalculateRouteTimingProfile.mockResolvedValue(
      createRouteTimingProfile({
        averageTotalSeconds: 300,
        sampleCount: 5,
        slowSeconds: 390,
      }),
    );

    await service.recordEvent(patrol.id, {
      deviceId: 'device-1',
      nfcUid: '04TAG3',
      patrolPointId: 'point-3',
      scanAction: PatrolScanAction.DEPART,
      scannedAt: new Date().toISOString(),
    });

    expect(patrolsRepository.markCompleted).toHaveBeenCalledWith(
      patrol.id,
      expect.any(Date),
      patrol.notes,
      patrol.completionReport,
    );
    expect(patrolsRepository.recalculateRouteTimingProfile).toHaveBeenCalledWith(
      'route-id',
      expect.any(Date),
      expect.objectContaining({ lookbackDays: 14 }),
    );
    expect(patrolsRepository.createPatrolIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedSeconds: 300,
        patrolEventId: event.id,
        patrolId: patrol.id,
        shopId: patrol.shopId,
        type: PatrolIncidentType.ROUTE_TOO_SLOW,
      }),
    );
    expect(notificationsService.notifyPatrolIncident).toHaveBeenCalledWith(
      expect.objectContaining({
        incidentId: 'incident-id',
        type: PatrolIncidentType.ROUTE_TOO_SLOW,
      }),
    );
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
    expect(notificationsService.notifyPatrolCancelled).toHaveBeenCalledWith({
      cancellationReason: 'Отвлекло руководство, начну маршрут заново.',
      employeeName: undefined,
      patrolId: patrol.id,
      shopId: patrol.shopId,
      shopName: undefined,
    });
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
    scanAction: PatrolScanAction.ARRIVE,
    scannedAt: new Date(),
    ...overrides,
  } as PatrolEventEntity;
}

function createPointVisit(overrides: Partial<PatrolPointVisitEntity> = {}): PatrolPointVisitEntity {
  return {
    arrivedAt: new Date('2026-06-19T10:00:00.000Z'),
    createdAt: new Date(),
    id: 'visit-id',
    lockedUntil: new Date('2026-06-19T10:01:30.000Z'),
    patrolId: 'patrol-id',
    patrolPointId: 'point-id',
    status: PatrolPointVisitStatus.ARRIVED,
    updatedAt: new Date(),
    ...overrides,
  } as PatrolPointVisitEntity;
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

function createIncident(overrides: Partial<PatrolIncidentEntity> = {}): PatrolIncidentEntity {
  return {
    createdAt: new Date(),
    id: 'incident-id',
    message: 'Слишком длинный интервал',
    patrolId: 'patrol-id',
    shopId: 'shop-id',
    type: PatrolIncidentType.LONG_INTERVAL,
    ...overrides,
  } as PatrolIncidentEntity;
}

function createRouteTimingProfile(
  overrides: Partial<RouteTimingProfileEntity> = {},
): RouteTimingProfileEntity {
  return {
    averageTotalSeconds: 300,
    calculatedFrom: new Date('2026-06-05T00:00:00.000Z'),
    calculatedTo: new Date('2026-06-19T00:00:00.000Z'),
    createdAt: new Date(),
    fastSeconds: 210,
    id: 'route-timing-profile-id',
    routeId: 'route-id',
    sampleCount: 5,
    shopId: 'shop-id',
    slowSeconds: 390,
    suspiciousFastSeconds: 150,
    updatedAt: new Date(),
    ...overrides,
  } as RouteTimingProfileEntity;
}
