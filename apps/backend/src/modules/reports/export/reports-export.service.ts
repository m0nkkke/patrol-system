import { Injectable } from '@nestjs/common';
import {
  FindPatrolIncidentsDto,
  FindPatrolReportsDto,
  ManagementBreakdownQueryDto,
  ManagementMetricsQueryDto,
  ManagementScorecardsQueryDto,
  ManagementTrendsQueryDto,
} from '@patrol/shared';
import { Workbook } from 'exceljs';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { ControlIncidentsService } from '../control/control-incidents.service';
import { ManagementBreakdownService } from '../management/management-breakdown.service';
import { ManagementMetricsService } from '../management/management-metrics.service';
import { ManagementScorecardsService } from '../management/management-scorecards.service';
import { ManagementTrendsService } from '../management/management-trends.service';
import { ReportsService } from '../operational/reports.service';

type ExportFile = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

type ExportRow = Record<string, string | number | null>;

@Injectable()
export class ReportsExportService {
  constructor(
    private readonly controlIncidentsService: ControlIncidentsService,
    private readonly managementBreakdownService: ManagementBreakdownService,
    private readonly managementMetricsService: ManagementMetricsService,
    private readonly managementScorecardsService: ManagementScorecardsService,
    private readonly managementTrendsService: ManagementTrendsService,
    private readonly reportsService: ReportsService,
  ) {}

  async exportControlIncidentsCsv(
    query: FindPatrolIncidentsDto,
    actor: AuthenticatedUser,
  ): Promise<ExportFile> {
    const incidents = await this.controlIncidentsService.findForControlExport(query, actor);
    const rows = incidents.map(flattenControlIncident);

    return {
      buffer: Buffer.from(toCsv(rows), 'utf8'),
      contentType: 'text/csv; charset=utf-8',
      filename: 'control-incidents.csv',
    };
  }

  async exportControlIncidentsXlsx(
    query: FindPatrolIncidentsDto,
    actor: AuthenticatedUser,
  ): Promise<ExportFile> {
    const incidents = await this.controlIncidentsService.findForControlExport(query, actor);
    const rows = incidents.map(flattenControlIncident);

    return {
      buffer: await toXlsx('Control Incidents', rows),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'control-incidents.xlsx',
    };
  }

  async exportControlReportsCsv(
    query: FindPatrolReportsDto,
    actor: AuthenticatedUser,
  ): Promise<ExportFile> {
    const reports = await this.reportsService.findForControlExport(query, actor);
    const rows = reports.map((report) => ({
      cancellationReason: report.cancellationReason ?? null,
      comment: report.comment ?? null,
      createdAt: report.createdAt.toISOString(),
      employeeFullName: report.employee?.fullName ?? null,
      fileCount: report.files?.length ?? 0,
      id: report.id,
      patrolId: report.patrolId ?? null,
      period: report.period ?? null,
      reportType: report.reportType,
      routeId: report.routeId ?? null,
      scheduleId: report.scheduleId ?? null,
      shopName: report.shop?.name ?? report.shopId,
      status: report.status,
      submittedAt: report.submittedAt?.toISOString() ?? null,
    }));

    return {
      buffer: Buffer.from(toCsv(rows), 'utf8'),
      contentType: 'text/csv; charset=utf-8',
      filename: 'control-reports.csv',
    };
  }

  async exportControlReportsXlsx(
    query: FindPatrolReportsDto,
    actor: AuthenticatedUser,
  ): Promise<ExportFile> {
    const reports = await this.reportsService.findForControlExport(query, actor);
    const rows = reports.map((report) => ({
      cancellationReason: report.cancellationReason ?? null,
      comment: report.comment ?? null,
      createdAt: report.createdAt.toISOString(),
      employeeFullName: report.employee?.fullName ?? null,
      fileCount: report.files?.length ?? 0,
      id: report.id,
      patrolId: report.patrolId ?? null,
      period: report.period ?? null,
      reportType: report.reportType,
      routeId: report.routeId ?? null,
      scheduleId: report.scheduleId ?? null,
      shopName: report.shop?.name ?? report.shopId,
      status: report.status,
      submittedAt: report.submittedAt?.toISOString() ?? null,
    }));

    return {
      buffer: await toXlsx('Control Reports', rows),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'control-reports.xlsx',
    };
  }

  async exportManagementMetricsCsv(
    query: ManagementMetricsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ExportFile> {
    const metrics = await this.managementMetricsService.getMetrics(query, actor);
    const rows = [flattenManagementMetrics(metrics)];

    return {
      buffer: Buffer.from(toCsv(rows), 'utf8'),
      contentType: 'text/csv; charset=utf-8',
      filename: 'management-metrics.csv',
    };
  }

  async exportManagementMetricsXlsx(
    query: ManagementMetricsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ExportFile> {
    const metrics = await this.managementMetricsService.getMetrics(query, actor);
    const rows = [flattenManagementMetrics(metrics)];

    return {
      buffer: await toXlsx('Management Metrics', rows),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'management-metrics.xlsx',
    };
  }

  async exportManagementBreakdownCsv(
    query: ManagementBreakdownQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ExportFile> {
    const breakdown = await this.managementBreakdownService.getBreakdown(query, actor);
    const rows = breakdown.items.map((item) => flattenManagementBreakdown(breakdown, item));

    return {
      buffer: Buffer.from(toCsv(rows), 'utf8'),
      contentType: 'text/csv; charset=utf-8',
      filename: 'management-breakdown.csv',
    };
  }

  async exportManagementBreakdownXlsx(
    query: ManagementBreakdownQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ExportFile> {
    const breakdown = await this.managementBreakdownService.getBreakdown(query, actor);
    const rows = breakdown.items.map((item) => flattenManagementBreakdown(breakdown, item));

    return {
      buffer: await toXlsx('Management Breakdown', rows),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'management-breakdown.xlsx',
    };
  }

  async exportManagementShopScorecardsCsv(
    query: ManagementScorecardsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ExportFile> {
    const scorecards = await this.managementScorecardsService.getShopScorecardsForExport(
      query,
      actor,
    );
    const rows = scorecards.items.map((item) => flattenManagementShopScorecard(scorecards, item));

    return {
      buffer: Buffer.from(toCsv(rows), 'utf8'),
      contentType: 'text/csv; charset=utf-8',
      filename: 'management-shop-scorecards.csv',
    };
  }

  async exportManagementShopScorecardsXlsx(
    query: ManagementScorecardsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ExportFile> {
    const scorecards = await this.managementScorecardsService.getShopScorecardsForExport(
      query,
      actor,
    );
    const rows = scorecards.items.map((item) => flattenManagementShopScorecard(scorecards, item));

    return {
      buffer: await toXlsx('Shop Scorecards', rows),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'management-shop-scorecards.xlsx',
    };
  }

  async exportManagementTrendsCsv(
    query: ManagementTrendsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ExportFile> {
    const trends = await this.managementTrendsService.getTrends(query, actor);
    const rows = trends.items.map((item) => flattenManagementTrend(trends, item));

    return {
      buffer: Buffer.from(toCsv(rows), 'utf8'),
      contentType: 'text/csv; charset=utf-8',
      filename: 'management-trends.csv',
    };
  }

  async exportManagementTrendsXlsx(
    query: ManagementTrendsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ExportFile> {
    const trends = await this.managementTrendsService.getTrends(query, actor);
    const rows = trends.items.map((item) => flattenManagementTrend(trends, item));

    return {
      buffer: await toXlsx('Management Trends', rows),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: 'management-trends.xlsx',
    };
  }
}

function flattenManagementMetrics(
  metrics: Awaited<ReturnType<ManagementMetricsService['getMetrics']>>,
): ExportRow {
  return {
    attentionPatrols: metrics.metrics.attentionPatrols,
    attentionRate: metrics.metrics.attentionRate,
    attentionShopCount: metrics.metrics.attentionShopCount,
    averageCompletionSeconds: metrics.metrics.averageCompletionSeconds,
    cleanPatrolRate: metrics.metrics.cleanPatrolRate,
    cleanPatrols: metrics.metrics.cleanPatrols,
    completedPatrols: metrics.metrics.completedPatrols,
    completionRate: metrics.metrics.completionRate,
    from: metrics.period.from,
    greenShopCount: metrics.metrics.greenShopCount,
    onTimePatrols: metrics.metrics.onTimePatrols,
    onTimeRate: metrics.metrics.onTimeRate,
    registeredPatrols: metrics.metrics.registeredPatrols,
    regionId: metrics.scope.regionId,
    shopId: metrics.scope.shopId,
    sourceService: metrics.sourceService,
    submittedReports: metrics.metrics.submittedReports,
    to: metrics.period.to,
  };
}

function flattenControlIncident(
  incident: Awaited<ReturnType<ControlIncidentsService['findForControlExport']>>[number],
): ExportRow {
  return {
    actualSeconds: incident.actualSeconds,
    createdAt: incident.createdAt,
    employeeFullName: incident.employee.fullName,
    employeeId: incident.employee.id,
    expectedSeconds: incident.expectedSeconds,
    fromPatrolPointName: incident.fromPatrolPoint?.name ?? null,
    fromPatrolPointSortOrder: incident.fromPatrolPoint?.sortOrder ?? null,
    id: incident.id,
    message: incident.message,
    patrolCompletedAt: incident.patrol.completedAt,
    patrolDueAt: incident.patrol.dueAt,
    patrolEventDeviceId: incident.patrolEvent?.deviceId ?? null,
    patrolEventId: incident.patrolEvent?.id ?? null,
    patrolEventLateSync: incident.patrolEvent === null ? null : Number(incident.patrolEvent.lateSync),
    patrolEventNfcUid: incident.patrolEvent?.nfcUid ?? null,
    patrolEventScannedAt: incident.patrolEvent?.scannedAt ?? null,
    patrolId: incident.patrol.id,
    patrolPeriod: incident.patrol.period,
    patrolRouteCategory: incident.patrol.routeCategory,
    patrolRouteId: incident.patrol.routeId,
    patrolRouteName: incident.patrol.routeName,
    patrolScheduleId: incident.patrol.scheduleId,
    patrolStartedAt: incident.patrol.startedAt,
    patrolStatus: incident.patrol.status,
    severity: incident.severity,
    shopId: incident.shop.id,
    shopName: incident.shop.name,
    toPatrolPointName: incident.toPatrolPoint?.name ?? null,
    toPatrolPointSortOrder: incident.toPatrolPoint?.sortOrder ?? null,
    type: incident.type,
  };
}

function flattenManagementBreakdown(
  response: Awaited<ReturnType<ManagementBreakdownService['getBreakdown']>>,
  item: Awaited<ReturnType<ManagementBreakdownService['getBreakdown']>>['items'][number],
): ExportRow {
  return {
    attentionPatrols: item.metrics.attentionPatrols,
    attentionRate: item.metrics.attentionRate,
    averageCompletionSeconds: item.metrics.averageCompletionSeconds,
    cleanPatrolRate: item.metrics.cleanPatrolRate,
    cleanPatrols: item.metrics.cleanPatrols,
    completedPatrols: item.metrics.completedPatrols,
    completionRate: item.metrics.completionRate,
    from: response.period.from,
    groupBy: response.groupBy,
    groupKey: item.groupKey,
    onTimePatrols: item.metrics.onTimePatrols,
    onTimeRate: item.metrics.onTimeRate,
    registeredPatrols: item.metrics.registeredPatrols,
    regionId: response.scope.regionId,
    shopId: response.scope.shopId,
    sourceService: response.sourceService,
    submittedReports: item.metrics.submittedReports,
    to: response.period.to,
  };
}

function flattenManagementShopScorecard(
  response: Awaited<ReturnType<ManagementScorecardsService['getShopScorecards']>>,
  item: Awaited<ReturnType<ManagementScorecardsService['getShopScorecards']>>['items'][number],
): ExportRow {
  return {
    attentionPatrols: item.metrics.attentionPatrols,
    attentionRate: item.metrics.attentionRate,
    averageCompletionSeconds: item.metrics.averageCompletionSeconds,
    cleanPatrolRate: item.metrics.cleanPatrolRate,
    cleanPatrols: item.metrics.cleanPatrols,
    completedPatrols: item.metrics.completedPatrols,
    completionRate: item.metrics.completionRate,
    from: response.period.from,
    onTimePatrols: item.metrics.onTimePatrols,
    onTimeRate: item.metrics.onTimeRate,
    registeredPatrols: item.metrics.registeredPatrols,
    regionId: item.regionId,
    shopId: item.shopId,
    shopName: item.shopName,
    sourceService: response.sourceService,
    status: item.status,
    submittedReports: item.metrics.submittedReports,
    to: response.period.to,
  };
}

function flattenManagementTrend(
  response: Awaited<ReturnType<ManagementTrendsService['getTrends']>>,
  item: Awaited<ReturnType<ManagementTrendsService['getTrends']>>['items'][number],
): ExportRow {
  return {
    attentionPatrols: item.metrics.attentionPatrols,
    attentionRate: item.metrics.attentionRate,
    averageCompletionSeconds: item.metrics.averageCompletionSeconds,
    bucket: response.bucket,
    bucketStart: item.bucketStart,
    cleanPatrolRate: item.metrics.cleanPatrolRate,
    cleanPatrols: item.metrics.cleanPatrols,
    completedPatrols: item.metrics.completedPatrols,
    completionRate: item.metrics.completionRate,
    from: response.period.from,
    onTimePatrols: item.metrics.onTimePatrols,
    onTimeRate: item.metrics.onTimeRate,
    registeredPatrols: item.metrics.registeredPatrols,
    regionId: response.scope.regionId,
    shopId: response.scope.shopId,
    sourceService: response.sourceService,
    submittedReports: item.metrics.submittedReports,
    to: response.period.to,
  };
}

function toCsv(rows: ExportRow[]): string {
  if (rows.length === 0) {
    return '';
  }

  const headers = Object.keys(rows[0] ?? {});
  return [
    headers.map(escapeCsvValue).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header])).join(',')),
  ].join('\n');
}

function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

async function toXlsx(sheetName: string, rows: ExportRow[]): Promise<Buffer> {
  const workbook = new Workbook();
  const worksheet = workbook.addWorksheet(sheetName);
  const headers = Object.keys(rows[0] ?? {});
  worksheet.columns = headers.map((header) => ({
    header,
    key: header,
    width: Math.max(header.length + 2, 16),
  }));

  for (const row of rows) {
    worksheet.addRow(row);
  }

  worksheet.getRow(1).font = { bold: true };
  const buffer = await workbook.xlsx.writeBuffer();

  return Buffer.from(buffer);
}
