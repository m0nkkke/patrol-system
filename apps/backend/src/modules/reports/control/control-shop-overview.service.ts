import {
  AlertSeverity,
  PatrolIncidentType,
  PatrolReportStatus,
  PatrolReportType,
  PatrolRouteCategory,
  PatrolStatus,
  UserRole,
} from '@patrol/shared';
import { Injectable } from '@nestjs/common';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../../common/errors/not-found.error';
import { PatrolIncidentEntity } from '../../patrols/entities/patrol-incident.entity';
import { PatrolEntity } from '../../patrols/entities/patrol.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { PatrolReportEntity } from '../entities/patrol-report.entity';
import {
  ControlShopOverviewRepository,
  isCriticalIncidentType,
} from './control-shop-overview.repository';

const OVERVIEW_LOOKBACK_DAYS = 14;
const RECENT_ITEMS_LIMIT = 10;

type ControlShopOverview = {
  generatedAt: string;
  period: {
    from: string;
    to: string;
  };
  recentIncidents: ControlShopIncidentSummary[];
  recentPatrols: ControlShopPatrolSummary[];
  recentReports: ControlShopReportSummary[];
  reportSummary: Array<{
    count: number;
    reportType: PatrolReportType;
    status: PatrolReportStatus;
  }>;
  shop: {
    address: string | null;
    externalId: string | null;
    id: string;
    isActive: boolean;
    name: string;
    regionId: string | null;
    regionName: string | null;
    routeRegisteredPoints: number;
    routeStatus: string;
    timezone: string;
  };
  staff: Array<{
    fullName: string;
    id: string;
    isActive: boolean;
    primaryShopId: string | null;
    role: UserRole;
  }>;
  stats: {
    cancelledPatrols: number;
    completedPatrols: number;
    completionRate: number;
    incidentCount: number;
    overduePatrols: number;
    totalPatrols: number;
  };
};

type ControlShopPatrolSummary = {
  completedAt: string | null;
  dueAt: string | null;
  employee: {
    fullName: string | null;
    id: string;
  };
  id: string;
  route: {
    category: PatrolRouteCategory | null;
    id: string | null;
    name: string | null;
  };
  scannedPoints: number;
  scheduleId: string | null;
  startedAt: string | null;
  status: PatrolStatus;
  totalPoints: number;
};

type ControlShopIncidentSummary = {
  actualSeconds: number | null;
  createdAt: string;
  expectedSeconds: number | null;
  id: string;
  message: string;
  patrolId: string;
  severity: AlertSeverity;
  type: PatrolIncidentType;
};

type ControlShopReportSummary = {
  createdAt: string;
  employee: {
    fullName: string | null;
    id: string;
  };
  fileCount: number;
  id: string;
  reportType: PatrolReportType;
  status: PatrolReportStatus;
  submittedAt: string | null;
};

@Injectable()
export class ControlShopOverviewService {
  constructor(private readonly repository: ControlShopOverviewRepository) {}

  async getOverview(shopId: string, actor: AuthenticatedUser): Promise<ControlShopOverview> {
    assertCanAccessControlShop(actor, shopId);

    const shop = await this.repository.findShopById(shopId);

    if (shop === null) {
      throw new EntityNotFoundError('Shop', shopId);
    }

    const to = new Date();
    const from = new Date(to.getTime() - OVERVIEW_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
    const [stats, staff, recentPatrols, recentIncidents, recentReports, reportSummary] =
      await Promise.all([
        this.repository.getOverviewStats(shopId, from),
        this.repository.findAssignedStaff(shopId),
        this.repository.findRecentPatrols(shopId, RECENT_ITEMS_LIMIT),
        this.repository.findRecentIncidents(shopId, RECENT_ITEMS_LIMIT),
        this.repository.findRecentReports(shopId, RECENT_ITEMS_LIMIT),
        this.repository.getReportSummary(shopId, from),
      ]);

    const totalPatrols = Number(stats.totalPatrols);
    const completedPatrols = Number(stats.completedPatrols);

    return {
      generatedAt: to.toISOString(),
      period: {
        from: from.toISOString(),
        to: to.toISOString(),
      },
      recentIncidents: recentIncidents.map(toIncidentSummary),
      recentPatrols: recentPatrols.map(toPatrolSummary),
      recentReports: recentReports.map(toReportSummary),
      reportSummary: reportSummary.map((item) => ({
        count: Number(item.count),
        reportType: item.reportType,
        status: item.status,
      })),
      shop: {
        address: shop.address ?? null,
        externalId: shop.externalId ?? null,
        id: shop.id,
        isActive: shop.isActive,
        name: shop.name,
        regionId: shop.regionId ?? null,
        regionName: shop.region?.name ?? null,
        routeRegisteredPoints: shop.routeRegisteredPoints,
        routeStatus: shop.routeStatus,
        timezone: shop.timezone,
      },
      staff: staff.map(toStaffSummary),
      stats: {
        cancelledPatrols: Number(stats.cancelledPatrols),
        completedPatrols,
        completionRate: totalPatrols === 0 ? 0 : roundRate(completedPatrols / totalPatrols),
        incidentCount: Number(stats.incidentCount),
        overduePatrols: Number(stats.overduePatrols),
        totalPatrols,
      },
    };
  }
}

function toStaffSummary(user: UserEntity): ControlShopOverview['staff'][number] {
  return {
    fullName: user.fullName,
    id: user.id,
    isActive: user.isActive,
    primaryShopId: user.shopId ?? null,
    role: user.role,
  };
}

function toPatrolSummary(patrol: PatrolEntity): ControlShopPatrolSummary {
  return {
    completedAt: patrol.completedAt?.toISOString() ?? null,
    dueAt: patrol.dueAt?.toISOString() ?? null,
    employee: {
      fullName: patrol.employee?.fullName ?? null,
      id: patrol.employeeId,
    },
    id: patrol.id,
    route: {
      category: patrol.route?.category ?? null,
      id: patrol.routeId ?? null,
      name: patrol.route?.name ?? null,
    },
    scannedPoints: patrol.scannedPoints,
    scheduleId: patrol.scheduleId ?? null,
    startedAt: patrol.startedAt?.toISOString() ?? null,
    status: patrol.status,
    totalPoints: patrol.totalPoints,
  };
}

function toIncidentSummary(incident: PatrolIncidentEntity): ControlShopIncidentSummary {
  return {
    actualSeconds: incident.actualSeconds ?? null,
    createdAt: incident.createdAt.toISOString(),
    expectedSeconds: incident.expectedSeconds ?? null,
    id: incident.id,
    message: incident.message,
    patrolId: incident.patrolId,
    severity: isCriticalIncidentType(incident.type) ? 'critical' : 'warning',
    type: incident.type,
  };
}

function toReportSummary(report: PatrolReportEntity): ControlShopReportSummary {
  return {
    createdAt: report.createdAt.toISOString(),
    employee: {
      fullName: report.employee?.fullName ?? null,
      id: report.employeeId,
    },
    fileCount: report.files?.length ?? 0,
    id: report.id,
    reportType: report.reportType,
    status: report.status,
    submittedAt: report.submittedAt?.toISOString() ?? null,
  };
}

function assertCanAccessControlShop(actor: AuthenticatedUser, shopId: string): void {
  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'inspector' || !actorHasShop(actor, shopId)) {
    throw new DomainValidationError(
      'CONTROL_SHOP_OVERVIEW_FORBIDDEN',
      'User cannot access control shop overview for this shop',
    );
  }
}

function actorHasShop(actor: AuthenticatedUser, shopId: string): boolean {
  return actor.shopId === shopId || actor.shopIds?.includes(shopId) === true;
}

function roundRate(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
