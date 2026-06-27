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
  | 'resetRouteSetupPoints'
>;

type ShopsRepositoryMock = Pick<
  ShopsRepository,
  'create' | 'findByExternalId' | 'findById' | 'findMany' | 'update' | 'updateRouteSetup'
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
      resetRouteSetupPoints: jest.fn(),
    };
    shopsRepository = {
      create: jest.fn(),
      findByExternalId: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
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

  it('rejects duplicate external ID on shop creation', async () => {
    shopsRepository.findByExternalId.mockResolvedValue(createShop({ externalId: '00234343' }));

    await expect(
      service.create({ externalId: '00234343', name: 'Магазин 2' }),
    ).rejects.toMatchObject({ code: 'SHOP_EXTERNAL_ID_TAKEN' });
    expect(shopsRepository.create).not.toHaveBeenCalled();
  });

  it('updates shop fields after validating external ID', async () => {
    shopsRepository.findById
      .mockResolvedValueOnce(createShop())
      .mockResolvedValueOnce(createShop({ name: 'Магазин 2' }));
    shopsRepository.findByExternalId.mockResolvedValue(null);
    shopsRepository.update.mockResolvedValue(createShop({ name: 'Магазин 2' }));

    const result = await service.update('shop-id', { externalId: '00234343', name: 'Магазин 2' });

    expect(shopsRepository.update).toHaveBeenCalledWith(
      'shop-id',
      expect.objectContaining({ externalId: '00234343', name: 'Магазин 2' }),
    );
    expect(result.name).toBe('Магазин 2');
  });

  it('resets route setup and clears route counters', async () => {
    shopsRepository.findById
      .mockResolvedValueOnce(createShop({ routeExpectedPoints: 3 }))
      .mockResolvedValueOnce(createShop());
    patrolPointsService.findRouteSetupPointsByShop.mockResolvedValue([]);

    const result = await service.resetRouteSetup('shop-id');

    expect(patrolPointsService.resetRouteSetupPoints).toHaveBeenCalledWith('shop-id');
    expect(shopsRepository.updateRouteSetup).toHaveBeenCalledWith('shop-id', {
      expectedPoints: 0,
      registeredPoints: 0,
      status: RouteStatus.NOT_CONFIGURED,
    });
    expect(result.routeStatus).toBe(RouteStatus.NOT_CONFIGURED);
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
    nfcTagId: null,
    shopId: 'shop-id',
    sortOrder,
    updatedAt: new Date(),
  };
}
