import { Injectable } from '@nestjs/common';
import {
  AlertSeverity,
  FindPatrolIncidentsDto,
  PatrolIncidentType,
  PatrolRouteCategory,
  PatrolStatus,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../../common/errors/not-found.error';
import { PatrolIncidentEntity } from '../../patrols/entities/patrol-incident.entity';
import { ControlIncidentsRepository } from './control-incidents.repository';

type ControlIncidentResponse = {
  actualSeconds: number | null;
  createdAt: string;
  employee: {
    fullName: string | null;
    id: string;
  };
  expectedSeconds: number | null;
  fromPatrolPoint: {
    id: string;
    name: string;
    sortOrder: number;
  } | null;
  id: string;
  message: string;
  patrol: {
    completedAt: string | null;
    dueAt: string | null;
    id: string;
    period: string | null;
    routeCategory: PatrolRouteCategory | null;
    routeId: string | null;
    routeName: string | null;
    scheduleId: string | null;
    startedAt: string | null;
    status: PatrolStatus;
  };
  patrolEvent: {
    deviceId: string;
    id: string;
    lateSync: boolean;
    nfcUid: string;
    pointDeactivatedAfterScan: boolean;
    scannedAt: string;
  } | null;
  severity: AlertSeverity;
  shop: {
    id: string;
    name: string | null;
  };
  toPatrolPoint: {
    id: string;
    name: string;
    sortOrder: number;
  } | null;
  type: PatrolIncidentType;
};

type PaginatedControlIncidents = {
  items: ControlIncidentResponse[];
  limit: number;
  page: number;
  total: number;
};

@Injectable()
export class ControlIncidentsService {
  constructor(private readonly incidentsRepository: ControlIncidentsRepository) {}

  async findMany(
    query: FindPatrolIncidentsDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedControlIncidents> {
    const [items, total] = await this.incidentsRepository.findMany(
      buildFindQuery(query, actor),
    );

    return {
      items: items.map(toControlIncident),
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  async findOne(id: string, actor: AuthenticatedUser): Promise<ControlIncidentResponse> {
    assertCanUseControlIncidents(actor);

    const incident = await this.incidentsRepository.findById(id);

    if (incident === null) {
      throw new EntityNotFoundError('PatrolIncident', id);
    }

    assertCanAccessControlIncidentShop(actor, incident.shopId);

    return toControlIncident(incident);
  }

  async findForControlExport(
    query: FindPatrolIncidentsDto,
    actor: AuthenticatedUser,
  ): Promise<ControlIncidentResponse[]> {
    const [items] = await this.incidentsRepository.findMany(buildFindQuery(query, actor), {
      paginate: false,
    });

    return items.map(toControlIncident);
  }
}

function buildFindQuery(query: FindPatrolIncidentsDto, actor: AuthenticatedUser) {
  assertCanUseControlIncidents(actor);

  if (query.shopId !== undefined) {
    assertCanAccessControlIncidentShop(actor, query.shopId);
  }

  const allowedShopIds = actor.role === 'inspector' ? getInspectorShopIds(actor) : undefined;

  if (actor.role === 'inspector' && allowedShopIds?.length === 0) {
    throw new DomainValidationError(
      'CONTROL_INCIDENTS_FORBIDDEN',
      'Inspector must be assigned to a shop to view incidents',
    );
  }

  return {
    allowedShopIds,
    employeeId: query.employeeId,
    from: query.from === undefined ? undefined : new Date(query.from),
    limit: query.limit,
    page: query.page,
    patrolId: query.patrolId,
    search: query.search,
    severity: query.severity,
    shopId: query.shopId,
    sort: query.sort,
    to: query.to === undefined ? undefined : new Date(query.to),
    type: query.type,
  };
}

function toControlIncident(incident: PatrolIncidentEntity): ControlIncidentResponse {
  const patrol = incident.patrol;

  if (patrol === undefined) {
    throw new DomainValidationError(
      'CONTROL_INCIDENT_PATROL_MISSING',
      'Incident patrol relation is required',
    );
  }

  return {
    actualSeconds: incident.actualSeconds ?? null,
    createdAt: incident.createdAt.toISOString(),
    employee: {
      fullName: patrol.employee?.fullName ?? null,
      id: patrol.employeeId,
    },
    expectedSeconds: incident.expectedSeconds ?? null,
    fromPatrolPoint:
      incident.fromPatrolPoint == null
        ? null
        : {
            id: incident.fromPatrolPoint.id,
            name: incident.fromPatrolPoint.name,
            sortOrder: incident.fromPatrolPoint.sortOrder,
          },
    id: incident.id,
    message: incident.message,
    patrol: {
      completedAt: patrol.completedAt?.toISOString() ?? null,
      dueAt: patrol.dueAt?.toISOString() ?? null,
      id: incident.patrolId,
      period: patrol.schedule?.period ?? null,
      routeCategory: patrol.route?.category ?? null,
      routeId: patrol.routeId ?? null,
      routeName: patrol.route?.name ?? null,
      scheduleId: patrol.scheduleId ?? null,
      startedAt: patrol.startedAt?.toISOString() ?? null,
      status: patrol.status,
    },
    patrolEvent:
      incident.patrolEvent == null
        ? null
        : {
            deviceId: incident.patrolEvent.deviceId,
            id: incident.patrolEvent.id,
            lateSync: incident.patrolEvent.lateSync,
            nfcUid: incident.patrolEvent.nfcUid,
            pointDeactivatedAfterScan: incident.patrolEvent.pointDeactivatedAfterScan,
            scannedAt: incident.patrolEvent.scannedAt.toISOString(),
          },
    severity: severityByIncidentType(incident.type),
    shop: {
      id: incident.shopId,
      name: patrol.shop?.name ?? incident.shop?.name ?? null,
    },
    toPatrolPoint:
      incident.toPatrolPoint == null
        ? null
        : {
            id: incident.toPatrolPoint.id,
            name: incident.toPatrolPoint.name,
            sortOrder: incident.toPatrolPoint.sortOrder,
          },
    type: incident.type,
  };
}

function severityByIncidentType(type: PatrolIncidentType): AlertSeverity {
  return type === PatrolIncidentType.MISSED_POINT ||
    type === PatrolIncidentType.PATROL_OVERDUE ||
    type === PatrolIncidentType.ROUTE_SUSPICIOUSLY_FAST
    ? 'critical'
    : 'warning';
}

function assertCanUseControlIncidents(actor: AuthenticatedUser): void {
  if (actor.role !== 'admin' && actor.role !== 'inspector') {
    throw new DomainValidationError(
      'CONTROL_INCIDENTS_FORBIDDEN',
      'User cannot access control incidents',
    );
  }
}

function assertCanAccessControlIncidentShop(actor: AuthenticatedUser, shopId: string): void {
  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'inspector' || !actorHasShop(actor, shopId)) {
    throw new DomainValidationError(
      'CONTROL_INCIDENTS_FORBIDDEN',
      'User cannot access control incidents for this shop',
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
