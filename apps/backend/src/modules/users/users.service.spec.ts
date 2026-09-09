import { CreateUserDto } from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { SessionRevocationService } from '../auth/sessions/session-revocation.service';
import { ShopsService } from '../shops/shops.service';
import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

type ShopsServiceMock = Pick<ShopsService, 'findOne'>;
type SessionRevocationServiceMock = Pick<SessionRevocationService, 'revokeUserSessions'>;
type UsersRepositoryMock = Pick<
  UsersRepository,
  'assignShops' | 'countActiveAdmins' | 'create' | 'findById' | 'softDelete' | 'update'
>;

describe('UsersService', () => {
  let shopsService: jest.Mocked<ShopsServiceMock>;
  let sessionRevocationService: jest.Mocked<SessionRevocationServiceMock>;
  let usersRepository: jest.Mocked<UsersRepositoryMock>;
  let service: UsersService;

  beforeEach(() => {
    shopsService = {
      findOne: jest.fn(),
    };
    sessionRevocationService = {
      revokeUserSessions: jest.fn(),
    };
    usersRepository = {
      assignShops: jest.fn(),
      countActiveAdmins: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      softDelete: jest.fn(),
      update: jest.fn(),
    };

    service = new UsersService(
      shopsService as unknown as ShopsService,
      sessionRevocationService as unknown as SessionRevocationService,
      usersRepository as unknown as UsersRepository,
    );
  });

  it('rejects user creation when shopId does not exist', async () => {
    const shopId = '00000000-0000-4000-8000-0000000000aa';
    const dto: CreateUserDto = {
      fullName: 'Mobile Employee',
      role: 'security_guard',
      shopId,
    };

    shopsService.findOne.mockRejectedValue(new EntityNotFoundError('Shop', shopId));

    await expect(service.create(dto)).rejects.toThrow(EntityNotFoundError);
    expect(usersRepository.create).not.toHaveBeenCalled();
  });

  it('creates user assigned to multiple shops', async () => {
    const firstShop = { id: '00000000-0000-4000-8000-0000000000aa' } as Awaited<
      ReturnType<ShopsService['findOne']>
    >;
    const secondShop = { id: '00000000-0000-4000-8000-0000000000bb' } as Awaited<
      ReturnType<ShopsService['findOne']>
    >;
    shopsService.findOne
      .mockResolvedValueOnce(firstShop)
      .mockResolvedValueOnce(secondShop);
    usersRepository.create.mockImplementation((data) =>
      Promise.resolve({
        ...data,
        createdAt: new Date(),
        id: 'user-id',
        sessionVersion: 0,
        updatedAt: new Date(),
      }),
    );

    const result = await service.create({
      fullName: 'Mobile Employee',
      role: 'security_guard',
      shopIds: [firstShop.id, secondShop.id],
    });

    expect(usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        shopId: firstShop.id,
        shops: [firstShop, secondShop],
      }),
    );
    expect(result.shopIds).toEqual([firstShop.id, secondShop.id]);
  });

  it('replaces user shop assignments and primary shop', async () => {
    const firstShop = { id: '00000000-0000-4000-8000-0000000000aa' } as Awaited<
      ReturnType<ShopsService['findOne']>
    >;
    const secondShop = { id: '00000000-0000-4000-8000-0000000000bb' } as Awaited<
      ReturnType<ShopsService['findOne']>
    >;
    const user = {
      createdAt: new Date(),
      fullName: 'Mobile Employee',
      id: 'user-id',
      isActive: true,
      passwordHash: 'hash',
      role: 'security_guard',
      shopId: firstShop.id,
      shops: [firstShop],
      updatedAt: new Date(),
      username: 'mobile.employee',
    } as UserEntity;
    usersRepository.findById
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ ...user, shopId: secondShop.id, shops: [firstShop, secondShop] });
    shopsService.findOne
      .mockResolvedValueOnce(firstShop)
      .mockResolvedValueOnce(secondShop);

    const result = await service.assignShops('user-id', {
      primaryShopId: secondShop.id,
      shopIds: [firstShop.id, secondShop.id],
    });

    expect(usersRepository.assignShops).toHaveBeenCalledWith(
      'user-id',
      [firstShop, secondShop],
      secondShop.id,
    );
    expect(result.shopId).toBe(secondShop.id);
  });

  it('updates user lifecycle fields', async () => {
    const user = {
      createdAt: new Date(),
      fullName: 'Mobile Employee',
      id: 'user-id',
      isActive: true,
      passwordHash: 'hash',
      role: 'security_guard',
      sessionVersion: 2,
      updatedAt: new Date(),
      username: 'mobile.employee',
    } as UserEntity;
    usersRepository.findById
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ ...user, fullName: 'Updated Employee', isActive: false });

    const result = await service.update('user-id', {
      fullName: 'Updated Employee',
      isActive: false,
    });

    expect(usersRepository.update).toHaveBeenCalledWith(
      'user-id',
      expect.objectContaining({
        fullName: 'Updated Employee',
        isActive: false,
        sessionVersion: 3,
      }),
    );
    expect(sessionRevocationService.revokeUserSessions).toHaveBeenCalledWith('user-id');
    expect(result.fullName).toBe('Updated Employee');
    expect(result.isActive).toBe(false);
  });

  it('rotates user access key', async () => {
    const user = {
      createdAt: new Date(),
      fullName: 'Mobile Employee',
      id: 'user-id',
      isActive: true,
      passwordHash: 'hash',
      role: 'security_guard',
      sessionVersion: 4,
      updatedAt: new Date(),
      username: 'mobile.employee',
    } as UserEntity;
    usersRepository.findById
      .mockResolvedValueOnce(user)
      .mockResolvedValueOnce({ ...user, accessKey: 'MEMP-0000-0001' });

    const result = await service.rotateAccessKey('user-id');

    const updateCall = usersRepository.update.mock.calls[0];
    expect(updateCall?.[0]).toBe('user-id');
    expect(typeof updateCall?.[1].accessKey).toBe('string');
    expect(typeof updateCall?.[1].accessKeyHash).toBe('string');
    expect(typeof updateCall?.[1].passwordHash).toBe('string');
    expect(updateCall?.[1].sessionVersion).toBe(5);
    expect(sessionRevocationService.revokeUserSessions).toHaveBeenCalledWith('user-id');
    expect(typeof result.accessKey).toBe('string');
  });

  it('soft deletes user and revokes sessions', async () => {
    const user = {
      createdAt: new Date(),
      fullName: 'Mobile Employee',
      id: 'user-id',
      isActive: true,
      isUniversalRouteSetter: false,
      passwordHash: 'hash',
      role: 'security_guard',
      sessionVersion: 6,
      updatedAt: new Date(),
      username: 'mobile.employee',
    } as UserEntity;
    usersRepository.findById.mockResolvedValue(user);

    await service.delete('user-id', createActor());

    expect(usersRepository.update).toHaveBeenCalledWith('user-id', { sessionVersion: 7 });
    expect(usersRepository.softDelete).toHaveBeenCalledWith('user-id');
    expect(sessionRevocationService.revokeUserSessions).toHaveBeenCalledWith('user-id');
  });

  it('rejects deleting the current administrator account', async () => {
    await expect(service.delete('admin-id', createActor())).rejects.toMatchObject({
      code: 'USER_SELF_DELETE_FORBIDDEN',
    });

    expect(usersRepository.findById).not.toHaveBeenCalled();
    expect(usersRepository.softDelete).not.toHaveBeenCalled();
  });

  it('rejects deleting the last active administrator', async () => {
    usersRepository.findById.mockResolvedValue({
      createdAt: new Date(),
      fullName: 'Last administrator',
      id: 'last-admin-id',
      isActive: true,
      passwordHash: 'hash',
      role: 'admin',
      sessionVersion: 0,
      updatedAt: new Date(),
      username: 'last.admin',
    } as UserEntity);
    usersRepository.countActiveAdmins.mockResolvedValue(1);

    await expect(
      service.delete('last-admin-id', createActor()),
    ).rejects.toMatchObject({ code: 'USER_LAST_ACTIVE_ADMIN' });

    expect(usersRepository.softDelete).not.toHaveBeenCalled();
  });
});

function createActor(): AuthenticatedUser {
  return {
    fullName: 'Current administrator',
    id: 'admin-id',
    role: 'admin',
    username: 'current.admin',
  };
}
