import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { ShopsService } from '../shops/shops.service';
import { AnonymousAppealsRepository } from './anonymous-appeals.repository';
import { AnonymousAppealsService } from './anonymous-appeals.service';
import { AnonymousAppealEntity } from './entities/anonymous-appeal.entity';
import { ShopEntity } from '../shops/entities/shop.entity';

type AnonymousAppealsRepositoryMock = Pick<
  AnonymousAppealsRepository,
  'create' | 'findById' | 'findMany' | 'updateStatus'
>;
type ShopsServiceMock = Pick<ShopsService, 'findOne'>;

describe('AnonymousAppealsService', () => {
  let repository: jest.Mocked<AnonymousAppealsRepositoryMock>;
  let shopsService: jest.Mocked<ShopsServiceMock>;
  let service: AnonymousAppealsService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      updateStatus: jest.fn(),
    };
    shopsService = {
      findOne: jest.fn(),
    };

    service = new AnonymousAppealsService(
      repository as unknown as AnonymousAppealsRepository,
      shopsService as unknown as ShopsService,
    );
  });

  it('creates anonymous appeal for assigned security guard shop', async () => {
    const shopId = '00000000-0000-4000-8000-000000000010';
    const actor: AuthenticatedUser = {
      fullName: 'Security Guard',
      id: '00000000-0000-4000-8000-000000000001',
      role: 'security_guard',
      shopId,
      shopIds: [shopId],
      username: 'guard',
    };
    const created = createAppeal({
      deviceId: 'device-1',
      id: '00000000-0000-4000-8000-000000000020',
      ipAddress: '127.0.0.1',
      message: 'Need attention',
      shopId,
    });
    shopsService.findOne.mockResolvedValue({
      address: 'Main street, 1',
      id: shopId,
      name: 'Shop 1',
    } as Awaited<
      ReturnType<ShopsService['findOne']>
    >);
    repository.create.mockResolvedValue(created);

    const result = await service.create(
      {
        message: '  Need attention  ',
        shopId,
      },
      actor,
      { deviceId: 'device-1', ipAddress: '127.0.0.1' },
    );

    expect(repository.create).toHaveBeenCalledWith({
      category: 'message',
      deviceId: 'device-1',
      ipAddress: '127.0.0.1',
      message: 'Need attention',
      shopId,
    });
    expect(result).toEqual({
      category: 'message',
      createdAt: created.createdAt.toISOString(),
      id: created.id,
      message: created.message,
      shop: { address: 'Main street, 1', id: shopId, name: 'Shop 1' },
      shopId,
      status: 'new',
      updatedAt: created.updatedAt.toISOString(),
    });
    expect(JSON.stringify(result)).not.toContain('deviceId');
    expect(JSON.stringify(result)).not.toContain('ipAddress');
  });

  it('rejects anonymous appeal for unassigned shop', async () => {
    const actor: AuthenticatedUser = {
      fullName: 'Security Guard',
      id: '00000000-0000-4000-8000-000000000001',
      role: 'security_guard',
      shopId: '00000000-0000-4000-8000-000000000010',
      shopIds: ['00000000-0000-4000-8000-000000000010'],
      username: 'guard',
    };

    await expect(
      service.create(
        {
          message: 'Need attention',
          shopId: '00000000-0000-4000-8000-000000000011',
        },
        actor,
      ),
    ).rejects.toThrow(DomainValidationError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('limits inspector list to assigned shops', async () => {
    const actor: AuthenticatedUser = {
      fullName: 'Inspector',
      id: '00000000-0000-4000-8000-000000000002',
      role: 'inspector',
      shopIds: ['00000000-0000-4000-8000-000000000010'],
      username: 'inspector',
    };
    const appeal = createAppeal({
      deviceId: 'device-1',
      ipAddress: '127.0.0.1',
      shop: createShop(),
    });
    repository.findMany.mockResolvedValue([[appeal], 1]);

    const result = await service.findMany({ limit: 50, page: 1 }, actor);

    expect(repository.findMany).toHaveBeenCalledWith(
      { limit: 50, page: 1 },
      ['00000000-0000-4000-8000-000000000010'],
    );
    expect(result.items[0]).toMatchObject({
      id: appeal.id,
      shop: { id: appeal.shopId, name: 'Shop 1' },
    });
    expect(JSON.stringify(result)).not.toContain('deviceId');
    expect(JSON.stringify(result)).not.toContain('ipAddress');
  });

  it('returns safe anonymous appeal details', async () => {
    const appeal = createAppeal({
      deviceId: 'device-1',
      ipAddress: '127.0.0.1',
      shop: createShop(),
    });
    repository.findById.mockResolvedValue(appeal);

    const result = await service.findOne(appeal.id, {
      fullName: 'Admin',
      id: '00000000-0000-4000-8000-000000000003',
      role: 'admin',
      username: 'admin',
    });

    expect(result).toMatchObject({ id: appeal.id, shopId: appeal.shopId });
    expect(result).not.toHaveProperty('deviceId');
    expect(result).not.toHaveProperty('ipAddress');
  });

  it('rejects non-control roles from listing anonymous appeals', async () => {
    const actor: AuthenticatedUser = {
      fullName: 'Security Guard',
      id: '00000000-0000-4000-8000-000000000001',
      role: 'security_guard',
      shopId: '00000000-0000-4000-8000-000000000010',
      username: 'guard',
    };

    await expect(service.findMany({ limit: 50, page: 1 }, actor)).rejects.toThrow(
      DomainValidationError,
    );
    expect(repository.findMany).not.toHaveBeenCalled();
  });
});

function createAppeal(overrides: Partial<AnonymousAppealEntity> = {}): AnonymousAppealEntity {
  return {
    category: 'message',
    createdAt: new Date('2026-09-02T10:00:00.000Z'),
    id: '00000000-0000-4000-8000-000000000020',
    message: 'Need attention',
    shopId: '00000000-0000-4000-8000-000000000010',
    status: 'new',
    updatedAt: new Date('2026-09-02T10:05:00.000Z'),
    ...overrides,
  };
}

function createShop(overrides: Partial<ShopEntity> = {}): ShopEntity {
  return {
    createdAt: new Date(),
    id: '00000000-0000-4000-8000-000000000010',
    isActive: true,
    name: 'Shop 1',
    routeExpectedPoints: 0,
    routeRegisteredPoints: 0,
    routeStatus: 'not_configured',
    timezone: 'Europe/Moscow',
    updatedAt: new Date(),
    ...overrides,
  };
}
