import { Injectable } from '@nestjs/common';
import {
  AlertSeverity,
  FindControlPatrolsDto,
  PatrolIncidentType,
  PatrolPointVisitStatus,
  PatrolReportStatus,
  PatrolReportType,
  PatrolRouteCategory,
  PatrolScanAction,
  PatrolStatus,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../../common/errors/not-found.error';
import { PatrolEventEntity } from '../../patrols/entities/patrol-event.entity';
import { PatrolEntity } from '../../patrols/entities/patrol.entity';
import {
  ControlPatrolListRecord,
  ControlPatrolsRepository,
  FindControlPatrolsQuery,
} from './control-patrols.repository';

type ControlVisitEvent = {
  accepted: boolean;
  deviceId: string;
  id: string;
  lateSync: boolean;
  nfcUid: string;
  scannedAt: string;
} | null;

type ControlPatrolSummary = {
  completedAt: string | null;
  dueAt: string | null;
  durationIsFinal: boolean;
  durationSeconds: number | null;
  employee: { fullName: string | null; id: string };
  expectedSeconds: number | null;
  id: string;
  incidentCount: number;
  period: string | null;
  progress: { scannedPoints: number; totalPoints: number };
  reportCount: number;
  route: { category: PatrolRouteCategory | null; id: string | null; name: string | null };
  scheduleId: string | null;
  shop: { id: string; name: string | null };
  startedAt: string | null;
  status: PatrolStatus;
};

type ControlPatrolDetail = ControlPatrolSummary & {
  cancellationReason: string | null;
  completionReport: string | null;
  events: Array<{
    accepted: boolean;
    deviceId: string;
    gpsAccuracy: number | null;
    id: string;
    isSuspicious: boolean;
    lateSync: boolean;
    lat: number | null;
    lng: number | null;
    nfcUid: string;
    patrolPoint: { id: string; name: string; sortOrder: number } | null;
    receivedAt: string;
    rejectionReason: string | null;
    scanAction: PatrolScanAction;
    scannedAt: string;
    suspicionReason: string | null;
  }>;
  incidents: Array<{
    actualSeconds: number | null;
    createdAt: string;
    expectedSeconds: number | null;
    id: string;
    message: string;
    severity: AlertSeverity;
    type: PatrolIncidentType;
  }>;
  notes: string | null;
  reports: Array<{
    fileCount: number;
    id: string;
    reportType: PatrolReportType;
    status: PatrolReportStatus;
    submittedAt: string | null;
  }>;
  timingProfile: {
    averageTotalSeconds: number;
    calculatedFrom: string;
    calculatedTo: string;
    fastSeconds: number;
    sampleCount: number;
    slowSeconds: number;
    suspiciousFastSeconds: number;
  } | null;
  visits: Array<{
    arrivedAt: string;
    arrivalEvent: ControlVisitEvent;
    departedAt: string | null;
    departureEvent: ControlVisitEvent;
    dwellSeconds: number | null;
    id: string;
    lockedUntil: string;
    patrolPoint: { id: string; name: string; sortOrder: number } | null;
    status: PatrolPointVisitStatus;
  }>;
};

type PaginatedControlPatrols = {
  items: ControlPatrolSummary[];
  limit: number;
  page: number;
  total: number;
};

@Injectable()
export class ControlPatrolsService {
  constructor(private readonly repository: ControlPatrolsRepository) {}

  async findMany(
    query: FindControlPatrolsDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedControlPatrols> {
    const repositoryQuery = buildFindQuery(query, actor);
    const [records, total] = await this.repository.findMany(repositoryQuery);

    return {
      items: records.map(toSummary),
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  async findOne(id: string, actor: AuthenticatedUser): Promise<ControlPatrolDetail> {
    assertCanUseControlPatrols(actor);
    const patrol = await this.repository.findById(id);

    if (patrol === null) {
      throw new EntityNotFoundError('Patrol', id);
    }

    assertCanAccessShop(actor, patrol.shopId);
    const [events, visits, incidents, reports, timingProfile] = await Promise.all([
      this.repository.findEvents(id),
      this.repository.findVisits(id),
      this.repository.findIncidents(id),
      this.repository.findReports(id),
      this.repository.findTimingProfile(patrol.routeId),
    ]);

    const summary = toSummary({
      expectedSeconds: timingProfile?.averageTotalSeconds ?? null,
      incidentCount: incidents.length,
      patrol,
      reportCount: reports.length,
    });

    return {
      ...summary,
      cancellationReason: patrol.cancellationReason ?? null,
      completionReport: patrol.completionReport ?? null,
      events: events.map(toEvent),
      incidents: incidents.map((incident) => ({
        actualSeconds: incident.actualSeconds ?? null,
        createdAt: incident.createdAt.toISOString(),
        expectedSeconds: incident.expectedSeconds ?? null,
        id: incident.id,
        message: incident.message,
        severity: severityByIncidentType(incident.type),
        type: incident.type,
      })),
      notes: patrol.notes ?? null,
      reports: reports.map((report) => ({
        fileCount: report.files?.length ?? 0,
        id: report.id,
        reportType: report.reportType,
        status: report.status,
        submittedAt: report.submittedAt?.toISOString() ?? null,
      })),
      timingProfile:
        timingProfile === null
          ? null
          : {
              averageTotalSeconds: timingProfile.averageTotalSeconds,
              calculatedFrom: timingProfile.calculatedFrom.toISOString(),
              calculatedTo: timingProfile.calculatedTo.toISOString(),
              fastSeconds: timingProfile.fastSeconds,
              sampleCount: timingProfile.sampleCount,
              slowSeconds: timingProfile.slowSeconds,
              suspiciousFastSeconds: timingProfile.suspiciousFastSeconds,
            },
      visits: visits.map((visit) => ({
        arrivedAt: visit.arrivedAt.toISOString(),
        arrivalEvent: toVisitEvent(visit.arrivalEvent),
        departedAt: visit.departedAt?.toISOString() ?? null,
        departureEvent: toVisitEvent(visit.departureEvent),
        dwellSeconds: visit.dwellSeconds ?? null,
        id: visit.id,
        lockedUntil: visit.lockedUntil.toISOString(),
        patrolPoint:
          visit.patrolPoint === undefined
            ? null
            : {
                id: visit.patrolPoint.id,
                name: visit.patrolPoint.name,
                sortOrder: visit.patrolPoint.sortOrder,
              },
        status: visit.status,
      })),
    };
  }
}

function buildFindQuery(
  query: FindControlPatrolsDto,
  actor: AuthenticatedUser,
): FindControlPatrolsQuery {
  assertCanUseControlPatrols(actor);
  if (query.shopId !== undefined) assertCanAccessShop(actor, query.shopId);

  const allowedShopIds = actor.role === 'inspector' ? getInspectorShopIds(actor) : undefined;
  if (actor.role === 'inspector' && allowedShopIds?.length === 0) {
    throw new DomainValidationError(
      'CONTROL_PATROLS_FORBIDDEN',
      'Inspector must be assigned to a shop to view patrols',
    );
  }

  return {
    allowedShopIds,
    employeeId: query.employeeId,
    from: query.from === undefined ? undefined : new Date(query.from),
    limit: query.limit,
    page: query.page,
    routeId: query.routeId,
    search: query.search,
    shopId: query.shopId,
    sort: query.sort,
    status: query.status,
    to: query.to === undefined ? undefined : new Date(query.to),
  };
}

function toSummary(record: ControlPatrolListRecord): ControlPatrolSummary {
  const patrol = record.patrol;
  const duration = calculateDuration(patrol);
  return {
    completedAt: patrol.completedAt?.toISOString() ?? null,
    dueAt: patrol.dueAt?.toISOString() ?? null,
    durationIsFinal: duration.isFinal,
    durationSeconds: duration.seconds,
    employee: { fullName: patrol.employee?.fullName ?? null, id: patrol.employeeId },
    expectedSeconds: record.expectedSeconds,
    id: patrol.id,
    incidentCount: record.incidentCount,
    period: patrol.schedule?.period ?? null,
    progress: { scannedPoints: patrol.scannedPoints, totalPoints: patrol.totalPoints },
    reportCount: record.reportCount,
    route: {
      category: patrol.route?.category ?? null,
      id: patrol.routeId ?? null,
      name: patrol.route?.name ?? null,
    },
    scheduleId: patrol.scheduleId ?? null,
    shop: { id: patrol.shopId, name: patrol.shop?.name ?? null },
    startedAt: patrol.startedAt?.toISOString() ?? null,
    status: patrol.status,
  };
}

function calculateDuration(patrol: PatrolEntity): { isFinal: boolean; seconds: number | null } {
  if (patrol.startedAt == null) return { isFinal: false, seconds: null };
  const finalAt = patrol.completedAt ?? patrol.cancelledAt;
  const end = finalAt ?? new Date();
  return {
    isFinal: finalAt != null,
    seconds: Math.max(0, Math.round((end.getTime() - patrol.startedAt.getTime()) / 1000)),
  };
}

function toEvent(event: PatrolEventEntity): ControlPatrolDetail['events'][number] {
  return {
    accepted: event.accepted,
    deviceId: event.deviceId,
    gpsAccuracy: event.gpsAccuracy ?? null,
    id: event.id,
    isSuspicious: event.isSuspicious,
    lateSync: event.lateSync,
    lat: event.lat === undefined ? null : Number(event.lat),
    lng: event.lng === undefined ? null : Number(event.lng),
    nfcUid: event.nfcUid,
    patrolPoint:
      event.patrolPoint === undefined
        ? null
        : {
            id: event.patrolPoint.id,
            name: event.patrolPoint.name,
            sortOrder: event.patrolPoint.sortOrder,
          },
    receivedAt: event.receivedAt.toISOString(),
    rejectionReason: event.rejectionReason ?? null,
    scanAction: event.scanAction,
    scannedAt: event.scannedAt.toISOString(),
    suspicionReason: event.suspicionReason ?? null,
  };
}

function toVisitEvent(event: PatrolEventEntity | null | undefined): ControlVisitEvent {
  return event == null
    ? null
    : {
        accepted: event.accepted,
        deviceId: event.deviceId,
        id: event.id,
        lateSync: event.lateSync,
        nfcUid: event.nfcUid,
        scannedAt: event.scannedAt.toISOString(),
      };
}

function severityByIncidentType(type: PatrolIncidentType): AlertSeverity {
  return type === PatrolIncidentType.MISSED_POINT ||
    type === PatrolIncidentType.PATROL_OVERDUE ||
    type === PatrolIncidentType.ROUTE_SUSPICIOUSLY_FAST
    ? 'critical'
    : 'warning';
}

function assertCanUseControlPatrols(actor: AuthenticatedUser): void {
  if (actor.role !== 'admin' && actor.role !== 'inspector') {
    throw new DomainValidationError(
      'CONTROL_PATROLS_FORBIDDEN',
      'User cannot access control patrols',
    );
  }
}

function assertCanAccessShop(actor: AuthenticatedUser, shopId: string): void {
  if (actor.role === 'admin') return;
  if (actor.role !== 'inspector' || !getInspectorShopIds(actor).includes(shopId)) {
    throw new DomainValidationError(
      'CONTROL_PATROLS_FORBIDDEN',
      'User cannot access patrols for this shop',
    );
  }
}

function getInspectorShopIds(actor: AuthenticatedUser): string[] {
  return actor.shopIds ?? (actor.shopId === undefined ? [] : [actor.shopId]);
}
