import { Repository } from 'typeorm';

import { ArchiveService } from './archive.service';
import { ShopEntity } from '../shops/entities/shop.entity';
import { PatrolRouteEntity } from '../patrols/entities/patrol-route.entity';

type RepositoryMock = Pick<
  Repository<any>,
  'createQueryBuilder' | 'findOne' | 'restore' | 'softDelete' | 'update'
>;

describe('ArchiveService', () => {
  let fileAssets: jest.Mocked<RepositoryMock>;
  let nfcTags: jest.Mocked<RepositoryMock>;
  let patrolPoints: jest.Mocked<RepositoryMock>;
  let patrolRoutes: jest.Mocked<RepositoryMock>;
  let shops: jest.Mocked<RepositoryMock>;
  let users: jest.Mocked<RepositoryMock>;
  let service: ArchiveService;

  beforeEach(() => {
    fileAssets = createRepositoryMock();
    nfcTags = createRepositoryMock();
    patrolPoints = createRepositoryMock();
    patrolRoutes = createRepositoryMock();
    shops = createRepositoryMock();
    users = createRepositoryMock();
    service = new ArchiveService(
      fileAssets as unknown as Repository<any>,
      nfcTags as unknown as Repository<any>,
      patrolPoints as unknown as Repository<any>,
      patrolRoutes as unknown as Repository<any>,
      shops as unknown as Repository<any>,
      users as unknown as Repository<any>,
    );
  });

  it('lists soft-deleted shops as archive items', async () => {
    const deletedAt = new Date('2026-08-18T10:00:00.000Z');
    const queryBuilder = createQueryBuilderMock([createShop({ deletedAt })], 1);
    shops.createQueryBuilder.mockReturnValue(queryBuilder as never);

    await expect(
      service.findArchived('shops', { limit: 20, page: 1, search: 'shop' }),
    ).resolves.toMatchObject({
      items: [
        {
          archiveReason: 'soft_deleted',
          archived: true,
          archivedAt: deletedAt,
          displayName: 'Archived shop',
          id: 'shop-id',
          resourceType: 'shops',
        },
      ],
      total: 1,
    });
    expect(queryBuilder.withDeleted).toHaveBeenCalled();
    expect(queryBuilder.andWhere).toHaveBeenCalledWith('entity.deleted_at IS NOT NULL');
  });

  it('archives and restores a shop with soft delete and inactive flag', async () => {
    const activeShop = createShop({ deletedAt: undefined, isActive: true });
    const archivedShop = createShop({
      deletedAt: new Date('2026-08-18T10:00:00.000Z'),
      isActive: false,
    });
    shops.findOne.mockResolvedValueOnce(activeShop).mockResolvedValueOnce(archivedShop);

    await expect(service.archive('shops', 'shop-id')).resolves.toMatchObject({
      archiveReason: 'soft_deleted',
      displayName: 'Archived shop',
      resourceType: 'shops',
    });
    expect(shops.softDelete).toHaveBeenCalledWith('shop-id');
    expect(shops.update).toHaveBeenCalledWith('shop-id', { isActive: false });

    shops.findOne.mockResolvedValueOnce(archivedShop).mockResolvedValueOnce(activeShop);

    await expect(service.restore('shops', 'shop-id')).resolves.toMatchObject({
      archiveReason: null,
      archived: false,
      displayName: 'Archived shop',
      resourceType: 'shops',
    });
    expect(shops.restore).toHaveBeenCalledWith('shop-id');
    expect(shops.update).toHaveBeenCalledWith('shop-id', { isActive: true });
  });

  it('restores an inactive patrol route without soft delete', async () => {
    const archivedRoute = createRoute(false);
    const restoredRoute = createRoute(true);
    patrolRoutes.findOne.mockResolvedValueOnce(archivedRoute).mockResolvedValueOnce(restoredRoute);

    await expect(service.restore('patrol-routes', 'route-id')).resolves.toMatchObject({
      archiveReason: null,
      archived: false,
      displayName: 'Internal route',
      resourceType: 'patrol-routes',
    });
    expect(patrolRoutes.restore).not.toHaveBeenCalled();
    expect(patrolRoutes.update).toHaveBeenCalledWith('route-id', { isActive: true });
  });
});

function createRepositoryMock(): jest.Mocked<RepositoryMock> {
  return {
    createQueryBuilder: jest.fn(),
    findOne: jest.fn(),
    restore: jest.fn(),
    softDelete: jest.fn(),
    update: jest.fn(),
  };
}

function createQueryBuilderMock(items: unknown[], total: number) {
  return {
    andWhere: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([items, total]),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    withDeleted: jest.fn().mockReturnThis(),
  };
}

function createShop(data: Partial<ShopEntity>): ShopEntity {
  return {
    createdAt: new Date('2026-08-18T09:00:00.000Z'),
    id: 'shop-id',
    isActive: true,
    name: 'Archived shop',
    updatedAt: new Date('2026-08-18T09:30:00.000Z'),
    ...data,
  } as ShopEntity;
}

function createRoute(isActive: boolean): PatrolRouteEntity {
  return {
    createdAt: new Date('2026-08-18T09:00:00.000Z'),
    id: 'route-id',
    isActive,
    name: 'Internal route',
    updatedAt: new Date('2026-08-18T09:30:00.000Z'),
  } as PatrolRouteEntity;
}
