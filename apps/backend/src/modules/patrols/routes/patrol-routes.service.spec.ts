import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { PatrolPointsService } from '../../patrol-points/patrol-points.service';
import { ShopsService } from '../../shops/shops.service';
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

    await service.create({
      category: 'internal',
      name: 'Morning route',
      patrolPointIds: ['point-1', 'point-2'],
      shopId: 'shop-id',
    });

    expect(repository.create).toHaveBeenCalledWith({
      category: 'internal',
      isActive: true,
      name: 'Morning route',
      pointIds: ['point-1', 'point-2'],
      shopId: 'shop-id',
    });
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
      service.create({
        category: 'external',
        name: 'External route',
        patrolPointIds: ['point-1'],
        shopId: 'shop-id',
      }),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(repository.create).not.toHaveBeenCalled();
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
