import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../../common/errors/not-found.error';
import { PatrolEventEntity } from '../../patrols/entities/patrol-event.entity';
import { PatrolIncidentEntity } from '../../patrols/entities/patrol-incident.entity';
import { PatrolRouteEntity } from '../../patrols/entities/patrol-route.entity';
import { PatrolScheduleEntity } from '../../patrols/entities/patrol-schedule.entity';
import { PatrolEntity } from '../../patrols/entities/patrol.entity';
import { ShopEntity } from '../../shops/entities/shop.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ControlIncidentsRepository } from './control-incidents.repository';
import { ControlIncidentsService } from './control-incidents.service';

type ControlIncidentsRepositoryMock = Pick<ControlIncidentsRepository, 'findById' | 'findMany'>;

describe('ControlIncidentsService', () => {
  let repository: jest.Mocked<ControlIncidentsRepositoryMock>;
  let service: ControlIncidentsService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findMany: jest.fn(),
    };
    service = new ControlIncidentsService(repository as unknown as ControlIncidentsRepository);
  });

  it('returns incidents scoped to inspector shops', async () => {
    repository.findMany.mockResolvedValue([[
      createIncident({
        type: 'short_interval',
      }),
    ], 1]);

    await expect(
      service.findMany(
        { limit: 20, page: 1 },
        {
          fullName: 'Inspector',
          id: 'inspector-id',
          role: 'inspector',
          shopIds: ['shop-id'],
          username: 'inspector',
        },
      ),
    ).resolves.toMatchObject({
      items: [
        {
          id: 'incident-id',
          patrol: {
            period: 'morning',
            routeCategory: 'internal',
            routeName: 'Route 1',
          },
          severity: 'warning',
          shop: {
            id: 'shop-id',
            name: 'Shop 1',
          },
          type: 'short_interval',
        },
      ],
      limit: 20,
      page: 1,
      total: 1,
    });
    expect(repository.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedShopIds: ['shop-id'],
        limit: 20,
        page: 1,
      }),
    );
  });

  it('returns incident details with critical severity for missed point', async () => {
    repository.findById.mockResolvedValue(createIncident({ type: 'missed_point' }));

    await expect(
      service.findOne('incident-id', {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      }),
    ).resolves.toMatchObject({
      id: 'incident-id',
      severity: 'critical',
      type: 'missed_point',
    });
  });

  it('rejects inspector access to an incident from another shop', async () => {
    repository.findById.mockResolvedValue(createIncident({ shopId: 'another-shop-id' }));

    await expect(
      service.findOne('incident-id', {
        fullName: 'Inspector',
        id: 'inspector-id',
        role: 'inspector',
        shopIds: ['shop-id'],
        username: 'inspector',
      }),
    ).rejects.toBeInstanceOf(DomainValidationError);
  });

  it('rejects non-control roles', async () => {
    await expect(
      service.findMany(
        { limit: 20, page: 1 },
        {
          fullName: 'Guard',
          id: 'guard-id',
          role: 'security_guard',
          username: 'guard',
        },
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it('throws not found for missing incident', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.findOne('missing-id', {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });
});

function createIncident(
  overrides: Partial<PatrolIncidentEntity> = {},
): PatrolIncidentEntity {
  const patrol = {
    completedAt: new Date('2026-08-18T05:20:00.000Z'),
    dueAt: new Date('2026-08-18T05:30:00.000Z'),
    employee: { fullName: 'Ivan Petrov' } as UserEntity,
    employeeId: 'employee-id',
    id: 'patrol-id',
    route: {
      category: 'internal',
      id: 'route-id',
      name: 'Route 1',
    } as PatrolRouteEntity,
    routeId: 'route-id',
    schedule: {
      id: 'schedule-id',
      period: 'morning',
    } as PatrolScheduleEntity,
    scheduleId: 'schedule-id',
    shop: {
      id: overrides.shopId ?? 'shop-id',
      name: 'Shop 1',
    } as ShopEntity,
    shopId: overrides.shopId ?? 'shop-id',
    startedAt: new Date('2026-08-18T05:00:00.000Z'),
    status: 'completed',
  } as PatrolEntity;

  return {
    actualSeconds: 30,
    createdAt: new Date('2026-08-18T05:05:00.000Z'),
    expectedSeconds: 60,
    fromPatrolPoint: {
      id: 'from-point-id',
      name: 'Point 1',
      sortOrder: 1,
    },
    id: 'incident-id',
    message: 'Short interval',
    patrol,
    patrolEvent: {
      deviceId: 'device-id',
      id: 'event-id',
      lateSync: false,
      nfcUid: '04aabbcc',
      pointDeactivatedAfterScan: false,
      scannedAt: new Date('2026-08-18T05:05:00.000Z'),
    } as PatrolEventEntity,
    patrolEventId: 'event-id',
    patrolId: 'patrol-id',
    shopId: overrides.shopId ?? 'shop-id',
    toPatrolPoint: {
      id: 'to-point-id',
      name: 'Point 2',
      sortOrder: 2,
    },
    type: 'short_interval',
    ...overrides,
  } as PatrolIncidentEntity;
}
