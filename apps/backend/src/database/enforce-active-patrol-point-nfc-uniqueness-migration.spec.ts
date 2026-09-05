import { QueryRunner } from 'typeorm';

import { EnforceActivePatrolPointNfcUniqueness1781779000000 } from './migrations/1781779000000-enforce-active-patrol-point-nfc-uniqueness';

describe('EnforceActivePatrolPointNfcUniqueness1781779000000', () => {
  const migration = new EnforceActivePatrolPointNfcUniqueness1781779000000();

  it('creates the unique index when active assignments are unique', async () => {
    const query = jest
      .fn<Promise<unknown>, [string]>()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined);

    await migration.up({ query } as unknown as QueryRunner);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1]?.[0]).toContain('CREATE UNIQUE INDEX');
  });

  it('stops with a diagnostic error when duplicate active assignments exist', async () => {
    const query = jest.fn<Promise<unknown>, [string]>().mockResolvedValue([
      {
        nfcTagId: '00000000-0000-4000-8000-000000000010',
        pointCount: 2,
      },
    ]);

    await expect(migration.up({ query } as unknown as QueryRunner)).rejects.toThrow(
      'Resolve duplicate NFC assignments first: 00000000-0000-4000-8000-000000000010 (2)',
    );
    expect(query).toHaveBeenCalledTimes(1);
  });
});
