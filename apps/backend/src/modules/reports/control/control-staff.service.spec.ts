import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { ShopEntity } from '../../shops/entities/shop.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { UsersService } from '../../users/users.service';
import { ControlStaffRepository } from './control-staff.repository';
import { ControlStaffService } from './control-staff.service';

type ControlStaffRepositoryMock = Pick<ControlStaffRepository, 'findById' | 'findMany'>;

describe('ControlStaffService', () => {
  let repository: jest.Mocked<ControlStaffRepositoryMock>;
  let service: ControlStaffService;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findMany: jest.fn(),
    };
    service = new ControlStaffService(repository as unknown as ControlStaffRepository, { create: jest.fn() } as unknown as UsersService);
  });

  it('rejects guard creation outside inspector assignments', async () => {
    await expect(service.createGuard({ fullName: 'Guard', shopIds: ['outside'] }, createActor('inspector'))).rejects.toThrow();
  });

  it('creates only a guard in assigned shops and exposes only the initial credential', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'guard', fullName: 'Guard', accessKey: 'NEW-KEY', passwordHash: 'hidden' });
    const serviceWithUsers = new ControlStaffService(repository as unknown as ControlStaffRepository, { create } as unknown as UsersService);
    const result = await serviceWithUsers.createGuard({ fullName: 'Guard', shopIds: ['assigned'] }, createActor('inspector', { shopIds: ['assigned'] }));
    expect(create).toHaveBeenCalledWith({ fullName: 'Guard', shopIds: ['assigned'], role: 'security_guard' });
    expect(result).toEqual({ id: 'guard', fullName: 'Guard', accessKey: 'NEW-KEY' });
  });

  it('rejects guard creation by other roles and without assignments', async () => {
    await expect(service.createGuard({ fullName: 'Guard', shopIds: [] }, createActor('admin'))).rejects.toThrow();
    await expect(service.createGuard({ fullName: 'Guard', shopIds: ['shop'] }, createActor('security_guard'))).rejects.toThrow();
  });

  it('returns active and inactive staff through a safe read model', async () => {
    const shop = createShop();
    const active = createUser({ shop, shops: [shop] });
    const inactive = createUser({
      accessKey: 'SECRET-KEY',
      accessKeyHash: 'secret-hash',
      id: '00000000-0000-4000-8000-000000000012',
      isActive: false,
      passwordHash: 'password-hash',
      shop,
      shops: [shop],
    });
    repository.findMany.mockResolvedValue([[active, inactive], 2]);

    const result = await service.findMany({ limit: 20, page: 1 }, createActor('admin'));

    expect(repository.findMany).toHaveBeenCalledWith({ limit: 20, page: 1 }, undefined);
    expect(result.items).toHaveLength(2);
    expect(result.items[1]).toMatchObject({ isActive: false, shops: [{ id: shop.id }] });
    expect(JSON.stringify(result)).not.toContain('SECRET-KEY');
    expect(JSON.stringify(result)).not.toContain('secret-hash');
    expect(JSON.stringify(result)).not.toContain('password-hash');
  });

  it('limits inspector list to all assigned actor shops', async () => {
    repository.findMany.mockResolvedValue([[], 0]);
    const actor = createActor('inspector', {
      shopId: '00000000-0000-4000-8000-000000000101',
      shopIds: ['00000000-0000-4000-8000-000000000102'],
    });

    await service.findMany({ limit: 50, page: 2 }, actor);

    expect(repository.findMany).toHaveBeenCalledWith(
      { limit: 50, page: 2 },
      [
        '00000000-0000-4000-8000-000000000102',
        '00000000-0000-4000-8000-000000000101',
      ],
    );
  });

  it('returns only intersecting assignments to an inspector', async () => {
    const primaryShop = createShop();
    const assignedShop = createShop({
      id: '00000000-0000-4000-8000-000000000102',
      name: 'Shop 2',
    });
    repository.findById.mockResolvedValue(
      createUser({ shop: primaryShop, shops: [primaryShop, assignedShop] }),
    );

    const result = await service.findOne(
      '00000000-0000-4000-8000-000000000011',
      createActor('inspector', { shopIds: [assignedShop.id] }),
    );

    expect(result.primaryShopId).toBeNull();
    expect(result.shops).toEqual([
      expect.objectContaining({ id: assignedShop.id }),
    ]);
  });

  it('limits inspector list response shops to the actor scope', async () => {
    const visibleShop = createShop();
    const hiddenShop = createShop({
      id: '00000000-0000-4000-8000-000000000102',
      name: 'Hidden shop',
    });
    repository.findMany.mockResolvedValue([
      [createUser({ shop: visibleShop, shops: [visibleShop, hiddenShop] })],
      1,
    ]);

    const result = await service.findMany(
      { limit: 20, page: 1 },
      createActor('inspector', { shopIds: [visibleShop.id] }),
    );

    expect(result.items[0]).toMatchObject({
      primaryShopId: visibleShop.id,
      shops: [{ id: visibleShop.id }],
    });
  });

  it('rejects details outside inspector shop scope', async () => {
    repository.findById.mockResolvedValue(createUser({ shop: createShop(), shops: [] }));

    await expect(
      service.findOne(
        '00000000-0000-4000-8000-000000000011',
        createActor('inspector', {
          shopIds: ['00000000-0000-4000-8000-000000000999'],
        }),
      ),
    ).rejects.toMatchObject({ code: 'CONTROL_STAFF_FORBIDDEN' });
  });
});

function createActor(
  role: AuthenticatedUser['role'],
  overrides: Partial<AuthenticatedUser> = {},
): AuthenticatedUser {
  return {
    fullName: 'Control User',
    id: '00000000-0000-4000-8000-000000000001',
    role,
    username: 'control.user',
    ...overrides,
  };
}

function createUser(overrides: Partial<UserEntity> = {}): UserEntity {
  return {
    createdAt: new Date(),
    fullName: 'Security Guard',
    id: '00000000-0000-4000-8000-000000000011',
    isActive: true,
    isUniversalRouteSetter: false,
    passwordHash: 'hidden',
    role: 'security_guard',
    sessionVersion: 0,
    shopId: '00000000-0000-4000-8000-000000000101',
    updatedAt: new Date(),
    username: 'security.guard',
    ...overrides,
  };
}

function createShop(overrides: Partial<ShopEntity> = {}): ShopEntity {
  return {
    address: 'Main street, 1',
    createdAt: new Date(),
    id: '00000000-0000-4000-8000-000000000101',
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
