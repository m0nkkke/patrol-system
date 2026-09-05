import { MigrationInterface, QueryRunner } from 'typeorm';

export class EnforceActivePatrolPointNfcUniqueness1781779000000 implements MigrationInterface {
  name = 'EnforceActivePatrolPointNfcUniqueness1781779000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const duplicates = await findDuplicateActiveNfcTags(queryRunner);
    if (duplicates.length > 0) {
      const summary = duplicates
        .slice(0, 10)
        .map((duplicate) => `${duplicate.nfcTagId} (${duplicate.pointCount})`)
        .join(', ');
      throw new Error(
        `Cannot enforce active patrol point NFC uniqueness. Resolve duplicate NFC assignments first: ${summary}`,
      );
    }

    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_patrol_points_active_nfc_tag
        ON patrol_points(nfc_tag_id)
        WHERE nfc_tag_id IS NOT NULL
          AND is_active = TRUE
          AND deleted_at IS NULL;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_patrol_points_active_nfc_tag;
    `);
  }
}

type DuplicateActiveNfcTag = {
  nfcTagId: string;
  pointCount: number;
};

async function findDuplicateActiveNfcTags(
  queryRunner: QueryRunner,
): Promise<DuplicateActiveNfcTag[]> {
  const rows = await queryRunner.query(`
    SELECT
      nfc_tag_id AS "nfcTagId",
      COUNT(*)::int AS "pointCount"
    FROM patrol_points
    WHERE nfc_tag_id IS NOT NULL
      AND is_active = TRUE
      AND deleted_at IS NULL
    GROUP BY nfc_tag_id
    HAVING COUNT(*) > 1;
  `) as Array<{ nfcTagId: string; pointCount: number | string }>;

  return rows.map((row) => ({
    nfcTagId: row.nfcTagId,
    pointCount: Number(row.pointCount),
  }));
}
