import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { NfcTagEntity } from './entities/nfc-tag.entity';
import { NfcTagReplacementEntity } from './entities/nfc-tag-replacement.entity';
import { PatrolPointEntity } from './entities/patrol-point.entity';
import { FileAssetEntity } from '../files/entities/file-asset.entity';
import { FilesService } from '../files/files.service';
import { PatrolPointsRepository } from './patrol-points.repository';
import { PatrolPointsService } from './patrol-points.service';

type PatrolPointsRepositoryMock = Pick<
  PatrolPointsRepository,
  | 'countActiveByShop'
  | 'countRegisteredRoutePoints'
  | 'createNfcTag'
  | 'createNfcTagReplacement'
  | 'createPatrolPoint'
  | 'findActiveByShop'
  | 'findNfcTagById'
  | 'findNfcTagByUid'
  | 'findPatrolPointById'
  | 'findPatrolPointByNfcTagId'
  | 'findPatrolPointByShopAndSortOrder'
  | 'findRouteSetupPointsByShop'
  | 'saveNfcTag'
  | 'savePatrolPoint'
>;

describe('PatrolPointsService', () => {
  let filesService: jest.Mocked<Pick<FilesService, 'createImageAsset'>>;
  let repository: jest.Mocked<PatrolPointsRepositoryMock>;
  let service: PatrolPointsService;

  beforeEach(() => {
    repository = {
      countActiveByShop: jest.fn(),
      countRegisteredRoutePoints: jest.fn(),
      createNfcTag: jest.fn(),
      createNfcTagReplacement: jest.fn(),
      createPatrolPoint: jest.fn(),
      findActiveByShop: jest.fn(),
      findNfcTagById: jest.fn(),
      findNfcTagByUid: jest.fn(),
      findPatrolPointById: jest.fn(),
      findPatrolPointByNfcTagId: jest.fn(),
      findPatrolPointByShopAndSortOrder: jest.fn(),
      findRouteSetupPointsByShop: jest.fn(),
      saveNfcTag: jest.fn(),
      savePatrolPoint: jest.fn(),
    };
    filesService = {
      createImageAsset: jest.fn(),
    };
    service = new PatrolPointsService(
      repository as unknown as PatrolPointsRepository,
      filesService as unknown as FilesService,
    );
  });

  it('uploads compressed patrol point photo and links file asset', async () => {
    const point = createPoint();
    const asset = createFileAsset();
    repository.findPatrolPointById.mockResolvedValue(point);
    repository.savePatrolPoint.mockImplementation((savedPoint) => Promise.resolve(savedPoint));
    filesService.createImageAsset.mockResolvedValue(asset);

    const result = await service.uploadPhoto(
      point.id,
      {
        buffer: Buffer.from('image'),
        mimetype: 'image/jpeg',
        originalname: 'point.jpg',
        size: 5,
      },
      {
        fullName: 'Setter',
        id: 'setter-id',
        role: 'local_route_setter',
        shopId: point.shopId,
        username: 'setter',
      },
    );

    expect(filesService.createImageAsset).toHaveBeenCalledWith({
      file: {
        buffer: Buffer.from('image'),
        mimetype: 'image/jpeg',
        originalname: 'point.jpg',
        size: 5,
      },
      kind: 'patrol_point_photo',
      ownerId: point.id,
      ownerType: 'patrol_point',
      uploadedBy: 'setter-id',
    });
    expect(result.photoFileId).toBe(asset.id);
    expect(result.photoFile).toBe(asset);
    expect(repository.savePatrolPoint).toHaveBeenCalledWith(point);
  });

  it('replaces NFC tag and stores replacement history', async () => {
    const oldTag = createTag({ id: 'old-tag-id', uid: '04old' });
    const newTag = createTag({ id: 'new-tag-id', uid: '04new' });
    const point = createPoint({ nfcTag: oldTag, nfcTagId: oldTag.id });
    const replacement = createReplacement({
      newNfcTagId: newTag.id,
      newNfcUid: newTag.uid,
      oldNfcTagId: oldTag.id,
      oldNfcUid: oldTag.uid,
      patrolPointId: point.id,
    });

    repository.findPatrolPointById.mockResolvedValue(point);
    repository.findNfcTagByUid.mockResolvedValue(newTag);
    repository.findPatrolPointByNfcTagId.mockResolvedValue(null);
    repository.saveNfcTag.mockImplementation((tag) => Promise.resolve(tag));
    repository.savePatrolPoint.mockResolvedValue(point);
    repository.createNfcTagReplacement.mockResolvedValue(replacement);

    const result = await service.replaceNfcTag(point.id, {
      reason: 'Повреждён корпус',
      uid: '04NEW',
    });

    expect(oldTag.isActive).toBe(false);
    expect(point.nfcTagId).toBe(newTag.id);
    expect(repository.saveNfcTag).toHaveBeenCalledWith(oldTag);
    expect(repository.savePatrolPoint).toHaveBeenCalledWith(point);
    expect(repository.createNfcTagReplacement).toHaveBeenCalledWith({
      newNfcTagId: newTag.id,
      newNfcUid: newTag.uid,
      notes: undefined,
      oldNfcTagId: oldTag.id,
      oldNfcUid: oldTag.uid,
      patrolPointId: point.id,
      reason: 'Повреждён корпус',
      replacedBy: undefined,
    });
    expect(result).toBe(replacement);
  });

  it('archives old NFC tag with empty notes loaded as null', async () => {
    const oldTag = createTag({ id: 'old-tag-id', notes: null, uid: '04old' });
    const newTag = createTag({ id: 'new-tag-id', uid: '04new' });
    const point = createPoint({ id: 'point-id', nfcTag: oldTag, nfcTagId: oldTag.id });
    const replacement = createReplacement({
      newNfcTagId: newTag.id,
      newNfcUid: newTag.uid,
      oldNfcTagId: oldTag.id,
      oldNfcUid: oldTag.uid,
      patrolPointId: point.id,
    });

    repository.findPatrolPointById.mockResolvedValue(point);
    repository.findNfcTagByUid.mockResolvedValue(newTag);
    repository.findPatrolPointByNfcTagId.mockResolvedValue(null);
    repository.saveNfcTag.mockImplementation((tag) => Promise.resolve(tag));
    repository.savePatrolPoint.mockResolvedValue(point);
    repository.createNfcTagReplacement.mockResolvedValue(replacement);

    await expect(service.replaceNfcTag(point.id, { uid: '04NEW' })).resolves.toBe(replacement);

    expect(oldTag.isActive).toBe(false);
    expect(oldTag.notes).toContain(point.id);
    expect(repository.saveNfcTag).toHaveBeenCalledWith(oldTag);
  });

  it('rejects replacement with the same UID', async () => {
    const oldTag = createTag({ uid: '04same' });
    const point = createPoint({ nfcTag: oldTag, nfcTagId: oldTag.id });

    repository.findPatrolPointById.mockResolvedValue(point);

    await expect(service.replaceNfcTag(point.id, { uid: '04SAME' })).rejects.toBeInstanceOf(
      DomainValidationError,
    );
  });
});

function createTag(overrides: Partial<NfcTagEntity> = {}): NfcTagEntity {
  return {
    createdAt: new Date(),
    id: 'tag-id',
    isActive: true,
    registeredAt: new Date(),
    uid: '04tag',
    updatedAt: new Date(),
    ...overrides,
  } as NfcTagEntity;
}

function createPoint(overrides: Partial<PatrolPointEntity> = {}): PatrolPointEntity {
  return {
    createdAt: new Date(),
    id: 'point-id',
    isActive: true,
    name: 'Контрольная точка 1',
    shopId: 'shop-id',
    sortOrder: 1,
    updatedAt: new Date(),
    ...overrides,
  } as PatrolPointEntity;
}

function createFileAsset(overrides: Partial<FileAssetEntity> = {}): FileAssetEntity {
  return {
    checksumSha256: 'a'.repeat(64),
    createdAt: new Date(),
    id: 'file-id',
    kind: 'patrol_point_photo',
    mimeType: 'image/webp',
    ownerId: 'point-id',
    ownerType: 'patrol_point',
    sizeBytes: 1024,
    storage: 'local',
    storageKey: 'patrol_point_photo/2026/08/file-id.webp',
    ...overrides,
  } as FileAssetEntity;
}

function createReplacement(
  overrides: Partial<NfcTagReplacementEntity> = {},
): NfcTagReplacementEntity {
  return {
    createdAt: new Date(),
    id: 'replacement-id',
    newNfcTagId: 'new-tag-id',
    newNfcUid: '04new',
    patrolPointId: 'point-id',
    ...overrides,
  } as NfcTagReplacementEntity;
}
