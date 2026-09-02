import { Injectable } from '@nestjs/common';
import {
  CancelPatrolDto,
  CompletePatrolDto,
  CreatePatrolEventDto,
  FindPatrolIncidentsDto,
  FindPatrolsDto,
  NfcWaitStateDto,
  PatrolIncidentType,
  PatrolPointVisitStatus,
  PatrolScanAction,
  ReportMissedPointAttemptDto,
  RouteStatus,
  StartPatrolDto,
  SyncPatrolEventStatus,
} from '@patrol/shared';

import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { NotificationsService } from '../notifications/notifications.service';
import { PatrolPointsService, normalizeNfcUid } from '../patrol-points/patrol-points.service';
import { ShopsService } from '../shops/shops.service';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { PatrolEventEntity } from './entities/patrol-event.entity';
import { PatrolIncidentEntity } from './entities/patrol-incident.entity';
import { PatrolEntity } from './entities/patrol.entity';
import { PatrolRoutesService } from './routes/patrol-routes.service';
import { PatrolSchedulesService } from './schedules/patrol-schedules.service';
import { ExpectedPatrolPointRecord, PatrolsRepository } from './patrols.repository';

const MIN_INTERVAL_FACTOR = 0.5;
const MAX_INTERVAL_FACTOR = 2;
const DEFAULT_POINT_DWELL_SECONDS = 90;
const ROUTE_TIMING_LOOKBACK_DAYS = 14;
const ROUTE_TIMING_MIN_SAMPLE_COUNT = 5;
const ROUTE_SUSPICIOUS_FAST_FACTOR = 0.5;
const ROUTE_FAST_FACTOR = 0.7;
const ROUTE_SLOW_FACTOR = 1.3;

type PaginatedPatrols = {
  items: PatrolEntity[];
  limit: number;
  page: number;
  total: number;
};

type PaginatedPatrolIncidents = {
  items: PatrolIncidentEntity[];
  limit: number;
  page: number;
  total: number;
};

export type PatrolEventRecordStatus = SyncPatrolEventStatus;

export type PatrolEventRecordResult = {
  event: PatrolEventEntity;
  status: PatrolEventRecordStatus;
};

@Injectable()
export class PatrolsService {
  constructor(
    private readonly patrolPointsService: PatrolPointsService,
    private readonly patrolSchedulesService: PatrolSchedulesService,
    private readonly patrolsRepository: PatrolsRepository,
    private readonly notificationsService: NotificationsService,
    private readonly shopsService: ShopsService,
    private readonly usersService: UsersService,
    private readonly patrolRoutesService: PatrolRoutesService,
  ) {}

  async start(dto: StartPatrolDto): Promise<PatrolEntity> {
    const shop = await this.shopsService.findOne(dto.shopId);
    await this.usersService.assertAssignedToShop(dto.employeeId, dto.shopId);

    if (shop.routeStatus !== RouteStatus.READY) {
      throw new DomainValidationError(
        'PATROL_ROUTE_NOT_READY',
        'Cannot start patrol before shop route setup is completed',
      );
    }

    const schedule =
      dto.scheduleId === undefined ? undefined : await this.patrolSchedulesService.findOne(dto.scheduleId);
    const routeId = dto.routeId ?? schedule?.routeId;

    if (
      dto.routeId !== undefined &&
      schedule?.routeId !== undefined &&
      dto.routeId !== schedule.routeId
    ) {
      throw new DomainValidationError(
        'PATROL_SCHEDULE_ROUTE_MISMATCH',
        'Patrol route does not match selected schedule',
      );
    }

    if (routeId !== undefined) {
      await this.patrolRoutesService.assertRouteUsable(routeId, dto.shopId);
    }

    const totalPoints =
      routeId === undefined
        ? await this.patrolPointsService.countActiveByShop(dto.shopId)
        : await this.patrolRoutesService.countActivePoints(routeId);

    if (totalPoints === 0) {
      throw new DomainValidationError(
        'PATROL_ROUTE_EMPTY',
        'Cannot start patrol without active patrol points',
      );
    }

    if (dto.scheduleId !== undefined && dto.dueAt !== undefined) {
      throw new DomainValidationError(
        'PATROL_SCHEDULE_DUE_AT_MANAGED',
        'Scheduled patrol dueAt is calculated by the server',
      );
    }

    const dueAt =
      dto.scheduleId === undefined
        ? dto.dueAt === undefined
          ? undefined
          : new Date(dto.dueAt)
        : await this.patrolSchedulesService.resolveDueAt(dto.scheduleId, dto.shopId);

    if (dto.scheduleId !== undefined && dueAt !== undefined) {
      const existingScheduledPatrol = await this.patrolsRepository.findExistingScheduledPatrol(
        dto.scheduleId,
        dueAt,
      );

      if (existingScheduledPatrol !== null) {
        throw new DomainValidationError(
          'PATROL_SCHEDULE_ALREADY_STARTED',
          'Patrol for this schedule has already been started',
        );
      }
    }

    return this.patrolsRepository.createPatrol({
      dueAt,
      employeeId: dto.employeeId,
      notes: dto.notes,
      routeId,
      scheduleId: dto.scheduleId,
      shopId: dto.shopId,
      startedAt: new Date(),
      status: 'in_progress',
      totalPoints,
    });
  }

  async findByShop(
    shopId: string,
    query: FindPatrolsDto,
    actor?: AuthenticatedUser,
  ): Promise<PaginatedPatrols> {
    if (actor !== undefined) {
      assertCanAccessPatrolShop(actor, shopId);
    }

    const [items, total] = await this.patrolsRepository.findByShop(
      shopId,
      query,
    );

    return {
      items,
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  async findByEmployee(
    employeeId: string,
    query: FindPatrolsDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedPatrols> {
    await this.usersService.findOne(employeeId);

    const inspectorShopIds =
      actor.shopIds ?? (actor.shopId === undefined ? [] : [actor.shopId]);

    if (actor.role === 'inspector' && inspectorShopIds.length === 0) {
      throw new DomainValidationError(
        'PATROL_HISTORY_FORBIDDEN',
        'Inspector must be assigned to a shop to view patrol history',
      );
    }

    const [items, total] = await this.patrolsRepository.findByEmployee(
      employeeId,
      query,
      actor.role === 'inspector' ? inspectorShopIds : undefined,
    );

    return {
      items,
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  findActiveByEmployee(employeeId: string): Promise<PatrolEntity | null> {
    return this.patrolsRepository.findActiveByEmployee(employeeId);
  }

  async findIncidents(
    query: FindPatrolIncidentsDto,
    actor?: AuthenticatedUser,
  ): Promise<PaginatedPatrolIncidents> {
    let inspectorIncidentShopIds: string[] | undefined;

    if (actor?.role === 'inspector' && query.shopId !== undefined) {
      assertCanAccessPatrolShop(actor, query.shopId);
    }

    if (actor?.role === 'inspector' && query.shopId === undefined) {
      inspectorIncidentShopIds = getInspectorShopIds(actor);

      if (inspectorIncidentShopIds.length === 0) {
        throw new DomainValidationError(
          'PATROL_ACCESS_FORBIDDEN',
          'Inspector must be assigned to a shop to view patrol data',
        );
      }
    }

    const [items, total] = await this.patrolsRepository.findIncidents({
      employeeId: query.employeeId,
      from: query.from === undefined ? undefined : new Date(query.from),
      limit: query.limit,
      page: query.page,
      search: query.search,
      shopId: query.shopId,
      shopIds: inspectorIncidentShopIds,
      sort: query.sort,
      to: query.to === undefined ? undefined : new Date(query.to),
      type: query.type,
    });

    return {
      items,
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  async findOne(id: string): Promise<PatrolEntity> {
    const patrol = await this.patrolsRepository.findById(id);

    if (patrol === null) {
      throw new EntityNotFoundError('Patrol', id);
    }

    return patrol;
  }

  async findOneForActor(id: string, actor: AuthenticatedUser): Promise<PatrolEntity> {
    const patrol = await this.findOne(id);
    assertCanAccessPatrolShop(actor, patrol.shopId);

    return patrol;
  }

  async getNfcWaitState(id: string, actor: AuthenticatedUser): Promise<NfcWaitStateDto> {
    const patrol = await this.findOne(id);

    if (actor.role === 'security_guard') {
      if (patrol.employeeId !== actor.id) {
        throw new DomainValidationError(
          'MOBILE_PATROL_FORBIDDEN',
          'Patrol does not belong to current mobile user',
        );
      }
    } else {
      assertCanAccessPatrolShop(actor, patrol.shopId);
    }

    return this.buildNfcWaitState(patrol);
  }

  async recordEvent(
    patrolId: string,
    dto: CreatePatrolEventDto,
    ipAddress?: string,
    options: { clientLocalId?: string } = {},
  ): Promise<PatrolEventEntity> {
    const result = await this.recordEventWithStatus(patrolId, dto, ipAddress, options);

    return result.event;
  }

  private async buildNfcWaitState(patrol: PatrolEntity): Promise<NfcWaitStateDto> {
    const active = patrol.status === 'in_progress' || patrol.status === 'overdue';
    const completed = patrol.status === 'completed' || patrol.scannedPoints >= patrol.totalPoints;
    const expectedPoint =
      active && !completed ? await this.patrolsRepository.findNextExpectedPoint(patrol) : null;
    const pointVisitStatus = getExpectedPointVisitStatus(expectedPoint);
    const expectedScanAction =
      pointVisitStatus === PatrolPointVisitStatus.ARRIVED ||
      pointVisitStatus === PatrolPointVisitStatus.READY_TO_DEPART
        ? PatrolScanAction.DEPART
        : expectedPoint === null
          ? undefined
          : PatrolScanAction.ARRIVE;
    const remainingLockSeconds =
      expectedPoint?.lockedUntil === undefined || expectedPoint.lockedUntil === null
        ? undefined
        : Math.max(0, Math.ceil((toDate(expectedPoint.lockedUntil).getTime() - Date.now()) / 1000));

    return {
      canAcceptNfc: active && expectedPoint !== null,
      expectedPoint: expectedPoint === null ? undefined : toExpectedPointDto(expectedPoint),
      expectedScanAction,
      lockedUntil:
        expectedPoint?.lockedUntil === undefined || expectedPoint.lockedUntil === null
          ? undefined
          : toDate(expectedPoint.lockedUntil),
      mode:
        active && expectedPoint !== null && expectedScanAction === PatrolScanAction.DEPART
          ? 'waiting_for_departure'
          : active && expectedPoint !== null
            ? 'waiting_for_nfc'
            : completed
              ? 'completed'
              : 'inactive',
      patrolId: patrol.id,
      pointVisitStatus,
      pointDwellSeconds: DEFAULT_POINT_DWELL_SECONDS,
      remainingLockSeconds,
      requiresForegroundNfcListening: true,
      routeId: patrol.routeId,
      scanContract: {
        endpoint: `/api/v1/mobile/patrols/${patrol.id}/point-visits/scan`,
        method: 'POST',
        requiredFields: ['patrolPointId', 'nfcUid', 'scannedAt', 'deviceId', 'scanAction'],
      },
      scannedPoints: patrol.scannedPoints,
      shopId: patrol.shopId,
      status: patrol.status,
      totalPoints: patrol.totalPoints,
    };
  }

  async recordEventWithStatus(
    patrolId: string,
    dto: CreatePatrolEventDto,
    ipAddress?: string,
    options: { clientLocalId?: string } = {},
  ): Promise<PatrolEventRecordResult> {
    if (options.clientLocalId !== undefined) {
      const existingEvent = await this.patrolsRepository.findEventByClientLocalId(
        options.clientLocalId,
      );

      if (existingEvent !== null) {
        return { event: existingEvent, status: 'duplicate' };
      }
    }

    const patrol = await this.findOne(patrolId);
    const patrolIsActive = patrol.status === 'in_progress' || patrol.status === 'overdue';
    const lateSync = options.clientLocalId !== undefined && !patrolIsActive;

    if (!patrolIsActive && !lateSync) {
      throw new DomainValidationError('PATROL_NOT_IN_PROGRESS', 'Patrol is not in progress');
    }

    const point = await this.patrolPointsService.findOne(dto.patrolPointId);
    const routeSortOrder =
      patrol.routeId === undefined
        ? point.sortOrder
        : await this.patrolRoutesService.assertPointInRoute(patrol.routeId, point.id);
    const pointDeactivatedAfterScan = options.clientLocalId !== undefined && !point.isActive;

    if (point.shopId !== patrol.shopId) {
      throw new DomainValidationError('PATROL_POINT_WRONG_SHOP', 'Patrol point belongs to another shop');
    }

    const tag =
      options.clientLocalId === undefined
        ? await this.patrolPointsService.findActiveTagByUid(dto.nfcUid)
        : await this.patrolPointsService.findRegisteredTagByUid(dto.nfcUid);

    if (
      !pointDeactivatedAfterScan &&
      (point.nfcTagId === null || point.nfcTagId === undefined || point.nfcTagId !== tag.id)
    ) {
      throw new DomainValidationError('NFC_TAG_MISMATCH', 'NFC tag does not match patrol point');
    }

    const existingVisit = await this.patrolsRepository.findPointVisitByPatrolAndPoint(
      patrol.id,
      point.id,
    );
    const scanAction = dto.scanAction ?? inferScanAction(existingVisit?.status);
    const existingActionEvent = await this.patrolsRepository.findAcceptedEventByPatrolPointAndAction(
      patrol.id,
      point.id,
      scanAction,
    );

    if (existingActionEvent !== null) {
      return { event: existingActionEvent, status: 'duplicate' };
    }

    let pointVisitId = existingVisit?.id;
    let accepted = true;
    let rejectionReason: string | undefined;
    const scannedAt = new Date(dto.scannedAt);

    if (!lateSync && !pointDeactivatedAfterScan) {
      if (scanAction === PatrolScanAction.ARRIVE && existingVisit !== null) {
        throw new DomainValidationError(
          'PATROL_POINT_VISIT_ALREADY_STARTED',
          'Patrol point visit has already been started',
        );
      }

      if (scanAction === PatrolScanAction.DEPART && existingVisit === null) {
        throw new DomainValidationError(
          'PATROL_POINT_VISIT_NOT_STARTED',
          'Patrol point must be scanned on arrival before departure',
        );
      }

      if (
        scanAction === PatrolScanAction.DEPART &&
        existingVisit !== null &&
        existingVisit.lockedUntil.getTime() > scannedAt.getTime()
      ) {
        accepted = false;
        rejectionReason = 'point_visit_locked';
      }
    }

    const createdVisit =
      scanAction === PatrolScanAction.ARRIVE && !lateSync && !pointDeactivatedAfterScan
        ? await this.patrolsRepository.createPointVisit({
            arrivedAt: scannedAt,
            lockedUntil: addSeconds(scannedAt, DEFAULT_POINT_DWELL_SECONDS),
            patrolId: patrol.id,
            patrolPointId: point.id,
          })
        : undefined;

    pointVisitId = createdVisit?.id ?? pointVisitId;

    const event = await this.patrolsRepository.createPatrolEvent({
      accepted,
      clientLocalId: options.clientLocalId,
      deviceId: dto.deviceId,
      employeeId: patrol.employeeId,
      gpsAccuracy: dto.gpsAccuracy,
      ipAddress,
      isSuspicious: dto.suspicionReason !== undefined,
      lateSync,
      lat: dto.lat === undefined ? undefined : dto.lat.toFixed(6),
      lng: dto.lng === undefined ? undefined : dto.lng.toFixed(6),
      nfcTagId: tag.id,
      nfcUid: normalizeNfcUid(dto.nfcUid),
      patrolId: patrol.id,
      patrolPointId: point.id,
      pointVisitId,
      pointDeactivatedAfterScan,
      rejectionReason,
      scanAction,
      scannedAt,
      suspicionReason: dto.suspicionReason,
    });

    if (createdVisit !== undefined) {
      await this.patrolsRepository.attachArrivalEventToPointVisit(createdVisit.id, event.id);
    }

    if (lateSync) {
      return { event, status: 'late_sync' };
    }

    if (pointDeactivatedAfterScan) {
      return { event, status: 'point_deactivated' };
    }

    if (!accepted) {
      const incident = await this.patrolsRepository.createPatrolIncident({
        actualSeconds:
          existingVisit === null ? undefined : secondsBetween(existingVisit.arrivedAt, scannedAt),
        expectedSeconds: DEFAULT_POINT_DWELL_SECONDS,
        fromPatrolPointId: point.id,
        message: `Point departure scan was rejected before lock expired`,
        patrolEventId: event.id,
        patrolId: patrol.id,
        shopId: patrol.shopId,
        toPatrolPointId: point.id,
        type: PatrolIncidentType.POINT_DWELL_TOO_SHORT,
      });
      await this.notifyIncidentCreated(patrol, incident);
      throw new DomainValidationError(
        'PATROL_POINT_VISIT_LOCKED',
        'Patrol point cannot be departed before lockedUntil',
      );
    }

    if (scanAction === PatrolScanAction.ARRIVE) {
      return { event, status: 'created' };
    }

    if (existingVisit === null) {
      throw new DomainValidationError(
        'PATROL_POINT_VISIT_NOT_STARTED',
        'Patrol point must be scanned on arrival before departure',
      );
    }

    await this.patrolsRepository.completePointVisit(existingVisit.id, {
      departedAt: scannedAt,
      departureEventId: event.id,
      dwellSeconds: secondsBetween(existingVisit.arrivedAt, scannedAt),
    });

    await this.analyzeTimingIncident(patrol, event, routeSortOrder);

    const nextScannedPoints = patrol.scannedPoints + 1;
    const nextStatus = nextScannedPoints >= patrol.totalPoints ? 'completed' : patrol.status;
    await this.patrolsRepository.updateScanProgress(patrol.id, nextScannedPoints, nextStatus);

    if (nextStatus === 'completed') {
      const completedAt = new Date();
      await this.patrolsRepository.markCompleted(
        patrol.id,
        completedAt,
        patrol.notes,
        patrol.completionReport,
      );
      await this.createBaselineIntervalsIfNeeded(patrol.id, patrol.shopId);
      await this.analyzeRouteTimingIncident(patrol, completedAt, event);
    }

    return { event, status: 'created' };
  }

  async complete(id: string, dto: CompletePatrolDto = {}): Promise<PatrolEntity> {
    const patrol = await this.findOne(id);

    if (patrol.status === 'completed') {
      if (dto.completionReport !== undefined) {
        await this.patrolsRepository.updateCompletionReport(id, dto.completionReport);
      }

      return this.findOne(id);
    }

    if (patrol.status !== 'in_progress' && patrol.status !== 'overdue') {
      throw new DomainValidationError('PATROL_NOT_IN_PROGRESS', 'Patrol is not in progress');
    }

    if (patrol.scannedPoints < patrol.totalPoints) {
      throw new DomainValidationError('PATROL_INCOMPLETE', 'All active points must be scanned');
    }

    const completedAt = new Date();
    await this.patrolsRepository.markCompleted(
      id,
      completedAt,
      patrol.notes,
      dto.completionReport,
    );
    await this.createBaselineIntervalsIfNeeded(patrol.id, patrol.shopId);
    await this.analyzeRouteTimingIncident(patrol, completedAt);

    return this.findOne(id);
  }

  async cancel(id: string, dto: CancelPatrolDto = {}): Promise<PatrolEntity> {
    const patrol = await this.findOne(id);

    if (patrol.status === 'cancelled') {
      return patrol;
    }

    if (patrol.status !== 'pending' && patrol.status !== 'in_progress' && patrol.status !== 'overdue') {
      throw new DomainValidationError('PATROL_CANNOT_BE_CANCELLED', 'Patrol cannot be cancelled');
    }

    await this.patrolsRepository.markCancelled(id, new Date(), dto.cancellationReason);
    await this.notificationsService.notifyPatrolCancelled({
      cancellationReason: dto.cancellationReason,
      employeeName: patrol.employee?.fullName,
      patrolId: patrol.id,
      shopId: patrol.shopId,
      shopName: patrol.shop?.name,
    });

    return this.findOne(id);
  }

  async recordMissedPointAttempt(
    patrolId: string,
    dto: ReportMissedPointAttemptDto,
  ): Promise<void> {
    const existingIncident = await this.patrolsRepository.findIncidentByClientLocalId(
      patrolId,
      dto.clientLocalId,
    );
    if (existingIncident !== null) {
      return;
    }

    const patrol = await this.findOne(patrolId);

    if (patrol.status !== 'in_progress' && patrol.status !== 'overdue') {
      throw new DomainValidationError(
        'PATROL_NOT_IN_PROGRESS',
        'Cannot report missed point attempt for inactive patrol',
      );
    }

    const expectedPoint = await this.patrolPointsService.findOne(dto.expectedPatrolPointId);
    const attemptedPoint = await this.patrolPointsService.findOne(dto.attemptedPatrolPointId);

    if (expectedPoint.shopId !== patrol.shopId || attemptedPoint.shopId !== patrol.shopId) {
      throw new DomainValidationError(
        'PATROL_POINT_WRONG_SHOP',
        'Patrol point does not belong to patrol shop',
      );
    }

    if (attemptedPoint.sortOrder <= expectedPoint.sortOrder) {
      return;
    }

    let incident: PatrolIncidentEntity;
    try {
      incident = await this.patrolsRepository.createPatrolIncident({
        clientLocalId: dto.clientLocalId,
        fromPatrolPointId: expectedPoint.id,
        message: `Попытка пропуска точки: сотрудник сканировал точку ${attemptedPoint.sortOrder} вместо ${expectedPoint.sortOrder}`,
        patrolId: patrol.id,
        shopId: patrol.shopId,
        toPatrolPointId: attemptedPoint.id,
        type: PatrolIncidentType.MISSED_POINT,
      });
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        return;
      }
      throw error;
    }

    await this.notifyIncidentCreated(patrol, incident);
  }

  private async analyzeTimingIncident(
    patrol: PatrolEntity,
    event: PatrolEventEntity,
    currentSortOrder: number,
  ): Promise<void> {
    const previousEvent = await this.patrolsRepository.findPreviousEventByRouteOrder(
      patrol.id,
      currentSortOrder,
    );

    if (previousEvent?.patrolPoint === undefined) {
      return;
    }

    const previousSortOrder = previousEvent.patrolPoint.sortOrder;

    if (currentSortOrder > previousSortOrder + 1) {
      const incident = await this.patrolsRepository.createPatrolIncident({
        fromPatrolPointId: previousEvent.patrolPointId,
        message: `Пропущены точки маршрута между ${previousSortOrder} и ${currentSortOrder}`,
        patrolEventId: event.id,
        patrolId: patrol.id,
        shopId: patrol.shopId,
        toPatrolPointId: event.patrolPointId,
        type: PatrolIncidentType.MISSED_POINT,
      });
      await this.notifyIncidentCreated(patrol, incident);
    }

    const routeInterval = await this.patrolsRepository.findRouteInterval(
      patrol.shopId,
      previousEvent.patrolPointId,
      event.patrolPointId,
    );

    if (routeInterval === null) {
      return;
    }

    const actualSeconds = Math.max(
      0,
      Math.round((event.scannedAt.getTime() - previousEvent.scannedAt.getTime()) / 1000),
    );

    if (actualSeconds < routeInterval.minSeconds) {
      const incident = await this.patrolsRepository.createPatrolIncident({
        actualSeconds,
        expectedSeconds: routeInterval.baselineSeconds,
        fromPatrolPointId: previousEvent.patrolPointId,
        message: `Подозрительно короткий интервал: ${actualSeconds} сек. при эталоне ${routeInterval.baselineSeconds} сек.`,
        patrolEventId: event.id,
        patrolId: patrol.id,
        shopId: patrol.shopId,
        toPatrolPointId: event.patrolPointId,
        type: PatrolIncidentType.SHORT_INTERVAL,
      });
      await this.notifyIncidentCreated(patrol, incident);
      return;
    }

    if (actualSeconds > routeInterval.maxSeconds) {
      const incident = await this.patrolsRepository.createPatrolIncident({
        actualSeconds,
        expectedSeconds: routeInterval.baselineSeconds,
        fromPatrolPointId: previousEvent.patrolPointId,
        message: `Слишком длинный интервал: ${actualSeconds} сек. при эталоне ${routeInterval.baselineSeconds} сек.`,
        patrolEventId: event.id,
        patrolId: patrol.id,
        shopId: patrol.shopId,
        toPatrolPointId: event.patrolPointId,
        type: PatrolIncidentType.LONG_INTERVAL,
      });
      await this.notifyIncidentCreated(patrol, incident);
    }
  }

  private async notifyIncidentCreated(
    patrol: PatrolEntity,
    incident: PatrolIncidentEntity,
  ): Promise<void> {
    await this.notificationsService.notifyPatrolIncident({
      employeeName: patrol.employee?.fullName,
      incidentId: incident.id,
      message: incident.message,
      patrolId: patrol.id,
      shopId: patrol.shopId,
      shopName: patrol.shop?.name,
      type: incident.type,
    });
  }

  private async createBaselineIntervalsIfNeeded(patrolId: string, shopId: string): Promise<void> {
    const existingIntervals = await this.patrolsRepository.countRouteIntervalsByShop(shopId);

    if (existingIntervals > 0) {
      return;
    }

    const events = await this.patrolsRepository.findEventsByPatrolOrdered(patrolId);

    if (events.length < 2 || events.some((event) => event.patrolPoint === undefined)) {
      return;
    }

    for (let index = 1; index < events.length; index += 1) {
      const previousEvent = events[index - 1];
      const currentEvent = events[index];

      if (
        previousEvent === undefined ||
        currentEvent === undefined ||
        previousEvent.patrolPoint === undefined ||
        currentEvent.patrolPoint === undefined
      ) {
        continue;
      }

      if (currentEvent.scannedAt < previousEvent.scannedAt) {
        return;
      }

      const baselineSeconds = Math.max(
        0,
        Math.round((currentEvent.scannedAt.getTime() - previousEvent.scannedAt.getTime()) / 1000),
      );

      await this.patrolsRepository.createPatrolRouteInterval({
        baselineSeconds,
        fromPatrolPointId: previousEvent.patrolPointId,
        fromSortOrder: previousEvent.patrolPoint.sortOrder,
        maxSeconds: Math.ceil(baselineSeconds * MAX_INTERVAL_FACTOR),
        minSeconds: Math.floor(baselineSeconds * MIN_INTERVAL_FACTOR),
        shopId,
        sourcePatrolId: patrolId,
        toPatrolPointId: currentEvent.patrolPointId,
        toSortOrder: currentEvent.patrolPoint.sortOrder,
      });
    }
  }

  private async analyzeRouteTimingIncident(
    patrol: PatrolEntity,
    completedAt: Date,
    patrolEvent?: PatrolEventEntity,
  ): Promise<void> {
    if (patrol.routeId === undefined || patrol.startedAt === undefined) {
      return;
    }

    const profile = await this.patrolsRepository.recalculateRouteTimingProfile(
      patrol.routeId,
      completedAt,
      {
        fastFactor: ROUTE_FAST_FACTOR,
        lookbackDays: ROUTE_TIMING_LOOKBACK_DAYS,
        slowFactor: ROUTE_SLOW_FACTOR,
        suspiciousFastFactor: ROUTE_SUSPICIOUS_FAST_FACTOR,
      },
    );

    if (profile === null || profile.sampleCount < ROUTE_TIMING_MIN_SAMPLE_COUNT) {
      return;
    }

    const actualSeconds = secondsBetween(patrol.startedAt, completedAt);
    let incidentType: PatrolIncidentType | undefined;

    if (actualSeconds < profile.suspiciousFastSeconds) {
      incidentType = PatrolIncidentType.ROUTE_SUSPICIOUSLY_FAST;
    } else if (actualSeconds < profile.fastSeconds) {
      incidentType = PatrolIncidentType.ROUTE_TOO_FAST;
    } else if (actualSeconds > profile.slowSeconds) {
      incidentType = PatrolIncidentType.ROUTE_TOO_SLOW;
    }

    if (incidentType === undefined) {
      return;
    }

    const incident = await this.patrolsRepository.createPatrolIncident({
      actualSeconds,
      expectedSeconds: profile.averageTotalSeconds,
      message: buildRouteTimingIncidentMessage(incidentType, actualSeconds, profile.averageTotalSeconds),
      patrolEventId: patrolEvent?.id,
      patrolId: patrol.id,
      shopId: patrol.shopId,
      type: incidentType,
    });
    await this.notifyIncidentCreated(patrol, incident);
  }
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

function assertCanAccessPatrolShop(actor: AuthenticatedUser, shopId: string): void {
  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'inspector' || !actorHasShop(actor, shopId)) {
    throw new DomainValidationError(
      'PATROL_ACCESS_FORBIDDEN',
      'User cannot access patrol data for this shop',
    );
  }
}

function getInspectorShopIds(actor: AuthenticatedUser): string[] {
  if (actor.role !== 'inspector') {
    return [];
  }

  return actor.shopIds ?? (actor.shopId === undefined ? [] : [actor.shopId]);
}

function actorHasShop(actor: AuthenticatedUser, shopId: string): boolean {
  return actor.shopId === shopId || actor.shopIds?.includes(shopId) === true;
}

function addSeconds(date: Date, seconds: number): Date {
  return new Date(date.getTime() + seconds * 1000);
}

function secondsBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
}

function inferScanAction(status?: PatrolPointVisitStatus): PatrolScanAction {
  if (status === PatrolPointVisitStatus.ARRIVED || status === PatrolPointVisitStatus.READY_TO_DEPART) {
    return PatrolScanAction.DEPART;
  }

  return PatrolScanAction.ARRIVE;
}

function getExpectedPointVisitStatus(
  point: ExpectedPatrolPointRecord | null,
): PatrolPointVisitStatus | undefined {
  if (point === null) {
    return undefined;
  }

  if (
    point.pointVisitStatus === PatrolPointVisitStatus.ARRIVED &&
    point.lockedUntil !== undefined &&
    point.lockedUntil !== null &&
    toDate(point.lockedUntil).getTime() <= Date.now()
  ) {
    return PatrolPointVisitStatus.READY_TO_DEPART;
  }

  return point.pointVisitStatus ?? PatrolPointVisitStatus.PENDING;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function buildRouteTimingIncidentMessage(
  type: PatrolIncidentType,
  actualSeconds: number,
  expectedSeconds: number,
): string {
  if (type === PatrolIncidentType.ROUTE_SUSPICIOUSLY_FAST) {
    return `Route completed suspiciously fast: ${actualSeconds} sec. with norm ${expectedSeconds} sec.`;
  }

  if (type === PatrolIncidentType.ROUTE_TOO_FAST) {
    return `Route completed too fast: ${actualSeconds} sec. with norm ${expectedSeconds} sec.`;
  }

  return `Route completed too slowly: ${actualSeconds} sec. with norm ${expectedSeconds} sec.`;
}

function toExpectedPointDto(point: ExpectedPatrolPointRecord): NfcWaitStateDto['expectedPoint'] {
  return {
    description: point.description ?? undefined,
    id: point.id,
    name: point.name,
    nfcTagId: point.nfcTagId ?? undefined,
    photoFileId: point.photoFileId ?? undefined,
    sortOrder: point.sortOrder,
  };
}
