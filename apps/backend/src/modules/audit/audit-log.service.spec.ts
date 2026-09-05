import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogService } from './audit-log.service';
import { AuditLogEntity } from './entities/audit-log.entity';

type AuditLogRepositoryMock = Pick<AuditLogRepository, 'create' | 'findById' | 'findMany'>;

describe('AuditLogService', () => {
  let repository: jest.Mocked<AuditLogRepositoryMock>;
  let service: AuditLogService;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
    };
    service = new AuditLogService(repository as unknown as AuditLogRepository);
  });

  it('retries an audit write without userId after a foreign key violation', async () => {
    repository.create
      .mockRejectedValueOnce({ code: '23503' })
      .mockResolvedValueOnce(createAuditLog());

    await expect(
      service.recordSafely({
        action: 'auth.logout.success',
        meta: { username: 'removed.user' },
        userId: '00000000-0000-4000-8000-000000000001',
      }),
    ).resolves.toBeUndefined();

    expect(repository.create).toHaveBeenNthCalledWith(2, {
      action: 'auth.logout.success',
      meta: {
        unresolvedUserId: '00000000-0000-4000-8000-000000000001',
        username: 'removed.user',
      },
      userId: null,
    });
  });

  it('returns audit log for admin', async () => {
    repository.findMany.mockResolvedValue([[createAuditLog()], 1]);

    await expect(
      service.findMany(
        { limit: 20, page: 1 },
        {
          fullName: 'Admin',
          id: 'admin-id',
          role: 'admin',
          username: 'admin',
        },
      ),
    ).resolves.toMatchObject({
      items: [{ id: '1', action: 'POST /shops' }],
      limit: 20,
      page: 1,
      total: 1,
    });
  });

  it('rejects non-admin access', async () => {
    await expect(
      service.findMany(
        { limit: 20, page: 1 },
        {
          fullName: 'Inspector',
          id: 'inspector-id',
          role: 'inspector',
          username: 'inspector',
        },
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(repository.findMany).not.toHaveBeenCalled();
  });

  it('throws not found for missing audit record', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      service.findOne('404', {
        fullName: 'Admin',
        id: 'admin-id',
        role: 'admin',
        username: 'admin',
      }),
    ).rejects.toBeInstanceOf(EntityNotFoundError);
  });
});

function createAuditLog(): AuditLogEntity {
  return {
    action: 'POST /shops',
    createdAt: new Date('2026-08-18T10:00:00.000Z'),
    entityType: 'shops',
    id: '1',
    meta: {},
    userId: 'admin-id',
  } as AuditLogEntity;
}
