import { Injectable } from '@nestjs/common';
import { AlertSeverity, FindPatrolIncidentsDto, PatrolIncidentType } from '@patrol/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PatrolIncidentEntity } from '../../patrols/entities/patrol-incident.entity';

type FindControlIncidentsQuery = {
  allowedShopIds?: string[];
  employeeId?: string;
  from?: Date;
  limit: number;
  page: number;
  patrolId?: string;
  search?: string;
  severity?: AlertSeverity;
  shopId?: string;
  sort?: FindPatrolIncidentsDto['sort'];
  to?: Date;
  type?: PatrolIncidentType;
};

type FindControlIncidentsOptions = {
  paginate?: boolean;
};

@Injectable()
export class ControlIncidentsRepository {
  constructor(
    @InjectRepository(PatrolIncidentEntity)
    private readonly incidents: Repository<PatrolIncidentEntity>,
  ) {}

  findMany(
    query: FindControlIncidentsQuery,
    options: FindControlIncidentsOptions = {},
  ): Promise<[PatrolIncidentEntity[], number]> {
    const builder = this.createControlIncidentBuilder();

    if (options.paginate !== false) {
      builder.skip((query.page - 1) * query.limit).take(query.limit);
    }

    const [field, direction] = parseIncidentSort(query.sort);
    builder.orderBy(`incident.${field}`, direction);

    if (query.shopId !== undefined) {
      builder.andWhere('incident.shop_id = :shopId', { shopId: query.shopId });
    } else if (query.allowedShopIds !== undefined) {
      builder.andWhere('incident.shop_id IN (:...allowedShopIds)', {
        allowedShopIds: query.allowedShopIds,
      });
    }

    if (query.employeeId !== undefined) {
      builder.andWhere('patrol.employee_id = :employeeId', { employeeId: query.employeeId });
    }

    if (query.patrolId !== undefined) {
      builder.andWhere('incident.patrol_id = :patrolId', { patrolId: query.patrolId });
    }

    if (query.type !== undefined) {
      builder.andWhere('incident.type = :type', { type: query.type });
    }

    if (query.severity !== undefined) {
      const types = incidentTypesBySeverity(query.severity);
      builder.andWhere(
        types.length === 0 ? '1 = 0' : 'incident.type IN (:...severityTypes)',
        { severityTypes: types },
      );
    }

    if (query.search !== undefined && query.search.trim().length > 0) {
      builder.andWhere(
        '(incident.message ILIKE :search OR employee.full_name ILIKE :search OR shop.name ILIKE :search OR route.name ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    if (query.from !== undefined) {
      builder.andWhere('incident.created_at >= :from', { from: query.from });
    }

    if (query.to !== undefined) {
      builder.andWhere('incident.created_at <= :to', { to: query.to });
    }

    return builder.getManyAndCount();
  }

  findById(id: string): Promise<PatrolIncidentEntity | null> {
    return this.createControlIncidentBuilder()
      .where('incident.id = :id', { id })
      .getOne();
  }

  private createControlIncidentBuilder() {
    return this.incidents
      .createQueryBuilder('incident')
      .innerJoinAndSelect('incident.patrol', 'patrol')
      .leftJoinAndSelect('incident.patrolEvent', 'event')
      .leftJoinAndSelect('incident.fromPatrolPoint', 'fromPoint')
      .leftJoinAndSelect('incident.toPatrolPoint', 'toPoint')
      .leftJoinAndSelect('patrol.employee', 'employee')
      .leftJoinAndSelect('patrol.shop', 'shop')
      .leftJoinAndSelect('patrol.route', 'route')
      .leftJoinAndSelect('patrol.schedule', 'schedule');
  }
}

function incidentTypesBySeverity(severity: AlertSeverity): PatrolIncidentType[] {
  if (severity === 'critical') {
    return [
      PatrolIncidentType.MISSED_POINT,
      PatrolIncidentType.PATROL_OVERDUE,
      PatrolIncidentType.ROUTE_SUSPICIOUSLY_FAST,
    ];
  }

  if (severity === 'warning') {
    return [
      PatrolIncidentType.LONG_INTERVAL,
      PatrolIncidentType.POINT_DWELL_TOO_SHORT,
      PatrolIncidentType.ROUTE_TOO_FAST,
      PatrolIncidentType.ROUTE_TOO_SLOW,
      PatrolIncidentType.SCHEDULE_DEVIATION,
      PatrolIncidentType.SHORT_INTERVAL,
    ];
  }

  return [];
}

function parseIncidentSort(
  sort: FindControlIncidentsQuery['sort'],
): ['createdAt' | 'type', 'ASC' | 'DESC'] {
  if (sort === undefined) {
    return ['createdAt', 'DESC'];
  }

  const [field, direction] = sort.split(':');
  return [field as 'createdAt' | 'type', direction === 'asc' ? 'ASC' : 'DESC'];
}
