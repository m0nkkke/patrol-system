import { ConfigService } from '@nestjs/config';
import { mkdtemp, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

import { AppConfig } from '../../../config/app.config';
import { LocalFileStorageService } from './local-file-storage.service';

describe('LocalFileStorageService', () => {
  let root: string;
  let service: LocalFileStorageService;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'patrol-file-storage-'));
    service = new LocalFileStorageService({
      get: jest.fn().mockReturnValue(root),
    } as unknown as ConfigService<AppConfig, true>);
  });

  afterEach(async () => {
    await rm(root, { force: true, recursive: true });
  });

  it('saves, reads and deletes a file', async () => {
    const buffer = Buffer.from('stored file');

    await expect(service.save({ buffer, key: 'photos/2026/file.webp' })).resolves.toEqual({
      key: 'photos/2026/file.webp',
      sizeBytes: buffer.byteLength,
    });

    const stored = await service.read('photos/2026/file.webp');
    await expect(readStream(stored.stream)).resolves.toEqual(buffer);

    await service.delete('photos/2026/file.webp');
    await expect(service.read('photos/2026/file.webp')).rejects.toMatchObject({
      code: 'FILE_STORAGE_FILE_NOT_FOUND',
    });
  });

  it('rejects keys outside the configured root', async () => {
    await expect(
      service.save({ buffer: Buffer.from('invalid'), key: '../outside.webp' }),
    ).rejects.toMatchObject({ code: 'FILE_STORAGE_INVALID_KEY' });
  });

  it('returns a stable domain code for a missing file', async () => {
    await expect(service.read('missing.webp')).rejects.toMatchObject({
      code: 'FILE_STORAGE_FILE_NOT_FOUND',
    });
  });
});

async function readStream(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
