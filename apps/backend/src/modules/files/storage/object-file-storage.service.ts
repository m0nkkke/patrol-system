import { Injectable } from '@nestjs/common';

import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { FileReadStream, FileStoragePort, StoredFile } from './file-storage.port';

@Injectable()
export class ObjectFileStorageService implements FileStoragePort {
  save(): Promise<StoredFile> {
    return Promise.reject(new DomainValidationError(
      'OBJECT_FILE_STORAGE_NOT_CONFIGURED',
      'Object file storage adapter is not configured yet',
    ));
  }

  read(): Promise<FileReadStream> {
    return Promise.reject(new DomainValidationError(
      'OBJECT_FILE_STORAGE_NOT_CONFIGURED',
      'Object file storage adapter is not configured yet',
    ));
  }

  delete(): Promise<void> {
    return Promise.reject(new DomainValidationError(
      'OBJECT_FILE_STORAGE_NOT_CONFIGURED',
      'Object file storage adapter is not configured yet',
    ));
  }
}
