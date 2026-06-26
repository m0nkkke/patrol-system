import { Injectable } from '@nestjs/common';
import {
  CancelPatrolDto,
  CompletePatrolDto,
  CreatePatrolEventDto,
  FindPatrolIncidentsDto,
  PaginationDto,
  PatrolIncidentType,
  RouteStatus,
  StartPatrolDto,
  SyncPatrolEventStatus,
} from '@patrol/shared';

import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { PatrolPointsService, normalizeNfcUid } from '../patrol-points/patrol-points.service';
import { ShopsService } from '../shops/shops.service';
import { UsersService } from '../users/users.service';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { PatrolEventEntity } from './entities/patrol-event.entity';
import { PatrolIncidentEntity } from './entities/patrol-incident.entity';
import { PatrolEntity } from './entities/patrol.entity';
import { PatrolSchedulesService } from './patrol-schedules.service';
import { PatrolsRepository } from './patrols.repository';

const MIN_INTERVAL_FACTOR = 0.5;
const MAX_INTERVAL_FACTOR = 2;

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
    private readonly shopsService: ShopsService,
    private readonly usersService: UsersService,
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

    const totalPoints = await this.patrolPointsService.countActiveByShop(dto.shopId);

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

    return this.patrolsRepository.createPatrol({
      dueAt,
      employeeId: dto.employeeId,
      notes: dto.notes,
      scheduleId: dto.scheduleId,
      shopId: dto.shopId,
      startedAt: new Date(),
      status: 'in_progress',
      totalPoints,
    });
  }

  async findByShop(
    shopId: string,
    pagination: PaginationDto,
    actor?: AuthenticatedUser,
  ): Promise<PaginatedPatrols> {
    if (actor !== undefined) {
      assertCanAccessPatrolShop(actor, shopId);
    }

    const [items, total] = await this.patrolsRepository.findByShop(
      shopId,
      pagination.page,
      pagination.limit,
    );

    return {
      items,
      limit: pagination.limit,
      page: pagination.page,
      total,
    };
  }

  async findByEmployee(
    employeeId: string,
    pagination: PaginationDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedPatrols> {
    await this.usersService.findOne(employeeId);

    const managerShopIds =
      actor.shopIds ?? (actor.shopId === undefined ? [] : [actor.shopId]);

    if (actor.role === 'manager' && managerShopIds.length === 0) {
      throw new DomainValidationError(
        'PATROL_HISTORY_FORBIDDEN',
        'Manager must be assigned to a shop to view patrol history',
      );
    }

    const [items, total] = await this.patrolsRepository.findByEmployee(
      employeeId,
      pagination.page,
      pagination.limit,
      actor.role === 'manager' ? managerShopIds : undefined,
    );

    return {
      items,
      limit: pagination.limit,
      page: pagination.page,
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
    let managerIncidentShopIds: string[] | undefined;

    if (actor?.role === 'manager' && query.shopId !== undefined) {
      assertCanAccessPatrolShop(actor, query.shopId);
    }

    if (actor?.role === 'manager' && query.shopId === undefined) {
      managerIncidentShopIds = getManagerShopIds(actor);

      if (managerIncidentShopIds.length === 0) {
        throw new DomainValidationError(
          'PATROL_ACCESS_FORBIDDEN',
          'Manager must be assigned to a shop to view patrol data',
        );
      }
    }

    const [items, total] = await this.patrolsRepository.findIncidents({
      employeeId: query.employeeId,
      from: query.from === undefined ? undefined : new Date(query.from),
      limit: query.limit,
      page: query.page,
      shopId: query.shopId,
      shopIds: managerIncidentShopIds,
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

  async recordEvent(
    patrolId: string,
    dto: CreatePatrolEventDto,
    ipAddress?: string,
    options: { clientLocalId?: string } = {},
  ): Promise<PatrolEventEntity> {
    const result = await this.recordEventWithStatus(patrolId, dto, ipAddress, options);

    return result.event;
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

    const existingPointEvent = await this.patrolsRepository.findEventByPatrolAndPoint(
      patrolId,
      dto.patrolPointId,
    );

    if (existingPointEvent !== null) {
      return { event: existingPointEvent, status: 'duplicate' };
    }

    const patrol = await this.findOne(patrolId);
    const patrolIsActive = patrol.status === 'in_progress' || patrol.status === 'overdue';
    const lateSync = options.clientLocalId !== undefined && !patrolIsActive;

    if (!patrolIsActive && !lateSync) {
      throw new DomainValidationError('PATROL_NOT_IN_PROGRESS', 'Patrol is not in progress');
    }

    const point = await this.patrolPointsService.findOne(dto.patrolPointId);
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

    const event = await this.patrolsRepository.createPatrolEvent({
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
      pointDeactivatedAfterScan,
      scannedAt: new Date(dto.scannedAt),
      suspicionReason: dto.suspicionReason,
    });

    if (lateSync) {
      return { event, status: 'late_sync' };
    }

    if (pointDeactivatedAfterScan) {
      return { event, status: 'point_deactivated' };
    }

    await this.analyzeTimingIncident(patrol, event, point.sortOrder);

    const nextScannedPoints = patrol.scannedPoints + 1;
    const nextStatus = nextScannedPoints >= patrol.totalPoints ? 'completed' : patrol.status;
    await this.patrolsRepository.updateScanProgress(patrol.id, nextScannedPoints, nextStatus);

    if (nextStatus === 'completed') {
      await this.patrolsRepository.markCompleted(
        patrol.id,
        new Date(),
        patrol.notes,
        patrol.completionReport,
      );
      await this.createBaselineIntervalsIfNeeded(patrol.id, patrol.shopId);
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

    await this.patrolsRepository.markCompleted(
      id,
      new Date(),
      patrol.notes,
      dto.completionReport,
    );
    await this.createBaselineIntervalsIfNeeded(patrol.id, patrol.shopId);

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

    return this.findOne(id);
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
      await this.patrolsRepository.createPatrolIncident({
        fromPatrolPointId: previousEvent.patrolPointId,
        message: `Пропущены точки маршрута между ${previousSortOrder} и ${currentSortOrder}`,
        patrolEventId: event.id,
        patrolId: patrol.id,
        shopId: patrol.shopId,
        toPatrolPointId: event.patrolPointId,
        type: PatrolIncidentType.MISSED_POINT,
      });
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
      await this.patrolsRepository.createPatrolIncident({
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
      return;
    }

    if (actualSeconds > routeInterval.maxSeconds) {
      await this.patrolsRepository.createPatrolIncident({
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
    }
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
}

function assertCanAccessPatrolShop(actor: AuthenticatedUser, shopId: string): void {
  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'manager' || !actorHasShop(actor, shopId)) {
    throw new DomainValidationError(
      'PATROL_ACCESS_FORBIDDEN',
      'User cannot access patrol data for this shop',
    );
  }
}

function getManagerShopIds(actor: AuthenticatedUser): string[] {
  if (actor.role !== 'manager') {
    return [];
  }

  return actor.shopIds ?? (actor.shopId === undefined ? [] : [actor.shopId]);
}

function actorHasShop(actor: AuthenticatedUser, shopId: string): boolean {
  return actor.shopId === shopId || actor.shopIds?.includes(shopId) === true;
}
