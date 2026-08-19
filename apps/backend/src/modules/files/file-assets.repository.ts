import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { FileAssetEntity } from './entities/file-asset.entity';

type CreateFileAssetRecord = {
  checksumSha256: string;
  height?: number;
  kind: string;
  mimeType: string;
  originalName?: string;
  ownerId?: string;
  ownerType: string;
  sizeBytes: number;
  storage: string;
  storageKey: string;
  uploadedBy?: string;
  width?: number;
};

@Injectable()
export class FileAssetsRepository {
  constructor(
    @InjectRepository(FileAssetEntity)
    private readonly assets: Repository<FileAssetEntity>,
  ) {}

  create(data: CreateFileAssetRecord): Promise<FileAssetEntity> {
    return this.assets.save(this.assets.create(data));
  }

  findById(id: string): Promise<FileAssetEntity | null> {
    return this.assets.findOne({ where: { id } });
  }

  async softDelete(id: string): Promise<void> {
    await this.assets.softDelete(id);
  }
}
