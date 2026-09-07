import { ManagementMetricsService } from '../management/management-metrics.service';
import { ManagementScorecardsService } from '../management/management-scorecards.service';
import { ManagementBreakdownService } from '../management/management-breakdown.service';
import { ManagementTrendsService } from '../management/management-trends.service';
import { ControlIncidentsService } from '../control/control-incidents.service';
import { PatrolReportEntity } from '../entities/patrol-report.entity';
import { PatrolReportFileEntity } from '../entities/patrol-report-file.entity';
import { ReportsExportService } from '../export/reports-export.service';
import { ReportsService } from '../operational/reports.service';
import { ShopEntity } from '../../shops/entities/shop.entity';
import { UserEntity } from '../../users/entities/user.entity';

type ControlIncidentsServiceMock = Pick<ControlIncidentsService, 'findForControlExport'>;
type ManagementBreakdownServiceMock = Pick<ManagementBreakdownService, 'getBreakdown'>;
type ManagementMetricsServiceMock = Pick<ManagementMetricsService, 'getMetrics'>;
type ManagementScorecardsServiceMock = Pick<ManagementScorecardsService, 'getShopScorecardsForExport'>;
type ManagementTrendsServiceMock = Pick<ManagementTrendsService, 'getTrends'>;
type ReportsServiceMock = Pick<ReportsService, 'findForControlExport'>;

describe('ReportsExportService', () => {
  let controlIncidentsService: jest.Mocked<ControlIncidentsServiceMock>;
  let managementBreakdownService: jest.Mocked<ManagementBreakdownServiceMock>;
  let managementMetricsService: jest.Mocked<ManagementMetricsServiceMock>;
  let managementScorecardsService: jest.Mocked<ManagementScorecardsServiceMock>;
  let managementTrendsService: jest.Mocked<ManagementTrendsServiceMock>;
  let reportsService: jest.Mocked<ReportsServiceMock>;
  let service: ReportsExportService;

  beforeEach(() => {
    controlIncidentsService = {
      findForControlExport: jest.fn(),
    };
    managementBreakdownService = {
      getBreakdown: jest.fn(),
    };
    managementMetricsService = {
      getMetrics: jest.fn(),
    };
    managementScorecardsService = {
      getShopScorecardsForExport: jest.fn(),
    };
    managementTrendsService = {
      getTrends: jest.fn(),
    };
    reportsService = {
      findForControlExport: jest.fn(),
    };
    service = new ReportsExportService(
      controlIncidentsService as unknown as ControlIncidentsService,
      managementBreakdownService as unknown as ManagementBreakdownService,
      managementMetricsService as unknown as ManagementMetricsService,
      managementScorecardsService as unknown as ManagementScorecardsService,
      managementTrendsService as unknown as ManagementTrendsService,
      reportsService as unknown as ReportsService,
    );
  });

  it('exports control incidents as CSV with investigation details', async () => {
    controlIncidentsService.findForControlExport.mockResolvedValue([
      {
        actualSeconds: 30,
        createdAt: '2026-08-18T05:05:00.000Z',
        employee: {
          fullName: 'Ivan Petrov',
          id: 'employee-id',
        },
        expectedSeconds: 60,
        fromPatrolPoint: {
          id: 'from-point-id',
          name: 'Point 1',
          sortOrder: 1,
        },
        id: 'incident-id',
        message: 'Short interval',
        patrol: {
          completedAt: '2026-08-18T05:20:00.000Z',
          dueAt: '2026-08-18T05:30:00.000Z',
          id: 'patrol-id',
          period: 'morning',
          routeCategory: 'internal',
          routeId: 'route-id',
          routeName: 'Route 1',
          scheduleId: 'schedule-id',
          startedAt: '2026-08-18T05:00:00.000Z',
          status: 'completed',
        },
        patrolEvent: {
          deviceId: 'device-id',
          id: 'event-id',
          lateSync: false,
          nfcUid: '04aabbcc',
          pointDeactivatedAfterScan: false,
          scannedAt: '2026-08-18T05:05:00.000Z',
        },
        severity: 'warning',
        shop: {
          id: 'shop-id',
          name: 'Shop 1',
        },
        toPatrolPoint: {
          id: 'to-point-id',
          name: 'Point 2',
          sortOrder: 2,
        },
        type: 'short_interval',
      },
    ]);

    const result = await service.exportControlIncidentsCsv(
      { limit: 20, page: 1 },
      {
        fullName: 'Inspector',
        id: 'inspector-id',
        role: 'inspector',
        username: 'inspector',
      },
    );

    expect(result.filename).toBe('control-incidents.csv');
    expect(result.buffer.toString('utf8')).toContain('employeeFullName');
    expect(result.buffer.toString('utf8')).toContain('Ivan Petrov');
    expect(result.buffer.toString('utf8')).toContain('Short interval');
  });

  it('exports detailed control reports as CSV', async () => {
    reportsService.findForControlExport.mockResolvedValue([
      createReport({
        comment: 'Needs review',
        employee: { fullName: 'Ivan Petrov' } as UserEntity,
        files: [{ id: 'report-file-id' } as PatrolReportFileEntity],
        shop: { name: 'Shop 1' } as ShopEntity,
      }),
    ]);

    const result = await service.exportControlReportsCsv(
      { limit: 20, page: 1 },
      {
        fullName: 'Inspector',
        id: 'inspector-id',
        role: 'inspector',
        username: 'inspector',
      },
    );

    expect(result.contentType).toBe('text/csv; charset=utf-8');
    expect(result.filename).toBe('control-reports.csv');
    expect(result.buffer.toString('utf8')).toContain('employeeFullName');
    expect(result.buffer.toString('utf8')).toContain('Ivan Petrov');
    expect(result.buffer.toString('utf8')).toContain('Needs review');
  });

  it('exports management metrics as CSV without personal details', async () => {
    managementMetricsService.getMetrics.mockResolvedValue({
      metrics: {
        attentionPatrols: 1,
        attentionRate: 0.1,
        attentionShopCount: 1,
        averageCompletionSeconds: 600,
        cleanPatrolRate: 0.9,
        cleanPatrols: 9,
        completedPatrols: 10,
        completionRate: 1,
        greenShopCount: 5,
        onTimePatrols: 8,
        onTimeRate: 0.8,
        registeredPatrols: 10,
        submittedReports: 4,
      },
      period: { from: null, to: null },
      schemaVersion: '2.0',
      scope: { regionId: null, shopId: null },
      sourceService: 'patrol',
    });

    const result = await service.exportManagementMetricsCsv(
      {},
      {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      },
    );

    expect(result.filename).toBe('management-metrics.csv');
    expect(result.buffer.toString('utf8')).toContain('completionRate');
    expect(result.buffer.toString('utf8')).not.toContain('employeeFullName');
  });

  it('exports management metrics as XLSX', async () => {
    managementMetricsService.getMetrics.mockResolvedValue({
      metrics: {
        attentionPatrols: 0,
        attentionRate: 0,
        attentionShopCount: 0,
        averageCompletionSeconds: null,
        cleanPatrolRate: 0,
        cleanPatrols: 0,
        completedPatrols: 0,
        completionRate: 0,
        greenShopCount: 0,
        onTimePatrols: 0,
        onTimeRate: 0,
        registeredPatrols: 0,
        submittedReports: 0,
      },
      period: { from: null, to: null },
      schemaVersion: '2.0',
      scope: { regionId: null, shopId: null },
      sourceService: 'patrol',
    });

    const result = await service.exportManagementMetricsXlsx(
      {},
      {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      },
    );

    expect(result.contentType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(result.filename).toBe('management-metrics.xlsx');
    expect(result.buffer.byteLength).toBeGreaterThan(0);
  });

  it('exports management shop scorecards as CSV without personal details', async () => {
    managementScorecardsService.getShopScorecardsForExport.mockResolvedValue({
      items: [
        {
          metrics: {
            attentionPatrols: 0,
            attentionRate: 0,
            averageCompletionSeconds: 540,
            cleanPatrolRate: 1,
            cleanPatrols: 10,
            completedPatrols: 10,
            completionRate: 1,
            onTimePatrols: 9,
            onTimeRate: 0.9,
            registeredPatrols: 10,
            submittedReports: 3,
          },
          regionId: 'region-id',
          shopId: 'shop-id',
          shopName: 'Shop 1',
          status: 'green',
        },
      ],
      meta: { limit: 500, page: 1, total: 1 },
      period: { from: null, to: null },
      schemaVersion: '2.0',
      scope: { regionId: null, shopId: null },
      sourceService: 'patrol',
    });

    const result = await service.exportManagementShopScorecardsCsv(
      {},
      {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      },
    );

    expect(result.filename).toBe('management-shop-scorecards.csv');
    expect(result.buffer.toString('utf8')).toContain('shopName');
    expect(result.buffer.toString('utf8')).toContain('Shop 1');
    expect(result.buffer.toString('utf8')).not.toContain('employeeFullName');
  });

  it('exports management trends as CSV without personal details', async () => {
    managementTrendsService.getTrends.mockResolvedValue({
      bucket: 'day',
      items: [
        {
          bucketStart: '2026-08-18T00:00:00.000Z',
          metrics: {
            attentionPatrols: 1,
            attentionRate: 0.1,
            averageCompletionSeconds: 600,
            cleanPatrolRate: 0.9,
            cleanPatrols: 9,
            completedPatrols: 10,
            completionRate: 1,
            onTimePatrols: 8,
            onTimeRate: 0.8,
            registeredPatrols: 10,
            submittedReports: 4,
          },
        },
      ],
      period: { from: null, to: null },
      schemaVersion: '2.0',
      scope: { regionId: null, shopId: null },
      sourceService: 'patrol',
    });

    const result = await service.exportManagementTrendsCsv(
      {},
      {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      },
    );

    expect(result.filename).toBe('management-trends.csv');
    expect(result.buffer.toString('utf8')).toContain('bucketStart');
    expect(result.buffer.toString('utf8')).toContain('2026-08-18T00:00:00.000Z');
    expect(result.buffer.toString('utf8')).not.toContain('employeeFullName');
  });

  it('exports management breakdown as CSV without personal details', async () => {
    managementBreakdownService.getBreakdown.mockResolvedValue({
      groupBy: 'routeCategory',
      items: [
        {
          groupKey: 'internal',
          metrics: {
            attentionPatrols: 1,
            attentionRate: 0.1,
            averageCompletionSeconds: 480,
            cleanPatrolRate: 0.9,
            cleanPatrols: 9,
            completedPatrols: 10,
            completionRate: 1,
            onTimePatrols: 8,
            onTimeRate: 0.8,
            registeredPatrols: 10,
            submittedReports: 3,
          },
        },
      ],
      period: { from: null, to: null },
      schemaVersion: '2.0',
      scope: { regionId: null, shopId: null },
      sourceService: 'patrol',
    });

    const result = await service.exportManagementBreakdownCsv(
      {},
      {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      },
    );

    expect(result.filename).toBe('management-breakdown.csv');
    expect(result.buffer.toString('utf8')).toContain('groupKey');
    expect(result.buffer.toString('utf8')).toContain('internal');
    expect(result.buffer.toString('utf8')).not.toContain('employeeFullName');
  });
});

function createReport(overrides: Partial<PatrolReportEntity> = {}): PatrolReportEntity {
  return {
    createdAt: new Date('2026-08-18T05:00:00.000Z'),
    employeeId: 'user-id',
    fields: {},
    id: 'report-id',
    reportType: 'morning',
    schemaVersion: '1.0',
    shopId: 'shop-id',
    sourceService: 'patrol',
    status: 'submitted',
    submittedAt: new Date('2026-08-18T05:10:00.000Z'),
    updatedAt: new Date('2026-08-18T05:10:00.000Z'),
    ...overrides,
  } as PatrolReportEntity;
}
