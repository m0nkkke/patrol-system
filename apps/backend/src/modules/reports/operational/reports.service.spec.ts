import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { FileAssetEntity } from '../../files/entities/file-asset.entity';
import { FilesService } from '../../files/files.service';
import { PatrolsService } from '../../patrols/patrols.service';
import { ShopsService } from '../../shops/shops.service';
import { UsersService } from '../../users/users.service';
import { PatrolReportEntity } from '../entities/patrol-report.entity';
import { PatrolReportFileEntity } from '../entities/patrol-report-file.entity';
import { ShopEntity } from '../../shops/entities/shop.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ReportOutboxService } from '../outbox/report-outbox.service';
import { ReportsRepository } from './reports.repository';
import { ReportsService } from './reports.service';

type FilesServiceMock = Pick<FilesService, 'createImageAsset'>;
type PatrolsServiceMock = Pick<PatrolsService, 'findOne'>;
type ReportsRepositoryMock = Pick<ReportsRepository, 'attachFile' | 'create' | 'findById' | 'findMany' | 'update'>;
type ReportOutboxServiceMock = Pick<ReportOutboxService, 'emitReportEvent'>;
type ShopsServiceMock = Pick<ShopsService, 'findOne'>;
type UsersServiceMock = Pick<UsersService, 'assertAssignedToShop'>;

describe('ReportsService', () => {
  let filesService: jest.Mocked<FilesServiceMock>;
  let patrolsService: jest.Mocked<PatrolsServiceMock>;
  let reportOutboxService: jest.Mocked<ReportOutboxServiceMock>;
  let repository: jest.Mocked<ReportsRepositoryMock>;
  let service: ReportsService;
  let shopsService: jest.Mocked<ShopsServiceMock>;
  let usersService: jest.Mocked<UsersServiceMock>;

  beforeEach(() => {
    filesService = {
      createImageAsset: jest.fn(),
    };
    patrolsService = {
      findOne: jest.fn(),
    };
    reportOutboxService = {
      emitReportEvent: jest.fn(),
    };
    repository = {
      attachFile: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    };
    shopsService = {
      findOne: jest.fn(),
    };
    usersService = {
      assertAssignedToShop: jest.fn(),
    };

    service = new ReportsService(
      filesService as unknown as FilesService,
      patrolsService as unknown as PatrolsService,
      reportOutboxService as unknown as ReportOutboxService,
      repository as unknown as ReportsRepository,
      shopsService as unknown as ShopsService,
      usersService as unknown as UsersService,
    );
  });

  it('creates draft report for assigned security guard shop', async () => {
    const report = createReport();
    repository.create.mockResolvedValue(report);

    await expect(
      service.createDraft(
        {
          fields: { entranceClean: true },
          reportType: 'morning',
          shopId: 'shop-id',
        },
        createActor(),
      ),
    ).resolves.toBe(report);

    expect(usersService.assertAssignedToShop).toHaveBeenCalledWith('user-id', 'shop-id');
    expect(repository.create).toHaveBeenCalledWith({
      comment: undefined,
      employeeId: 'user-id',
      fields: { entranceClean: true },
      patrolId: undefined,
      period: undefined,
      reportType: 'morning',
      routeId: undefined,
      scheduleId: undefined,
      shopId: 'shop-id',
    });
    expect(reportOutboxService.emitReportEvent).toHaveBeenCalledWith(
      'report.draft_created',
      report,
      createActor(),
    );
  });

  it('rejects report for shop outside actor assignments', async () => {
    await expect(
      service.createDraft(
        {
          reportType: 'morning',
          shopId: 'another-shop',
        },
        createActor(),
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('submits own draft report', async () => {
    repository.findById
      .mockResolvedValueOnce(createReport({ status: 'draft' }))
      .mockResolvedValueOnce(createReport({ status: 'submitted' }));

    const result = await service.submit('report-id', { comment: 'Done' }, createActor());

    expect(result.status).toBe('submitted');
    expect(repository.update).toHaveBeenCalledWith('report-id', {
      comment: 'Done',
      fields: {},
      status: 'submitted',
      submittedAt: expect.any(Date),
    });
    expect(reportOutboxService.emitReportEvent).toHaveBeenCalledWith(
      'report.submitted',
      result,
      createActor(),
      { submittedAt: null },
    );
  });

  it('attaches photo to own draft report', async () => {
    const asset = createFileAsset();
    repository.findById
      .mockResolvedValueOnce(createReport({ status: 'draft' }))
      .mockResolvedValueOnce(createReport({ files: [] }));
    filesService.createImageAsset.mockResolvedValue(asset);

    await service.attachPhoto(
      'report-id',
      {
        buffer: Buffer.from('image'),
        mimetype: 'image/jpeg',
        originalname: 'report.jpg',
        size: 5,
      },
      createActor(),
    );

    expect(filesService.createImageAsset).toHaveBeenCalledWith({
      file: {
        buffer: Buffer.from('image'),
        mimetype: 'image/jpeg',
        originalname: 'report.jpg',
        size: 5,
      },
      kind: 'report_photo',
      ownerId: 'report-id',
      ownerType: 'patrol_report',
      uploadedBy: 'user-id',
    });
    expect(repository.attachFile).toHaveBeenCalledWith('report-id', asset, 'report_photo');
    expect(reportOutboxService.emitReportEvent).toHaveBeenCalledWith(
      'report.file_attached',
      expect.objectContaining({ id: 'report-id' }),
      createActor(),
      {
        fileId: asset.id,
        fileKind: 'report_photo',
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      },
    );
  });

  it('returns a safe normalized control report list', async () => {
    const asset = createFileAsset();
    repository.findMany.mockResolvedValue([[
      createReport({
        employee: { fullName: 'Security Guard' } as UserEntity,
        files: [{ file: asset, fileId: asset.id, kind: 'report_photo' } as PatrolReportFileEntity],
        shop: { name: 'Shop 1' } as ShopEntity,
      }),
    ], 1]);

    const result = await service.findForControl(
      { limit: 20, page: 1 },
      createActor({ role: 'inspector', shopId: undefined, shopIds: ['shop-id'] }),
    );

    expect(repository.findMany).toHaveBeenCalledWith(
      { limit: 20, page: 1 },
      ['shop-id'],
    );
    expect(result.items[0]).toMatchObject({
      employee: { fullName: 'Security Guard' },
      files: [{ id: 'file-id', url: '/api/v1/files/file-id' }],
      shop: { name: 'Shop 1' },
    });
    expect(JSON.stringify(result)).not.toContain('storageKey');
    expect(JSON.stringify(result)).not.toContain('checksumSha256');
  });
});

function createActor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    fullName: 'Security Guard',
    id: 'user-id',
    role: 'security_guard',
    shopId: 'shop-id',
    username: 'guard',
    ...overrides,
  };
}

function createReport(overrides: Partial<PatrolReportEntity> = {}): PatrolReportEntity {
  return {
    createdAt: new Date(),
    employeeId: 'user-id',
    fields: {},
    id: 'report-id',
    reportType: 'morning',
    schemaVersion: '1.0',
    shopId: 'shop-id',
    sourceService: 'patrol',
    status: 'draft',
    updatedAt: new Date(),
    ...overrides,
  } as PatrolReportEntity;
}

function createFileAsset(overrides: Partial<FileAssetEntity> = {}): FileAssetEntity {
  return {
    checksumSha256: 'a'.repeat(64),
    createdAt: new Date(),
    id: 'file-id',
    kind: 'report_photo',
    mimeType: 'image/webp',
    ownerId: 'report-id',
    ownerType: 'patrol_report',
    sizeBytes: 1024,
    storage: 'local',
    storageKey: 'report_photo/2026/08/file-id.webp',
    ...overrides,
  } as FileAssetEntity;
}
