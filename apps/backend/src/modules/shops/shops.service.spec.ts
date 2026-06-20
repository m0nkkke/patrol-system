import { RouteStatus } from '@patrol/shared';

import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { PatrolPointsService } from '../patrol-points/patrol-points.service';
import { ShopEntity } from './entities/shop.entity';
import { ShopsRepository } from './shops.repository';
import { ShopsService } from './shops.service';

type PatrolPointsServiceMock = Pick<
  PatrolPointsService,
  | 'bindRoutePointNfc'
  | 'countRegisteredRoutePoints'
  | 'ensureRoutePoint'
  | 'findRouteSetupPointsByShop'
>;

type ShopsRepositoryMock = Pick<
  ShopsRepository,
  'create' | 'findActive' | 'findById' | 'updateRouteSetup'
>;

describe('ShopsService', () => {
  let patrolPointsService: jest.Mocked<PatrolPointsServiceMock>;
  let shopsRepository: jest.Mocked<ShopsRepositoryMock>;
  let service: ShopsService;

  beforeEach(() => {
    patrolPointsService = {
      bindRoutePointNfc: jest.fn(),
      countRegisteredRoutePoints: jest.fn(),
      ensureRoutePoint: jest.fn(),
      findRouteSetupPointsByShop: jest.fn(),
    };
    shopsRepository = {
      create: jest.fn(),
      findActive: jest.fn(),
      findById: jest.fn(),
      updateRouteSetup: jest.fn(),
    };
    service = new ShopsService(
      patrolPointsService as unknown as PatrolPointsService,
      shopsRepository as unknown as ShopsRepository,
    );
  });

  it('starts route setup and creates route point placeholders', async () => {
    shopsRepository.findById
      .mockResolvedValueOnce(createShop())
      .mockResolvedValueOnce(
        createShop({
          routeExpectedPoints: 3,
          routeStatus: RouteStatus.SETUP_IN_PROGRESS,
        }),
      );
    patrolPointsService.countRegisteredRoutePoints.mockResolvedValue(0);
    patrolPointsService.findRouteSetupPointsByShop.mockResolvedValue([
      createPoint(1),
      createPoint(2),
      createPoint(3),
    ]);

    const result = await service.startRouteSetup('shop-id', { expectedPoints: 3 });

    expect(patrolPointsService.ensureRoutePoint).toHaveBeenCalledTimes(3);
    expect(shopsRepository.updateRouteSetup).toHaveBeenCalledWith('shop-id', {
      expectedPoints: 3,
      registeredPoints: 0,
      status: RouteStatus.SETUP_IN_PROGRESS,
    });
    expect(result.nextSortOrder).toBe(1);
    expect(result.routeStatus).toBe(RouteStatus.SETUP_IN_PROGRESS);
  });

  it('rejects NFC binding before route setup is started', async () => {
    shopsRepository.findById.mockResolvedValue(createShop());

    await expect(
      service.bindRoutePointNfc('shop-id', 1, { uid: '04a1b2c3d4e5f6' }),
    ).rejects.toBeInstanceOf(DomainValidationError);
  });
});

function createShop(overrides: Partial<ShopEntity> = {}): ShopEntity {
  return {
    createdAt: new Date(),
    id: 'shop-id',
    isActive: true,
    name: 'Магазин 1',
    routeExpectedPoints: 0,
    routeRegisteredPoints: 0,
    routeStatus: RouteStatus.NOT_CONFIGURED,
    timezone: 'Asia/Krasnoyarsk',
    updatedAt: new Date(),
    ...overrides,
  } as ShopEntity;
}

function createPoint(sortOrder: number): Awaited<
  ReturnType<PatrolPointsService['findRouteSetupPointsByShop']>
>[number] {
  return {
    createdAt: new Date(),
    id: `point-${sortOrder}`,
    isActive: false,
    name: `Контрольная точка ${sortOrder}`,
    shopId: 'shop-id',
    sortOrder,
    updatedAt: new Date(),
  };
}
