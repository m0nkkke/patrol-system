import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { ShopsService } from '../shops/shops.service';
import { AnonymousAppealsRepository } from './anonymous-appeals.repository';
import { AnonymousAppealsService } from './anonymous-appeals.service';

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
    const created = {
      id: '00000000-0000-4000-8000-000000000020',
      message: 'Need attention',
      shopId,
    };
    shopsService.findOne.mockResolvedValue({ id: shopId } as Awaited<
      ReturnType<ShopsService['findOne']>
    >);
    repository.create.mockResolvedValue(created as Awaited<
      ReturnType<AnonymousAppealsRepository['create']>
    >);

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
    expect(result).toBe(created);
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
    repository.findMany.mockResolvedValue([[], 0]);

    await service.findMany({ limit: 50, page: 1 }, actor);

    expect(repository.findMany).toHaveBeenCalledWith(
      { limit: 50, page: 1 },
      ['00000000-0000-4000-8000-000000000010'],
    );
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
