import { PatrolIncidentType } from '@patrol/shared';

import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../../common/errors/not-found.error';
import { PatrolIncidentEntity } from '../../patrols/entities/patrol-incident.entity';
import { PatrolEntity } from '../../patrols/entities/patrol.entity';
import { ShopEntity } from '../../shops/entities/shop.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { PatrolReportEntity } from '../entities/patrol-report.entity';
import { ControlShopOverviewRepository } from './control-shop-overview.repository';
import { ControlShopOverviewService } from './control-shop-overview.service';

type RepositoryMock = jest.Mocked<
  Pick<
    ControlShopOverviewRepository,
    | 'findAssignedStaff'
    | 'findRecentIncidents'
    | 'findRecentPatrols'
    | 'findRecentReports'
    | 'findShopById'
    | 'getOverviewStats'
    | 'getReportSummary'
  >
>;

describe('ControlShopOverviewService', () => {
  let repository: RepositoryMock;
  let service: ControlShopOverviewService;

  beforeEach(() => {
    repository = {
      findAssignedStaff: jest.fn(),
      findRecentIncidents: jest.fn(),
      findRecentPatrols: jest.fn(),
      findRecentReports: jest.fn(),
      findShopById: jest.fn(),
      getOverviewStats: jest.fn(),
      getReportSummary: jest.fn(),
    };
    service = new ControlShopOverviewService(
      repository as unknown as ControlShopOverviewRepository,
    );
  });

  it('returns shop overview for assigned inspector', async () => {
    repository.findShopById.mockResolvedValue(createShop());
    repository.getOverviewStats.mockResolvedValue({
      cancelledPatrols: 1,
      completedPatrols: 8,
      incidentCount: 2,
      overduePatrols: 1,
      totalPatrols: 10,
    });
    repository.findAssignedStaff.mockResolvedValue([createUser()]);
    repository.findRecentPatrols.mockResolvedValue([createPatrol()]);
    repository.findRecentIncidents.mockResolvedValue([createIncident()]);
    repository.findRecentReports.mockResolvedValue([createReport()]);
    repository.getReportSummary.mockResolvedValue([
      { count: 3, reportType: 'photo_report', status: 'submitted' },
    ]);

    const result = await service.getOverview('shop-id', {
      fullName: 'Inspector',
      id: 'inspector-id',
      role: 'inspector',
      shopIds: ['shop-id'],
      username: 'inspector',
    });

    expect(result.shop.id).toBe('shop-id');
    expect(result.stats.completionRate).toBe(0.8);
    expect(result.staff).toHaveLength(1);
    expect(result.recentPatrols[0]?.employee.fullName).toBe('Guard');
    expect(result.recentIncidents[0]?.severity).toBe('critical');
    expect(result.reportSummary).toEqual([
      { count: 3, reportType: 'photo_report', status: 'submitted' },
    ]);
  });

  it('rejects inspector outside assigned shops', async () => {
    await expect(
      service.getOverview('other-shop-id', {
        fullName: 'Inspector',
        id: 'inspector-id',
        role: 'inspector',
        shopIds: ['shop-id'],
        username: 'inspector',
      }),
    ).rejects.toBeInstanceOf(DomainValidationError);

    expect(repository.findShopById).not.toHaveBeenCalled();
  });

  it('throws not found for missing shop', async () => {
    repository.findShopById.mockResolvedValue(null);

    await expect(
      service.getOverview('shop-id', {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });
});

function createShop(overrides: Partial<ShopEntity> = {}): ShopEntity {
  return {
    createdAt: new Date(),
    id: 'shop-id',
    isActive: true,
    name: 'Shop',
    routeRegisteredPoints: 5,
    routeStatus: 'ready',
    timezone: 'Asia/Krasnoyarsk',
    updatedAt: new Date(),
    ...overrides,
  } as ShopEntity;
}

function createUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    createdAt: new Date(),
    fullName: 'Guard',
    id: 'guard-id',
    isActive: true,
    role: 'security_guard',
    shopId: 'shop-id',
    updatedAt: new Date(),
    username: 'guard',
    ...overrides,
  } as UserEntity;
}

function createPatrol(overrides: Partial<PatrolEntity> = {}): PatrolEntity {
  return {
    createdAt: new Date(),
    employee: createUser(),
    employeeId: 'guard-id',
    id: 'patrol-id',
    scannedPoints: 5,
    shopId: 'shop-id',
    startedAt: new Date('2026-08-19T01:00:00.000Z'),
    status: 'completed',
    totalPoints: 5,
    updatedAt: new Date(),
    ...overrides,
  } as PatrolEntity;
}

function createIncident(overrides: Partial<PatrolIncidentEntity> = {}): PatrolIncidentEntity {
  return {
    createdAt: new Date('2026-08-19T01:30:00.000Z'),
    id: 'incident-id',
    message: 'Missed point',
    patrolId: 'patrol-id',
    shopId: 'shop-id',
    type: PatrolIncidentType.MISSED_POINT,
    ...overrides,
  } as PatrolIncidentEntity;
}

function createReport(overrides: Partial<PatrolReportEntity> = {}): PatrolReportEntity {
  return {
    createdAt: new Date('2026-08-19T01:40:00.000Z'),
    employee: createUser(),
    employeeId: 'guard-id',
    fields: {},
    id: 'report-id',
    reportType: 'photo_report',
    shopId: 'shop-id',
    status: 'submitted',
    updatedAt: new Date(),
    ...overrides,
  } as PatrolReportEntity;
}
