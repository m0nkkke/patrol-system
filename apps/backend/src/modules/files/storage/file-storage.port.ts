import { Readable } from 'stream';

export const FILE_STORAGE = Symbol('FILE_STORAGE');

export type StoredFile = {
  key: string;
  sizeBytes: number;
};

export type FileReadStream = {
  stream: Readable;
  sizeBytes?: number;
};

export interface FileStoragePort {
  delete(key: string): Promise<void>;
  read(key: string): Promise<FileReadStream>;
  save(data: { buffer: Buffer; key: string }): Promise<StoredFile>;
}
