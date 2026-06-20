import { CreateUserDto } from '@patrol/shared';

import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { ShopsService } from '../shops/shops.service';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';

type ShopsServiceMock = Pick<ShopsService, 'findOne'>;
type UsersRepositoryMock = Pick<UsersRepository, 'create'>;

describe('UsersService', () => {
  let shopsService: jest.Mocked<ShopsServiceMock>;
  let usersRepository: jest.Mocked<UsersRepositoryMock>;
  let service: UsersService;

  beforeEach(() => {
    shopsService = {
      findOne: jest.fn(),
    };
    usersRepository = {
      create: jest.fn(),
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
});
