import { ExecutionContext, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import request = require('supertest');

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PatrolPointEntity } from '../patrol-points/entities/patrol-point.entity';
import { PatrolPointsController } from '../patrol-points/patrol-points.controller';
import { PatrolPointsRepository } from '../patrol-points/patrol-points.repository';
import { PatrolPointsService } from '../patrol-points/patrol-points.service';
import { FileAssetEntity } from './entities/file-asset.entity';
import { FileAssetsRepository } from './file-assets.repository';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { ImageProcessingService } from './processing/image-processing.service';
import { FILE_STORAGE } from './storage/file-storage.port';
import { LocalFileStorageService } from './storage/local-file-storage.service';

type PatrolPointsRepositoryMock = Pick<
  PatrolPointsRepository,
  'findPatrolPointById' | 'savePatrolPoint'
>;

type FileAssetsRepositoryMock = Pick<FileAssetsRepository, 'create' | 'findById' | 'softDelete'>;

describe('File upload API contract', () => {
  let app: INestApplication;
  let fileAsset: FileAssetEntity | null;
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'patrol-photo-api-'));
    fileAsset = null;
    const point = createPoint();
    const pointsRepository: jest.Mocked<PatrolPointsRepositoryMock> = {
      findPatrolPointById: jest.fn().mockResolvedValue(point),
      savePatrolPoint: jest.fn().mockImplementation((value) => Promise.resolve(value)),
    };
    const assetsRepository: jest.Mocked<FileAssetsRepositoryMock> = {
      create: jest.fn().mockImplementation((record) => {
        fileAsset = {
          ...record,
          createdAt: new Date(),
          id: '00000000-0000-4000-8000-000000000030',
        } as FileAssetEntity;
        return Promise.resolve(fileAsset);
      }),
      findById: jest.fn().mockImplementation(() => Promise.resolve(fileAsset)),
      softDelete: jest.fn(),
    };
    const configService = {
      get: jest.fn((key: string) => ({
        'files.imageMaxWidth': 1600,
        'files.imageQuality': 80,
        'files.localRoot': root,
        'files.maxUploadSizeMb': 10,
        'files.storageBackend': 'local',
      })[key]),
    };
    const actor: AuthenticatedUser = {
      fullName: 'Admin',
      id: '00000000-0000-4000-8000-000000000001',
      role: 'admin',
      username: 'admin',
    };
    const authGuard = {
      canActivate(context: ExecutionContext): boolean {
        context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user = actor;
        return true;
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [FilesController, PatrolPointsController],
      providers: [
        FilesService,
        ImageProcessingService,
        LocalFileStorageService,
        PatrolPointsService,
        { provide: ConfigService, useValue: configService },
        { provide: FILE_STORAGE, useExisting: LocalFileStorageService },
        { provide: FileAssetsRepository, useValue: assetsRepository },
        { provide: PatrolPointsRepository, useValue: pointsRepository },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    await rm(root, { force: true, recursive: true });
  });

  it('uploads a patrol point photo with sharp and reads the stored WebP', async () => {
    const pointId = '00000000-0000-4000-8000-000000000020';
    const svg = Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="10"><rect width="20" height="10" fill="red"/></svg>',
    );

    await request(app.getHttpServer())
      .post(`/api/v1/patrol-points/${pointId}/photo`)
      .attach('file', svg, 'point.svg')
      .expect(201)
      .expect((response) => {
        expect(response.body).toMatchObject({
          photoFileId: '00000000-0000-4000-8000-000000000030',
        });
      });

    await request(app.getHttpServer())
      .get('/api/v1/files/00000000-0000-4000-8000-000000000030')
      .expect(200)
      .expect((response) => {
        expect(response.headers['content-type']).toContain('image/webp');
        expect(Buffer.isBuffer(response.body)).toBe(true);
        expect((response.body as Buffer).byteLength).toBeGreaterThan(0);
      });
  });
});

function createPoint(): PatrolPointEntity {
  return {
    createdAt: new Date(),
    id: '00000000-0000-4000-8000-000000000020',
    isActive: true,
    name: 'Point 1',
    shopId: '00000000-0000-4000-8000-000000000010',
    sortOrder: 1,
    updatedAt: new Date(),
  };
}
