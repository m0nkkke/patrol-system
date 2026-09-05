import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { PatrolPointsService } from '../../patrol-points/patrol-points.service';
import { ShopsService } from '../../shops/shops.service';
import { PatrolRoutePointEntity } from '../entities/patrol-route-point.entity';
import { PatrolRouteEntity } from '../entities/patrol-route.entity';
import { PatrolRoutesRepository } from './patrol-routes.repository';
import { PatrolRoutesService } from './patrol-routes.service';

type PatrolPointsServiceMock = Pick<PatrolPointsService, 'findOne'>;
type PatrolRoutesRepositoryMock = Pick<
  PatrolRoutesRepository,
  'create' | 'findById' | 'findByShop' | 'findPoint' | 'update'
>;
type ShopsServiceMock = Pick<ShopsService, 'findOne'>;

describe('PatrolRoutesService', () => {
  let patrolPointsService: jest.Mocked<PatrolPointsServiceMock>;
  let repository: jest.Mocked<PatrolRoutesRepositoryMock>;
  let service: PatrolRoutesService;
  let shopsService: jest.Mocked<ShopsServiceMock>;

  beforeEach(() => {
    patrolPointsService = {
      findOne: jest.fn(),
    };
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByShop: jest.fn(),
      findPoint: jest.fn(),
      update: jest.fn(),
    };
    shopsService = {
      findOne: jest.fn(),
    };
    service = new PatrolRoutesService(
      patrolPointsService as unknown as PatrolPointsService,
      repository as unknown as PatrolRoutesRepository,
      shopsService as unknown as ShopsService,
    );
  });

  it('creates route from ordered shop points', async () => {
    shopsService.findOne.mockResolvedValue({ id: 'shop-id' } as Awaited<
      ReturnType<ShopsService['findOne']>
    >);
    patrolPointsService.findOne
      .mockResolvedValueOnce({ id: 'point-1', shopId: 'shop-id' } as Awaited<
        ReturnType<PatrolPointsService['findOne']>
      >)
      .mockResolvedValueOnce({ id: 'point-2', shopId: 'shop-id' } as Awaited<
        ReturnType<PatrolPointsService['findOne']>
      >);
    repository.create.mockResolvedValue(createRoute());

    await service.create(
      {
        category: 'internal',
        name: 'Morning route',
        patrolPointIds: ['point-1', 'point-2'],
        pointSettings: [{ dwellSeconds: 0, patrolPointId: 'point-1' }],
        shopId: 'shop-id',
      },
      createActor(),
    );

    expect(repository.create).toHaveBeenCalledWith({
      category: 'internal',
      isActive: true,
      name: 'Morning route',
      pointIds: ['point-1', 'point-2'],
      pointSettings: [{ dwellSeconds: 0, patrolPointId: 'point-1' }],
      shopId: 'shop-id',
    });
  });

  it('rejects dwell settings for points outside the route', async () => {
    shopsService.findOne.mockResolvedValue({ id: 'shop-id' } as Awaited<
      ReturnType<ShopsService['findOne']>
    >);
    patrolPointsService.findOne.mockResolvedValue({
      id: 'point-1',
      shopId: 'shop-id',
    } as Awaited<ReturnType<PatrolPointsService['findOne']>>);

    await expect(
      service.create(
        {
          category: 'internal',
          name: 'Morning route',
          patrolPointIds: ['point-1'],
          pointSettings: [{ dwellSeconds: 30, patrolPointId: 'point-2' }],
          shopId: 'shop-id',
        },
        createActor(),
      ),
    ).rejects.toMatchObject({ code: 'PATROL_ROUTE_POINT_SETTING_NOT_IN_ROUTE' });

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects route points from another shop', async () => {
    shopsService.findOne.mockResolvedValue({ id: 'shop-id' } as Awaited<
      ReturnType<ShopsService['findOne']>
    >);
    patrolPointsService.findOne.mockResolvedValue({
      id: 'point-1',
      shopId: 'other-shop-id',
    } as Awaited<ReturnType<PatrolPointsService['findOne']>>);

    await expect(
      service.create(
        {
          category: 'external',
          name: 'External route',
          patrolPointIds: ['point-1'],
          shopId: 'shop-id',
        },
        createActor(),
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('restricts a local route setter to assigned shops', async () => {
    await expect(
      service.create(
        {
          category: 'internal',
          name: 'Foreign route',
          patrolPointIds: ['point-1'],
          shopId: 'other-shop-id',
        },
        {
          ...createActor(),
          role: 'local_route_setter',
          shopId: 'shop-id',
        },
      ),
    ).rejects.toMatchObject({ code: 'PATROL_ROUTE_FORBIDDEN' });

    expect(shopsService.findOne).not.toHaveBeenCalled();
  });

  it('preserves existing dwell settings when route points are reordered', async () => {
    repository.findById
      .mockResolvedValueOnce(
        createRoute({
          points: [
            { dwellSeconds: 120, patrolPointId: 'point-1', sortOrder: 1 } as PatrolRoutePointEntity,
            { dwellSeconds: 0, patrolPointId: 'point-2', sortOrder: 2 } as PatrolRoutePointEntity,
          ],
        }),
      )
      .mockResolvedValueOnce(createRoute());
    patrolPointsService.findOne.mockResolvedValue({
      id: 'point-id',
      shopId: 'shop-id',
    } as Awaited<ReturnType<PatrolPointsService['findOne']>>);

    await service.update(
      'route-id',
      {
        patrolPointIds: ['point-2', 'point-1', 'point-3'],
      },
      createActor(),
    );

    expect(repository.update).toHaveBeenCalledWith(
      'route-id',
      expect.objectContaining({
        pointIds: ['point-2', 'point-1', 'point-3'],
        pointSettings: [
          { dwellSeconds: 0, patrolPointId: 'point-2' },
          { dwellSeconds: 120, patrolPointId: 'point-1' },
          { dwellSeconds: 90, patrolPointId: 'point-3' },
        ],
      }),
    );
  });
});

function createRoute(overrides: Partial<PatrolRouteEntity> = {}): PatrolRouteEntity {
  return {
    category: 'internal',
    createdAt: new Date(),
    id: 'route-id',
    isActive: true,
    name: 'Morning route',
    shopId: 'shop-id',
    updatedAt: new Date(),
    ...overrides,
  } as PatrolRouteEntity;
}

function createActor(): AuthenticatedUser {
  return {
    fullName: 'Admin',
    id: 'admin-id',
    role: 'admin' as const,
    username: 'admin',
  };
}
