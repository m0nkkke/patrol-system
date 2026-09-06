import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  FindPatrolsDto,
  DEFAULT_PATROL_POINT_DWELL_SECONDS,
  PatrolSnapshotPoint,
  PatrolIncidentType,
  PatrolPointVisitStatus,
  PatrolScanAction,
  PatrolStatus,
} from '@patrol/shared';
import { In, LessThan, Repository, SelectQueryBuilder } from 'typeorm';

import { PatrolEventEntity } from './entities/patrol-event.entity';
import { PatrolIncidentEntity } from './entities/patrol-incident.entity';
import { PatrolPointVisitEntity } from './entities/patrol-point-visit.entity';
import { PatrolRouteIntervalEntity } from './entities/patrol-route-interval.entity';
import { PatrolEntity } from './entities/patrol.entity';
import { RouteTimingProfileEntity } from './entities/route-timing-profile.entity';
import { PatrolRouteEntity } from './entities/patrol-route.entity';
import { PatrolRoutePointEntity } from './entities/patrol-route-point.entity';
import { PatrolPointEntity } from '../patrol-points/entities/patrol-point.entity';
import { DomainValidationError } from '../../common/errors/domain-validation.error';

type CreatePatrolRecord = {
  dueAt?: Date;
  employeeId: string;
  notes?: string;
  routeId?: string;
  scheduleId?: string;
  shopId: string;
  startedAt: Date;
  status: PatrolStatus;
  totalPoints: number;
};

type CreatePatrolEventRecord = {
  clientLocalId?: string;
  deviceId: string;
  employeeId: string;
  gpsAccuracy?: number;
  ipAddress?: string;
  isSuspicious: boolean;
  lateSync?: boolean;
  lat?: string;
  lng?: string;
  nfcTagId: string;
  nfcUid: string;
  accepted?: boolean;
  patrolId: string;
  patrolPointId: string;
  pointVisitId?: string;
  pointDeactivatedAfterScan?: boolean;
  rejectionReason?: string;
  scanAction: PatrolScanAction;
  scannedAt: Date;
  suspicionReason?: string;
};

type CreatePointVisitRecord = {
  arrivedAt: Date;
  lockedUntil: Date;
  patrolId: string;
  patrolPointId: string;
};

type CreatePatrolIncidentRecord = {
  actualSeconds?: number;
  clientLocalId?: string;
  expectedSeconds?: number;
  fromPatrolPointId?: string;
  message: string;
  patrolEventId?: string;
  patrolId: string;
  shopId: string;
  toPatrolPointId?: string;
  type: PatrolIncidentType;
};

type CreatePatrolRouteIntervalRecord = {
  baselineSeconds: number;
  fromPatrolPointId: string;
  fromSortOrder: number;
  maxSeconds: number;
  minSeconds: number;
  shopId: string;
  sourcePatrolId: string;
  toPatrolPointId: string;
  toSortOrder: number;
};

type RouteTimingProfileAggregate = {
  averageTotalSeconds: string | number;
  sampleCount: string | number;
};

type FindPatrolIncidentsQuery = {
  employeeId?: string;
  from?: Date;
  limit: number;
  page: number;
  search?: string;
  shopId?: string;
  shopIds?: string[];
  sort?: 'createdAt:desc' | 'createdAt:asc' | 'type:asc' | 'type:desc';
  to?: Date;
  type?: PatrolIncidentType;
};

export type ExpectedPatrolPointRecord = {
  id: string;
  description?: string | null;
  name: string;
  nfcTagId?: string | null;
  photoFileId?: string | null;
  pointVisitId?: string | null;
  pointVisitStatus?: PatrolPointVisitStatus | null;
  pointDwellSeconds?: number | null;
  lockedUntil?: Date | null;
  sortOrder: number;
};

@Injectable()
export class PatrolsRepository {
  constructor(
    @InjectRepository(PatrolEntity)
    private readonly patrols: Repository<PatrolEntity>,
    @InjectRepository(PatrolEventEntity)
    private readonly patrolEvents: Repository<PatrolEventEntity>,
    @InjectRepository(PatrolIncidentEntity)
    private readonly patrolIncidents: Repository<PatrolIncidentEntity>,
    @InjectRepository(PatrolPointVisitEntity)
    private readonly patrolPointVisits: Repository<PatrolPointVisitEntity>,
    @InjectRepository(PatrolRouteIntervalEntity)
    private readonly patrolRouteIntervals: Repository<PatrolRouteIntervalEntity>,
    @InjectRepository(RouteTimingProfileEntity)
    private readonly routeTimingProfiles: Repository<RouteTimingProfileEntity>,
  ) {}

  createPatrol(data: CreatePatrolRecord): Promise<PatrolEntity> {
    return this.patrols.manager.transaction(async (manager) => {
      let routeSnapshot: PatrolSnapshotPoint[];
      if (data.routeId != null) {
        // Serialize snapshot capture with edits of the route and its point links.
        const route = await manager.getRepository(PatrolRouteEntity).findOne({
          where: { id: data.routeId },
          lock: { mode: 'pessimistic_read' },
        });
        if (route === null || !route.isActive || route.shopId !== data.shopId) {
          throw new DomainValidationError('PATROL_ROUTE_INACTIVE', 'Patrol route is unavailable');
        }
        const links = await manager.getRepository(PatrolRoutePointEntity).find({
          where: { routeId: data.routeId },
          order: { sortOrder: 'ASC' },
          relations: { patrolPoint: { nfcTag: true } },
        });
        routeSnapshot = links
          .filter((link) => link.patrolPoint?.isActive)
          .map((link) => snapshotPoint(link.patrolPoint!, link.sortOrder, link.dwellSeconds));
      } else {
        const points = await manager.getRepository(PatrolPointEntity).find({
          where: { shopId: data.shopId, isActive: true },
          order: { sortOrder: 'ASC', createdAt: 'ASC' },
          relations: { nfcTag: true },
        });
        routeSnapshot = points.map((point) =>
          snapshotPoint(point, point.sortOrder, DEFAULT_PATROL_POINT_DWELL_SECONDS),
        );
      }
      if (routeSnapshot.length === 0) {
        throw new DomainValidationError(
          'PATROL_ROUTE_EMPTY',
          'Cannot start patrol without active patrol points',
        );
      }
      const patrols = manager.getRepository(PatrolEntity);
      return patrols.save(
        patrols.create({ ...data, routeSnapshot, totalPoints: routeSnapshot.length }),
      );
    });
  }

  createPatrolEvent(data: CreatePatrolEventRecord): Promise<PatrolEventEntity> {
    return this.patrolEvents.save(this.patrolEvents.create(data));
  }

  findEventByClientLocalId(clientLocalId: string): Promise<PatrolEventEntity | null> {
    return this.patrolEvents.findOne({ where: { clientLocalId } });
  }

  findAcceptedEventByPatrolPointAndAction(
    patrolId: string,
    patrolPointId: string,
    scanAction: PatrolScanAction,
  ): Promise<PatrolEventEntity | null> {
    return this.patrolEvents.findOne({
      where: { accepted: true, patrolId, patrolPointId, scanAction },
    });
  }

  findPointVisitByPatrolAndPoint(
    patrolId: string,
    patrolPointId: string,
  ): Promise<PatrolPointVisitEntity | null> {
    return this.patrolPointVisits.findOne({ where: { patrolId, patrolPointId } });
  }

  createPointVisit(data: CreatePointVisitRecord): Promise<PatrolPointVisitEntity> {
    return this.patrolPointVisits.save(
      this.patrolPointVisits.create({
        ...data,
        status: PatrolPointVisitStatus.ARRIVED,
      }),
    );
  }

  async attachArrivalEventToPointVisit(visitId: string, eventId: string): Promise<void> {
    await this.patrolPointVisits.update(visitId, { arrivalEventId: eventId });
  }

  async completePointVisit(
    visitId: string,
    data: {
      departedAt: Date;
      departureEventId: string;
      dwellSeconds: number;
    },
  ): Promise<void> {
    await this.patrolPointVisits.update(visitId, {
      departedAt: data.departedAt,
      departureEventId: data.departureEventId,
      dwellSeconds: data.dwellSeconds,
      status: PatrolPointVisitStatus.COMPLETED,
    });
  }

  createPatrolIncident(data: CreatePatrolIncidentRecord): Promise<PatrolIncidentEntity> {
    return this.patrolIncidents.save(this.patrolIncidents.create(data));
  }

  findIncidentByClientLocalId(
    patrolId: string,
    clientLocalId: string,
  ): Promise<PatrolIncidentEntity | null> {
    return this.patrolIncidents.findOne({ where: { clientLocalId, patrolId } });
  }

  createPatrolRouteInterval(
    data: CreatePatrolRouteIntervalRecord,
  ): Promise<PatrolRouteIntervalEntity> {
    return this.patrolRouteIntervals.save(this.patrolRouteIntervals.create(data));
  }

  findById(id: string): Promise<PatrolEntity | null> {
    return this.patrols.findOne({
      relations: { employee: true, events: true, route: true, schedule: true, shop: true },
      where: { id },
    });
  }

  findByShop(shopId: string, query: FindPatrolsDto): Promise<[PatrolEntity[], number]> {
    return this.createPatrolListBuilder(query)
      .andWhere('patrol.shop_id = :shopId', { shopId })
      .getManyAndCount();
  }

  findByEmployee(
    employeeId: string,
    query: FindPatrolsDto,
    shopIds?: string[],
  ): Promise<[PatrolEntity[], number]> {
    const builder = this.createPatrolListBuilder(query).andWhere(
      'patrol.employee_id = :employeeId',
      {
        employeeId,
      },
    );

    if (shopIds !== undefined) {
      builder.andWhere('patrol.shop_id IN (:...shopIds)', { shopIds });
    }

    return builder.getManyAndCount();
  }

  findActiveByEmployee(employeeId: string): Promise<PatrolEntity | null> {
    return this.patrols.findOne({
      order: { startedAt: 'DESC' },
      relations: { employee: true, events: true, route: true, schedule: true, shop: true },
      where: { employeeId, status: In(['in_progress', 'overdue']) },
    });
  }

  async findNextExpectedPoint(patrol: PatrolEntity): Promise<ExpectedPatrolPointRecord | null> {
    if (patrol.routeSnapshot != null) {
      const [point] = await this.patrols.query<ExpectedPatrolPointRecord[]>(
        `
        SELECT point.id, point.name, point.description,
          point.nfc_tag_id AS "nfcTagId", point.photo_file_id AS "photoFileId",
          snapshot."sortOrder", snapshot."dwellSeconds" AS "pointDwellSeconds",
          visit.id AS "pointVisitId", visit.status AS "pointVisitStatus", visit.locked_until AS "lockedUntil"
        FROM jsonb_to_recordset($2::jsonb) AS snapshot(id uuid, "sortOrder" int, "dwellSeconds" int)
        JOIN patrol_points point ON point.id = snapshot.id
        LEFT JOIN patrol_point_visits visit ON visit.patrol_id = $1 AND visit.patrol_point_id = point.id
        WHERE point.is_active = TRUE AND point.deleted_at IS NULL
          AND (visit.id IS NULL OR visit.status != 'completed')
        ORDER BY snapshot."sortOrder" ASC LIMIT 1
      `,
        [patrol.id, JSON.stringify(patrol.routeSnapshot)],
      );
      return point ?? null;
    }
    if (patrol.routeId != null) {
      return this.findNextExpectedRoutePoint(patrol.id, patrol.routeId);
    }

    return this.findNextExpectedShopPoint(patrol.id, patrol.shopId);
  }

  findOverdueCandidates(now: Date): Promise<PatrolEntity[]> {
    return this.patrols.find({
      relations: { employee: true, shop: true },
      where: {
        dueAt: LessThan(now),
        status: In(['pending', 'in_progress']),
      },
    });
  }

  findExistingScheduledPatrol(scheduleId: string, dueAt: Date): Promise<PatrolEntity | null> {
    return this.patrols
      .createQueryBuilder('patrol')
      .where('patrol.schedule_id = :scheduleId', { scheduleId })
      .andWhere('patrol.due_at = :dueAt', { dueAt })
      .andWhere('patrol.status != :cancelledStatus', { cancelledStatus: 'cancelled' })
      .getOne();
  }

  findIncidents(query: FindPatrolIncidentsQuery): Promise<[PatrolIncidentEntity[], number]> {
    const builder = this.patrolIncidents
      .createQueryBuilder('incident')
      .innerJoinAndSelect('incident.patrol', 'patrol')
      .leftJoinAndSelect('incident.patrolEvent', 'event')
      .leftJoinAndSelect('incident.fromPatrolPoint', 'fromPoint')
      .leftJoinAndSelect('incident.toPatrolPoint', 'toPoint')
      .leftJoinAndSelect('patrol.employee', 'employee')
      .leftJoinAndSelect('patrol.shop', 'shop')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [incidentSortField, incidentSortDirection] = parseIncidentSort(query.sort);
    builder.orderBy(`incident.${incidentSortField}`, incidentSortDirection);

    if (query.shopId !== undefined) {
      builder.andWhere('incident.shop_id = :shopId', { shopId: query.shopId });
    } else if (query.shopIds !== undefined) {
      builder.andWhere('incident.shop_id IN (:...shopIds)', { shopIds: query.shopIds });
    }

    if (query.employeeId !== undefined) {
      builder.andWhere('patrol.employee_id = :employeeId', { employeeId: query.employeeId });
    }

    if (query.search !== undefined && query.search.trim().length > 0) {
      builder.andWhere(
        '(incident.message ILIKE :search OR employee.full_name ILIKE :search OR shop.name ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    if (query.type !== undefined) {
      builder.andWhere('incident.type = :type', { type: query.type });
    }

    if (query.from !== undefined) {
      builder.andWhere('incident.created_at >= :from', { from: query.from });
    }

    if (query.to !== undefined) {
      builder.andWhere('incident.created_at <= :to', { to: query.to });
    }

    return builder.getManyAndCount();
  }

  private createPatrolListBuilder(query: FindPatrolsDto): SelectQueryBuilder<PatrolEntity> {
    const builder = this.patrols
      .createQueryBuilder('patrol')
      .leftJoinAndSelect('patrol.employee', 'employee')
      .leftJoinAndSelect('patrol.route', 'route')
      .leftJoinAndSelect('patrol.schedule', 'schedule')
      .leftJoinAndSelect('patrol.shop', 'shop')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.status !== undefined) {
      builder.andWhere('patrol.status = :status', { status: query.status });
    }

    if (query.from !== undefined) {
      builder.andWhere('patrol.created_at >= :from', { from: new Date(query.from) });
    }

    if (query.to !== undefined) {
      builder.andWhere('patrol.created_at <= :to', { to: new Date(query.to) });
    }

    const [field, direction] = parsePatrolSort(query.sort);
    builder.orderBy(`patrol.${field}`, direction);

    return builder;
  }

  findPreviousEventByRouteOrder(
    patrolId: string,
    currentSortOrder: number,
  ): Promise<PatrolEventEntity | null> {
    return this.patrolEvents
      .createQueryBuilder('event')
      .innerJoinAndSelect('event.patrolPoint', 'point')
      .where('event.patrol_id = :patrolId', { patrolId })
      .andWhere('event.accepted = TRUE')
      .andWhere('event.scan_action = :scanAction', { scanAction: PatrolScanAction.DEPART })
      .innerJoin('event.patrol', 'patrol')
      .addSelect(PATROL_POINT_ORDER_SQL, 'point_sort_order')
      .andWhere(`${PATROL_POINT_ORDER_SQL} < :currentSortOrder`, { currentSortOrder })
      .orderBy(PATROL_POINT_ORDER_SQL, 'DESC')
      .addOrderBy('event.scannedAt', 'DESC')
      .getOne();
  }

  findEventsByPatrolOrdered(patrolId: string): Promise<PatrolEventEntity[]> {
    return this.patrolEvents
      .createQueryBuilder('event')
      .innerJoinAndSelect('event.patrolPoint', 'point')
      .where('event.patrol_id = :patrolId', { patrolId })
      .andWhere('event.accepted = TRUE')
      .andWhere('event.scan_action = :scanAction', { scanAction: PatrolScanAction.DEPART })
      .innerJoin('event.patrol', 'patrol')
      .addSelect(PATROL_POINT_ORDER_SQL, 'point_sort_order')
      .orderBy(PATROL_POINT_ORDER_SQL, 'ASC')
      .addOrderBy('event.scannedAt', 'ASC')
      .getMany();
  }

  findRouteInterval(
    shopId: string,
    fromPatrolPointId: string,
    toPatrolPointId: string,
  ): Promise<PatrolRouteIntervalEntity | null> {
    return this.patrolRouteIntervals.findOne({
      where: { fromPatrolPointId, shopId, toPatrolPointId },
    });
  }

  countRouteIntervalsByShop(shopId: string): Promise<number> {
    return this.patrolRouteIntervals.count({ where: { shopId } });
  }

  findRouteTimingProfile(routeId: string): Promise<RouteTimingProfileEntity | null> {
    return this.routeTimingProfiles.findOne({ where: { routeId } });
  }

  async recalculateRouteTimingProfile(
    routeId: string,
    calculatedTo: Date,
    options: {
      fastFactor: number;
      lookbackDays: number;
      slowFactor: number;
      suspiciousFastFactor: number;
    },
  ): Promise<RouteTimingProfileEntity | null> {
    const calculatedFrom = new Date(
      calculatedTo.getTime() - options.lookbackDays * 24 * 60 * 60 * 1000,
    );
    const [aggregate] = await this.patrols.query<RouteTimingProfileAggregate[]>(
      `
      SELECT
        COUNT(*) AS "sampleCount",
        ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)))) AS "averageTotalSeconds"
      FROM patrols
      WHERE route_id = $1
        AND status = 'completed'
        AND started_at IS NOT NULL
        AND completed_at IS NOT NULL
        AND completed_at >= $2
        AND completed_at <= $3
        AND completed_at >= started_at
      `,
      [routeId, calculatedFrom, calculatedTo],
    );

    const sampleCount = Number(aggregate?.sampleCount ?? 0);
    const averageTotalSeconds = Number(aggregate?.averageTotalSeconds ?? 0);

    if (sampleCount === 0 || averageTotalSeconds <= 0) {
      return null;
    }

    const route = await this.patrols.query<Array<{ shopId: string }>>(
      'SELECT shop_id AS "shopId" FROM patrol_routes WHERE id = $1 LIMIT 1',
      [routeId],
    );
    const shopId = route[0]?.shopId;

    if (shopId === undefined) {
      return null;
    }

    const profile = this.routeTimingProfiles.create({
      averageTotalSeconds,
      calculatedFrom,
      calculatedTo,
      fastSeconds: Math.floor(averageTotalSeconds * options.fastFactor),
      routeId,
      sampleCount,
      shopId,
      slowSeconds: Math.ceil(averageTotalSeconds * options.slowFactor),
      suspiciousFastSeconds: Math.floor(averageTotalSeconds * options.suspiciousFastFactor),
    });

    await this.routeTimingProfiles.upsert(profile, ['routeId']);

    return this.findRouteTimingProfile(routeId);
  }

  async markCompleted(
    id: string,
    completedAt: Date,
    notes?: string,
    completionReport?: string,
  ): Promise<void> {
    await this.patrols.update(id, { completedAt, completionReport, notes, status: 'completed' });
  }

  async markCancelled(id: string, cancelledAt: Date, cancellationReason?: string): Promise<void> {
    await this.patrols.update(id, { cancellationReason, cancelledAt, status: 'cancelled' });
  }

  async updateCompletionReport(id: string, completionReport?: string): Promise<void> {
    await this.patrols.update(id, { completionReport });
  }

  async updateScanProgress(id: string, scannedPoints: number, status: PatrolStatus): Promise<void> {
    await this.patrols.update(id, { scannedPoints, status });
  }

  async markOverdue(now: Date): Promise<number> {
    const result = await this.patrols.update(
      {
        dueAt: LessThan(now),
        status: In(['pending', 'in_progress']),
      },
      { status: 'overdue' },
    );

    return result.affected ?? 0;
  }

  async markOverdueByIds(ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const result = await this.patrols.update({ id: In(ids) }, { status: 'overdue' });

    return result.affected ?? 0;
  }

  private async findNextExpectedRoutePoint(
    patrolId: string,
    routeId: string,
  ): Promise<ExpectedPatrolPointRecord | null> {
    const [raw] = await this.patrols.query<ExpectedPatrolPointRecord[]>(
      `
      SELECT
        point.id,
        point.description,
        point.name,
        point.nfc_tag_id AS "nfcTagId",
        point.photo_file_id AS "photoFileId",
        visit.id AS "pointVisitId",
        visit.status AS "pointVisitStatus",
        visit.locked_until AS "lockedUntil",
        route_point.dwell_seconds AS "pointDwellSeconds",
        route_point.sort_order AS "sortOrder"
      FROM patrol_route_points route_point
      INNER JOIN patrol_points point ON point.id = route_point.patrol_point_id
      LEFT JOIN patrol_point_visits visit
        ON visit.patrol_id = $1
        AND visit.patrol_point_id = point.id
      WHERE route_point.route_id = $2
        AND point.is_active = TRUE
        AND (visit.id IS NULL OR visit.status != 'completed')
      ORDER BY route_point.sort_order ASC
      LIMIT 1
      `,
      [patrolId, routeId],
    );

    return raw ?? null;
  }

  private async findNextExpectedShopPoint(
    patrolId: string,
    shopId: string,
  ): Promise<ExpectedPatrolPointRecord | null> {
    const [raw] = await this.patrols.query<ExpectedPatrolPointRecord[]>(
      `
      SELECT
        point.id,
        point.description,
        point.name,
        point.nfc_tag_id AS "nfcTagId",
        point.photo_file_id AS "photoFileId",
        visit.id AS "pointVisitId",
        visit.status AS "pointVisitStatus",
        visit.locked_until AS "lockedUntil",
        90 AS "pointDwellSeconds",
        point.sort_order AS "sortOrder"
      FROM patrol_points point
      LEFT JOIN patrol_point_visits visit
        ON visit.patrol_id = $1
        AND visit.patrol_point_id = point.id
      WHERE point.shop_id = $2
        AND point.is_active = TRUE
        AND (visit.id IS NULL OR visit.status != 'completed')
      ORDER BY point.sort_order ASC, point.created_at ASC
      LIMIT 1
      `,
      [patrolId, shopId],
    );

    return raw ?? null;
  }
}

const PATROL_POINT_ORDER_SQL = `COALESCE((
  SELECT (snapshot->>'sortOrder')::int FROM jsonb_array_elements(patrol.route_snapshot) snapshot
  WHERE snapshot->>'id' = point.id::text
), point.sort_order)`;

function snapshotPoint(
  point: PatrolPointEntity,
  sortOrder: number,
  dwellSeconds: number,
): PatrolSnapshotPoint {
  return {
    id: point.id,
    shopId: point.shopId,
    name: point.name,
    isActive: point.isActive,
    description: point.description ?? undefined,
    photoFileId: point.photoFileId ?? undefined,
    nfcTagId: point.nfcTagId ?? undefined,
    nfcTag:
      point.nfcTag == null
        ? undefined
        : {
            id: point.nfcTag.id,
            uid: point.nfcTag.uid,
            isActive: point.nfcTag.isActive,
          },
    sortOrder,
    dwellSeconds,
  };
}

function parsePatrolSort(
  sort: FindPatrolsDto['sort'],
): ['createdAt' | 'startedAt' | 'status', 'ASC' | 'DESC'] {
  if (sort === undefined) {
    return ['createdAt', 'DESC'];
  }

  const [field, direction] = sort.split(':');
  return [field as 'createdAt' | 'startedAt' | 'status', direction === 'asc' ? 'ASC' : 'DESC'];
}

function parseIncidentSort(
  sort: FindPatrolIncidentsQuery['sort'],
): ['createdAt' | 'type', 'ASC' | 'DESC'] {
  if (sort === undefined) {
    return ['createdAt', 'DESC'];
  }

  const [field, direction] = sort.split(':');
  return [field as 'createdAt' | 'type', direction === 'asc' ? 'ASC' : 'DESC'];
}
