import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PatrolIncidentType, PatrolStatus } from '@patrol/shared';
import { In, LessThan, Repository } from 'typeorm';

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
  shopId?: string;
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

  findByShop(shopId: string, page: number, limit: number): Promise<[PatrolEntity[], number]> {
    return this.patrols.findAndCount({
      order: { createdAt: 'DESC' },
      relations: { employee: true },
      skip: (page - 1) * limit,
      take: limit,
      where: { shopId },
    });
  }

  findByEmployee(
    employeeId: string,
    page: number,
    limit: number,
    shopIds?: string[],
  ): Promise<[PatrolEntity[], number]> {
    return this.patrols.findAndCount({
      order: { createdAt: 'DESC' },
      relations: { employee: true, schedule: true, shop: true },
      skip: (page - 1) * limit,
      take: limit,
      where: { employeeId, ...(shopIds === undefined ? {} : { shopId: In(shopIds) }) },
    });
  }

  findActiveByEmployee(employeeId: string): Promise<PatrolEntity | null> {
    return this.patrols.findOne({
      order: { startedAt: 'DESC' },
      relations: { employee: true, events: true, schedule: true, shop: true },
      where: { employeeId, status: In(['in_progress', 'overdue']) },
    });
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
      .orderBy('incident.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.shopId !== undefined) {
      builder.andWhere('incident.shop_id = :shopId', { shopId: query.shopId });
    }

    if (query.employeeId !== undefined) {
      builder.andWhere('patrol.employee_id = :employeeId', { employeeId: query.employeeId });
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

  async markCompleted(id: string, completedAt: Date, notes?: string): Promise<void> {
    await this.patrols.update(id, { completedAt, notes, status: 'completed' });
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
