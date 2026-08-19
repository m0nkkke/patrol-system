import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { PatrolEntity } from '../../patrols/entities/patrol.entity';
import { PatrolRouteEntity } from '../../patrols/entities/patrol-route.entity';
import { PatrolScheduleEntity } from '../../patrols/entities/patrol-schedule.entity';
import { ShopEntity } from '../../shops/entities/shop.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ControlPatrolsRepository } from './control-patrols.repository';
import { ControlPatrolsService } from './control-patrols.service';

type RepositoryMock = Pick<
  ControlPatrolsRepository,
  'findById' | 'findEvents' | 'findIncidents' | 'findMany' | 'findReports' | 'findTimingProfile' | 'findVisits'
>;

describe('ControlPatrolsService', () => {
  let repository: jest.Mocked<RepositoryMock>;
  let service: ControlPatrolsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findEvents: jest.fn(),
      findIncidents: jest.fn(),
      findMany: jest.fn(),
      findReports: jest.fn(),
      findTimingProfile: jest.fn(),
      findVisits: jest.fn(),
    };
    service = new ControlPatrolsService(repository as unknown as ControlPatrolsRepository);
  });

  it('returns patrol history scoped to inspector shops', async () => {
    repository.findMany.mockResolvedValue([[
      { expectedSeconds: 900, incidentCount: 2, patrol: createPatrol(), reportCount: 1 },
    ], 1]);

    const result = await service.findMany(
      { limit: 20, page: 1, status: 'completed' },
      { fullName: 'Inspector', id: 'inspector-id', role: 'inspector', shopIds: ['shop-id'], username: 'inspector' },
    );

    expect(repository.findMany).toHaveBeenCalledWith(expect.objectContaining({
      allowedShopIds: ['shop-id'],
      status: 'completed',
    }));
    expect(result).toMatchObject({
      items: [{ expectedSeconds: 900, incidentCount: 2, reportCount: 1, shop: { id: 'shop-id' } }],
      total: 1,
    });
  });

  it('returns normalized patrol investigation details', async () => {
    repository.findById.mockResolvedValue(createPatrol());
    repository.findEvents.mockResolvedValue([]);
    repository.findIncidents.mockResolvedValue([]);
    repository.findReports.mockResolvedValue([]);
    repository.findTimingProfile.mockResolvedValue(null);
    repository.findVisits.mockResolvedValue([]);

    const result = await service.findOne('patrol-id', {
      fullName: 'Admin', id: 'admin-id', role: 'admin', username: 'admin',
    });

    expect(result).toMatchObject({
      employee: { fullName: 'Guard' },
      id: 'patrol-id',
      progress: { scannedPoints: 4, totalPoints: 4 },
      route: { category: 'internal', name: 'Route 1' },
      visits: [],
    });
  });

  it('rejects an inspector reading another shop patrol', async () => {
    repository.findById.mockResolvedValue(createPatrol());

    await expect(service.findOne('patrol-id', {
      fullName: 'Inspector', id: 'inspector-id', role: 'inspector', shopIds: ['other-shop-id'], username: 'inspector',
    })).rejects.toBeInstanceOf(DomainValidationError);

    expect(repository.findEvents).not.toHaveBeenCalled();
  });

  it('rejects non-control roles', async () => {
    await expect(service.findMany(
      { limit: 20, page: 1 },
      { fullName: 'Guard', id: 'guard-id', role: 'security_guard', username: 'guard' },
    )).rejects.toBeInstanceOf(DomainValidationError);
  });
});

function createPatrol(): PatrolEntity {
  return {
    completedAt: new Date('2026-08-18T05:15:00.000Z'),
    createdAt: new Date('2026-08-18T05:00:00.000Z'),
    employee: { fullName: 'Guard' } as UserEntity,
    employeeId: 'employee-id',
    id: 'patrol-id',
    route: { category: 'internal', id: 'route-id', name: 'Route 1' } as PatrolRouteEntity,
    routeId: 'route-id',
    scannedPoints: 4,
    schedule: { period: 'morning' } as PatrolScheduleEntity,
    scheduleId: 'schedule-id',
    shop: { id: 'shop-id', name: 'Shop 1' } as ShopEntity,
    shopId: 'shop-id',
    startedAt: new Date('2026-08-18T05:00:00.000Z'),
    status: 'completed',
    totalPoints: 4,
  } as PatrolEntity;
}
