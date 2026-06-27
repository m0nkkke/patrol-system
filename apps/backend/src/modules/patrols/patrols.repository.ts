import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindPatrolsDto, PatrolIncidentType, PatrolStatus } from '@patrol/shared';
import { In, LessThan, Repository, SelectQueryBuilder } from 'typeorm';

import { PatrolEventEntity } from './entities/patrol-event.entity';
import { PatrolIncidentEntity } from './entities/patrol-incident.entity';
import { PatrolRouteIntervalEntity } from './entities/patrol-route-interval.entity';
import { PatrolEntity } from './entities/patrol.entity';

type CreatePatrolRecord = {
  dueAt?: Date;
  employeeId: string;
  notes?: string;
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
  patrolId: string;
  patrolPointId: string;
  pointDeactivatedAfterScan?: boolean;
  scannedAt: Date;
  suspicionReason?: string;
};

type CreatePatrolIncidentRecord = {
  actualSeconds?: number;
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

@Injectable()
export class PatrolsRepository {
  constructor(
    @InjectRepository(PatrolEntity)
    private readonly patrols: Repository<PatrolEntity>,
    @InjectRepository(PatrolEventEntity)
    private readonly patrolEvents: Repository<PatrolEventEntity>,
    @InjectRepository(PatrolIncidentEntity)
    private readonly patrolIncidents: Repository<PatrolIncidentEntity>,
    @InjectRepository(PatrolRouteIntervalEntity)
    private readonly patrolRouteIntervals: Repository<PatrolRouteIntervalEntity>,
  ) {}

  createPatrol(data: CreatePatrolRecord): Promise<PatrolEntity> {
    return this.patrols.save(this.patrols.create(data));
  }

  createPatrolEvent(data: CreatePatrolEventRecord): Promise<PatrolEventEntity> {
    return this.patrolEvents.save(this.patrolEvents.create(data));
  }

  findEventByClientLocalId(clientLocalId: string): Promise<PatrolEventEntity | null> {
    return this.patrolEvents.findOne({ where: { clientLocalId } });
  }

  findEventByPatrolAndPoint(
    patrolId: string,
    patrolPointId: string,
  ): Promise<PatrolEventEntity | null> {
    return this.patrolEvents.findOne({ where: { patrolId, patrolPointId } });
  }

  createPatrolIncident(data: CreatePatrolIncidentRecord): Promise<PatrolIncidentEntity> {
    return this.patrolIncidents.save(this.patrolIncidents.create(data));
  }

  createPatrolRouteInterval(
    data: CreatePatrolRouteIntervalRecord,
  ): Promise<PatrolRouteIntervalEntity> {
    return this.patrolRouteIntervals.save(this.patrolRouteIntervals.create(data));
  }

  findById(id: string): Promise<PatrolEntity | null> {
    return this.patrols.findOne({
      relations: { employee: true, events: true, schedule: true, shop: true },
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
    const builder = this.createPatrolListBuilder(query).andWhere('patrol.employee_id = :employeeId', {
      employeeId,
    });

    if (shopIds !== undefined) {
      builder.andWhere('patrol.shop_id IN (:...shopIds)', { shopIds });
    }

    return builder.getManyAndCount();
  }

  findActiveByEmployee(employeeId: string): Promise<PatrolEntity | null> {
    return this.patrols.findOne({
      order: { startedAt: 'DESC' },
      relations: { employee: true, events: true, schedule: true, shop: true },
      where: { employeeId, status: In(['in_progress', 'overdue']) },
    });
  }

  findExistingScheduledPatrol(
    scheduleId: string,
    dueAt: Date,
  ): Promise<PatrolEntity | null> {
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
      .andWhere('point.sort_order < :currentSortOrder', { currentSortOrder })
      .orderBy('point.sortOrder', 'DESC')
      .addOrderBy('event.scannedAt', 'DESC')
      .getOne();
  }

  findEventsByPatrolOrdered(patrolId: string): Promise<PatrolEventEntity[]> {
    return this.patrolEvents
      .createQueryBuilder('event')
      .innerJoinAndSelect('event.patrolPoint', 'point')
      .where('event.patrol_id = :patrolId', { patrolId })
      .orderBy('point.sortOrder', 'ASC')
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

  async markCompleted(
    id: string,
    completedAt: Date,
    notes?: string,
    completionReport?: string,
  ): Promise<void> {
    await this.patrols.update(id, { completedAt, completionReport, notes, status: 'completed' });
  }

  async markCancelled(
    id: string,
    cancelledAt: Date,
    cancellationReason?: string,
  ): Promise<void> {
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
}

function parsePatrolSort(sort: FindPatrolsDto['sort']): ['createdAt' | 'startedAt' | 'status', 'ASC' | 'DESC'] {
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
