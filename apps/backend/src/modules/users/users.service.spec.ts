import { CreateUserDto } from '@patrol/shared';

import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { ShopsService } from '../shops/shops.service';
import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

type ShopsServiceMock = Pick<ShopsService, 'findOne'>;
type UsersRepositoryMock = Pick<UsersRepository, 'assignShops' | 'create' | 'findById'>;

describe('UsersService', () => {
  let shopsService: jest.Mocked<ShopsServiceMock>;
  let usersRepository: jest.Mocked<UsersRepositoryMock>;
  let service: UsersService;

  beforeEach(() => {
    shopsService = {
      findOne: jest.fn(),
    };
    usersRepository = {
      assignShops: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    };

    service = new UsersService(
      shopsService as unknown as ShopsService,
      usersRepository as unknown as UsersRepository,
    );
  });

  it('rejects user creation when shopId does not exist', async () => {
    const shopId = '00000000-0000-4000-8000-0000000000aa';
    const dto: CreateUserDto = {
      fullName: 'Mobile Employee',
      role: 'employee',
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
        updatedAt: new Date(),
      }),
    );

    const result = await service.create({
      fullName: 'Mobile Employee',
      role: 'employee',
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
      role: 'employee',
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
});
