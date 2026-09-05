import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createReadStream } from 'fs';
import { mkdir, stat, unlink, writeFile } from 'fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'path';

import { AppConfig } from '../../../config/app.config';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../../common/errors/not-found.error';
import { FileReadStream, FileStoragePort, StoredFile } from './file-storage.port';

@Injectable()
export class LocalFileStorageService implements FileStoragePort {
  private readonly root: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    this.root = resolve(configService.get('files.localRoot', { infer: true }));
  }

  async save(data: { buffer: Buffer; key: string }): Promise<StoredFile> {
    const path = this.resolveKey(data.key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, data.buffer);

    return {
      key: data.key,
      sizeBytes: data.buffer.byteLength,
    };
  }

  async read(key: string): Promise<FileReadStream> {
    const path = this.resolveKey(key);
    const fileStat = await stat(path).catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        throw new EntityNotFoundError('StoredFile', key, 'FILE_STORAGE_FILE_NOT_FOUND');
      }
      throw error;
    });

    return {
      sizeBytes: fileStat.size,
      stream: createReadStream(path),
    };
  }

  async delete(key: string): Promise<void> {
    const path = this.resolveKey(key);
    await unlink(path).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    });
  }

  private resolveKey(key: string): string {
    const path = resolve(this.root, key);
    const relativePath = relative(this.root, path);

    if (
      relativePath.length === 0 ||
      relativePath === '..' ||
      relativePath.startsWith(`..${sep}`) ||
      isAbsolute(relativePath)
    ) {
      throw new DomainValidationError('FILE_STORAGE_INVALID_KEY', 'File storage key is invalid');
    }

    return path;
  }
}
