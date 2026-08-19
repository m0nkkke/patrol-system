import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindControlPatrolsDto, PatrolStatus } from '@patrol/shared';
import { Repository } from 'typeorm';

import { PatrolEventEntity } from '../../patrols/entities/patrol-event.entity';
import { PatrolIncidentEntity } from '../../patrols/entities/patrol-incident.entity';
import { PatrolPointVisitEntity } from '../../patrols/entities/patrol-point-visit.entity';
import { PatrolEntity } from '../../patrols/entities/patrol.entity';
import { RouteTimingProfileEntity } from '../../patrols/entities/route-timing-profile.entity';
import { PatrolReportEntity } from '../entities/patrol-report.entity';

export type FindControlPatrolsQuery = {
  allowedShopIds?: string[];
  employeeId?: string;
  from?: Date;
  limit: number;
  page: number;
  routeId?: string;
  search?: string;
  shopId?: string;
  sort?: FindControlPatrolsDto['sort'];
  status?: PatrolStatus;
  to?: Date;
};

export type ControlPatrolListRecord = {
  expectedSeconds: number | null;
  incidentCount: number;
  patrol: PatrolEntity;
  reportCount: number;
};

@Injectable()
export class ControlPatrolsRepository {
  constructor(
    @InjectRepository(PatrolEntity)
    private readonly patrols: Repository<PatrolEntity>,
    @InjectRepository(PatrolEventEntity)
    private readonly events: Repository<PatrolEventEntity>,
    @InjectRepository(PatrolIncidentEntity)
    private readonly incidents: Repository<PatrolIncidentEntity>,
    @InjectRepository(PatrolPointVisitEntity)
    private readonly visits: Repository<PatrolPointVisitEntity>,
    @InjectRepository(PatrolReportEntity)
    private readonly reports: Repository<PatrolReportEntity>,
    @InjectRepository(RouteTimingProfileEntity)
    private readonly timingProfiles: Repository<RouteTimingProfileEntity>,
  ) {}

  async findMany(query: FindControlPatrolsQuery): Promise<[ControlPatrolListRecord[], number]> {
    const builder = this.patrols
      .createQueryBuilder('patrol')
      .leftJoinAndSelect('patrol.employee', 'employee')
      .leftJoinAndSelect('patrol.route', 'route')
      .leftJoinAndSelect('patrol.schedule', 'schedule')
      .leftJoinAndSelect('patrol.shop', 'shop')
      .leftJoin(RouteTimingProfileEntity, 'timing', 'timing.route_id = patrol.route_id')
      .addSelect('timing.average_total_seconds', 'expected_seconds')
      .addSelect(
        (subquery) => subquery
          .select('COUNT(*)')
          .from(PatrolIncidentEntity, 'incident_count_source')
          .where('incident_count_source.patrol_id = patrol.id'),
        'incident_count',
      )
      .addSelect(
        (subquery) => subquery
          .select('COUNT(*)')
          .from(PatrolReportEntity, 'report_count_source')
          .where('report_count_source.patrol_id = patrol.id'),
        'report_count',
      )
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.shopId !== undefined) {
      builder.andWhere('patrol.shop_id = :shopId', { shopId: query.shopId });
    } else if (query.allowedShopIds !== undefined) {
      builder.andWhere('patrol.shop_id IN (:...allowedShopIds)', { allowedShopIds: query.allowedShopIds });
    }

    if (query.employeeId !== undefined) {
      builder.andWhere('patrol.employee_id = :employeeId', { employeeId: query.employeeId });
    }

    if (query.routeId !== undefined) {
      builder.andWhere('patrol.route_id = :routeId', { routeId: query.routeId });
    }

    if (query.status !== undefined) {
      builder.andWhere('patrol.status = :status', { status: query.status });
    }

    if (query.search !== undefined && query.search.trim().length > 0) {
      builder.andWhere(
        '(shop.name ILIKE :search OR employee.full_name ILIKE :search OR route.name ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    if (query.from !== undefined) {
      builder.andWhere('COALESCE(patrol.started_at, patrol.created_at) >= :from', { from: query.from });
    }

    if (query.to !== undefined) {
      builder.andWhere('COALESCE(patrol.started_at, patrol.created_at) <= :to', { to: query.to });
    }

    const [sortField, sortDirection] = parseSort(query.sort);
    builder.orderBy(`patrol.${sortField}`, sortDirection, 'NULLS LAST');

    const total = await builder.getCount();
    const { entities, raw } = await builder.getRawAndEntities<{
      expected_seconds?: number | string | null;
      incident_count?: number | string;
      report_count?: number | string;
    }>();

    return [entities.map((patrol, index) => ({
      expectedSeconds: toNullableNumber(raw[index]?.expected_seconds),
      incidentCount: Number(raw[index]?.incident_count ?? 0),
      patrol,
      reportCount: Number(raw[index]?.report_count ?? 0),
    })), total];
  }

  findById(id: string): Promise<PatrolEntity | null> {
    return this.patrols.findOne({
      relations: { employee: true, route: true, schedule: true, shop: true },
      where: { id },
    });
  }

  findEvents(patrolId: string): Promise<PatrolEventEntity[]> {
    return this.events
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.patrolPoint', 'point')
      .where('event.patrol_id = :patrolId', { patrolId })
      .orderBy('event.scannedAt', 'ASC')
      .getMany();
  }

  findVisits(patrolId: string): Promise<PatrolPointVisitEntity[]> {
    return this.visits
      .createQueryBuilder('visit')
      .leftJoinAndSelect('visit.patrolPoint', 'point')
      .leftJoinAndSelect('visit.arrivalEvent', 'arrivalEvent')
      .leftJoinAndSelect('visit.departureEvent', 'departureEvent')
      .where('visit.patrol_id = :patrolId', { patrolId })
      .orderBy('point.sortOrder', 'ASC')
      .getMany();
  }

  findIncidents(patrolId: string): Promise<PatrolIncidentEntity[]> {
    return this.incidents.find({
      order: { createdAt: 'ASC' },
      relations: { fromPatrolPoint: true, toPatrolPoint: true },
      where: { patrolId },
    });
  }

  findReports(patrolId: string): Promise<PatrolReportEntity[]> {
    return this.reports.find({
      order: { createdAt: 'DESC' },
      relations: { files: true },
      where: { patrolId },
    });
  }

  findTimingProfile(routeId: string | undefined): Promise<RouteTimingProfileEntity | null> {
    return routeId === undefined
      ? Promise.resolve(null)
      : this.timingProfiles.findOne({ where: { routeId } });
  }
}

function parseSort(sort: FindControlPatrolsDto['sort']): ['startedAt' | 'createdAt' | 'status', 'ASC' | 'DESC'] {
  if (sort === undefined) return ['startedAt', 'DESC'];
  const [field, direction] = sort.split(':');
  return [field as 'startedAt' | 'createdAt' | 'status', direction === 'asc' ? 'ASC' : 'DESC'];
}

function toNullableNumber(value: number | string | null | undefined): number | null {
  return value == null ? null : Number(value);
}
