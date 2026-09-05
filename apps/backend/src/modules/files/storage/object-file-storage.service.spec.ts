import { ObjectFileStorageService } from './object-file-storage.service';

describe('ObjectFileStorageService', () => {
  const service = new ObjectFileStorageService();

  it.each([
    ['save', () => service.save()],
    ['read', () => service.read()],
    ['delete', () => service.delete()],
  ])('returns a stable not-configured error for %s', async (_operation, invoke) => {
    await expect(invoke()).rejects.toMatchObject({
      code: 'OBJECT_FILE_STORAGE_NOT_CONFIGURED',
    });
  });
});
