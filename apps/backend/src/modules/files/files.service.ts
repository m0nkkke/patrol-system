import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';

import { AppConfig } from '../../config/app.config';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { FileAssetEntity } from './entities/file-asset.entity';
import { FileAssetsRepository } from './file-assets.repository';
import { ImageProcessingService } from './processing/image-processing.service';
import { FILE_STORAGE, FileReadStream, FileStoragePort } from './storage/file-storage.port';

export type UploadedImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname?: string;
  size: number;
};

type CreateImageAssetInput = {
  file: UploadedImageFile;
  kind: string;
  ownerId: string;
  ownerType: string;
  uploadedBy?: string;
};

@Injectable()
export class FilesService {
  constructor(
    private readonly assetsRepository: FileAssetsRepository,
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly imageProcessingService: ImageProcessingService,
    @Inject(FILE_STORAGE)
    private readonly storage: FileStoragePort,
  ) {}

  async createImageAsset(input: CreateImageAssetInput): Promise<FileAssetEntity> {
    this.assertCanAcceptFile(input.file);

    const processed = await this.imageProcessingService.compress(input.file.buffer);
    const storageBackend = this.configService.get('files.storageBackend', { infer: true });
    const storageKey = buildStorageKey(input.kind);
    const stored = await this.storage.save({ buffer: processed.buffer, key: storageKey });

    return this.assetsRepository.create({
      checksumSha256: checksum(processed.buffer),
      height: processed.height,
      kind: input.kind,
      mimeType: processed.mimeType,
      originalName: input.file.originalname,
      ownerId: input.ownerId,
      ownerType: input.ownerType,
      sizeBytes: stored.sizeBytes,
      storage: storageBackend,
      storageKey: stored.key,
      uploadedBy: input.uploadedBy,
      width: processed.width,
    });
  }

  async findOne(id: string): Promise<FileAssetEntity> {
    const asset = await this.assetsRepository.findById(id);

    if (asset === null) {
      throw new EntityNotFoundError('FileAsset', id);
    }

    return asset;
  }

  async read(id: string): Promise<{ asset: FileAssetEntity; file: FileReadStream }> {
    const asset = await this.findOne(id);
    const file = await this.storage.read(asset.storageKey);

    return { asset, file };
  }

  async delete(id: string): Promise<void> {
    const asset = await this.findOne(id);
    await this.assetsRepository.softDelete(id);
    await this.storage.delete(asset.storageKey);
  }

  private assertCanAcceptFile(file: UploadedImageFile): void {
    if (file.buffer.length === 0) {
      throw new DomainValidationError('FILE_EMPTY', 'Uploaded file is empty');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new DomainValidationError('FILE_INVALID_MIME_TYPE', 'Uploaded file must be an image');
    }

    const maxUploadSizeBytes = this.configService.get('files.maxUploadSizeMb', { infer: true }) * 1024 * 1024;
    if (file.size > maxUploadSizeBytes) {
      throw new DomainValidationError('FILE_TOO_LARGE', 'Uploaded file is too large');
    }
  }
}

function buildStorageKey(kind: string): string {
  const now = new Date();
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');

  return `${kind}/${year}/${month}/${randomUUID()}.webp`;
}

function checksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}
