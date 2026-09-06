import { Repository } from 'typeorm';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { ArchiveService } from './archive.service';
import { ShopEntity } from '../shops/entities/shop.entity';
import { PatrolRouteEntity } from '../patrols/entities/patrol-route.entity';
import { PatrolPointsService } from '../patrol-points/patrol-points.service';
import { PatrolRoutesService } from '../patrols/routes/patrol-routes.service';

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
  let patrolRoutesService: jest.Mocked<Pick<PatrolRoutesService, 'deactivate' | 'update'>>;
  let patrolPointsService: jest.Mocked<Pick<PatrolPointsService, 'archive' | 'restore'>>;

  beforeEach(() => {
    fileAssets = createRepositoryMock();
    nfcTags = createRepositoryMock();
    patrolPoints = createRepositoryMock();
    patrolRoutes = createRepositoryMock();
    shops = createRepositoryMock();
    users = createRepositoryMock();
    patrolPointsService = {
      archive: jest.fn(),
      restore: jest.fn(),
    };
    patrolRoutesService = { deactivate: jest.fn(), update: jest.fn() };
    service = new ArchiveService(
      fileAssets as unknown as Repository<any>,
      nfcTags as unknown as Repository<any>,
      patrolPoints as unknown as Repository<any>,
      patrolRoutes as unknown as Repository<any>,
      shops as unknown as Repository<any>,
      users as unknown as Repository<any>,
      patrolPointsService as unknown as PatrolPointsService,
      patrolRoutesService as unknown as PatrolRoutesService,
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

    await expect(service.archive('shops', 'shop-id', createAdminActor())).resolves.toMatchObject({
      archiveReason: 'soft_deleted',
      displayName: 'Archived shop',
      resourceType: 'shops',
    });
    expect(shops.softDelete).toHaveBeenCalledWith('shop-id');
    expect(shops.update).toHaveBeenCalledWith('shop-id', { isActive: false });

    shops.findOne.mockResolvedValueOnce(archivedShop).mockResolvedValueOnce(activeShop);

    await expect(service.restore('shops', 'shop-id', createAdminActor())).resolves.toMatchObject({
      archiveReason: null,
      archived: false,
      displayName: 'Archived shop',
      resourceType: 'shops',
    });
    expect(shops.restore).toHaveBeenCalledWith('shop-id');
    expect(shops.update).toHaveBeenCalledWith('shop-id', { isActive: true });
  });

  it('restores an inactive patrol route without soft delete', async () => {
    const restoredRoute = createRoute(true);
    patrolRoutesService.update.mockResolvedValue(restoredRoute);

    await expect(
      service.restore('patrol-routes', 'route-id', createAdminActor()),
    ).resolves.toMatchObject({
      archiveReason: null,
      archived: false,
      displayName: 'Internal route',
      resourceType: 'patrol-routes',
    });
    expect(patrolRoutes.restore).not.toHaveBeenCalled();
    expect(patrolRoutes.update).not.toHaveBeenCalled();
    expect(patrolRoutesService.update).toHaveBeenCalledWith(
      'route-id',
      { isActive: true },
      createAdminActor(),
    );
  });

  it('delegates patrol point archive to patrol point business rules', async () => {
    const archivedPoint = {
      createdAt: new Date(),
      deletedAt: new Date(),
      id: 'point-id',
      isActive: false,
      name: 'Archived point',
      shopId: 'shop-id',
      sortOrder: 1,
      updatedAt: new Date(),
    };
    const actor = createAdminActor();
    patrolPointsService.archive.mockResolvedValue(archivedPoint);

    await expect(service.archive('patrol-points', 'point-id', actor)).resolves.toMatchObject({
      archived: true,
      displayName: 'Archived point',
      resourceType: 'patrol-points',
    });
    expect(patrolPointsService.archive).toHaveBeenCalledWith('point-id', actor);
    expect(patrolPoints.softDelete).not.toHaveBeenCalled();
  });
});

function createAdminActor(): AuthenticatedUser {
  return {
    fullName: 'Admin',
    id: 'admin-id',
    role: 'admin' as const,
    username: 'admin',
  };
}

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
