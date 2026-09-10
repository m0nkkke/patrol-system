import { EntityManager } from 'typeorm';

import { formatAccessKey, hashAccessKey, normalizeAccessKey } from '../common/auth/access-key';
import { UserEntity } from '../modules/users/entities/user.entity';
import dataSource from './data-source';

const BOOTSTRAP_LOCK_ID = 1_781_787_001;

export type BootstrapAdminConfig = {
  accessKey: string;
  accessKeyHash: string;
  fullName: string;
  username: string;
};

type BootstrapAdminResult = {
  action: 'created' | 'restored' | 'skipped';
  fullName?: string;
  message: string;
  username?: string;
};

async function run(): Promise<void> {
  await dataSource.initialize();

  try {
    await assertSchemaIsReady();
    const result = await dataSource.transaction((manager) => bootstrapAdmin(manager, process.env));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } finally {
    await dataSource.destroy();
  }
}

async function assertSchemaIsReady(): Promise<void> {
  const requiredColumns = ['access_key', 'access_key_hash', 'deleted_at', 'is_active', 'role'];
  const rows = await dataSource.query<Array<{ columnName: string }>>(
    `SELECT column_name AS "columnName"
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = ANY($1)`,
    [requiredColumns],
  );
  const existing = new Set(rows.map((row) => row.columnName));
  const missing = requiredColumns.filter((column) => !existing.has(column));

  if (missing.length > 0) {
    throw new Error(
      `Database schema is not ready for administrator bootstrap. Missing users columns: ${missing.join(', ')}. Run migrations first.`,
    );
  }
}

export async function bootstrapAdmin(
  manager: EntityManager,
  env: NodeJS.ProcessEnv,
): Promise<BootstrapAdminResult> {
  await manager.query('SELECT pg_advisory_xact_lock($1)', [BOOTSTRAP_LOCK_ID]);

  const users = manager.getRepository(UserEntity);
  const activeAdminCount = await users.count({ where: { isActive: true, role: 'admin' } });

  if (activeAdminCount > 0) {
    return {
      action: 'skipped',
      message: 'An active administrator already exists; no account was created or changed.',
    };
  }

  const config = readBootstrapAdminConfig(env);

  const existing = await users
    .createQueryBuilder('user')
    .withDeleted()
    .where('user.username = :username', { username: config.username })
    .getOne();

  if (existing !== null) {
    if (existing.role !== 'admin') {
      throw new Error(
        `BOOTSTRAP_ADMIN_USERNAME belongs to an existing non-administrator account: ${config.username}`,
      );
    }

    await activateAdmin(manager, existing.id, config);

    return {
      action: 'restored',
      fullName: config.fullName,
      message: 'The existing administrator account was reactivated with the configured key.',
      username: config.username,
    };
  }

  await users.save(
    users.create({
      accessKey: config.accessKey,
      accessKeyHash: config.accessKeyHash,
      fullName: config.fullName,
      isActive: true,
      isUniversalRouteSetter: false,
      passwordHash: config.accessKeyHash,
      role: 'admin',
      username: config.username,
    }),
  );

  return {
    action: 'created',
    fullName: config.fullName,
    message: 'The initial administrator account was created. The access key was not logged.',
    username: config.username,
  };
}

export function readBootstrapAdminConfig(env: NodeJS.ProcessEnv): BootstrapAdminConfig {
  const username = (env.BOOTSTRAP_ADMIN_USERNAME ?? 'system.admin').trim();
  const fullName = (env.BOOTSTRAP_ADMIN_FULL_NAME ?? 'System Administrator').trim();
  const sourceAccessKey = env.BOOTSTRAP_ADMIN_ACCESS_KEY?.trim();

  if (!/^[A-Za-z0-9._-]{3,100}$/.test(username)) {
    throw new Error(
      'BOOTSTRAP_ADMIN_USERNAME must contain 3-100 Latin letters, digits, dots, underscores or hyphens.',
    );
  }
  if (fullName.length < 2 || fullName.length > 200) {
    throw new Error('BOOTSTRAP_ADMIN_FULL_NAME must contain 2-200 characters.');
  }
  if (sourceAccessKey === undefined || sourceAccessKey.length === 0) {
    throw new Error('BOOTSTRAP_ADMIN_ACCESS_KEY is required when no active administrator exists.');
  }

  const normalizedAccessKey = normalizeAccessKey(sourceAccessKey);
  if (!/^[A-Z0-9]{12}$/.test(normalizedAccessKey)) {
    throw new Error(
      'BOOTSTRAP_ADMIN_ACCESS_KEY must contain exactly 12 Latin letters or digits; separators are optional.',
    );
  }
  if (!/[A-Z]/.test(normalizedAccessKey) || !/[0-9]/.test(normalizedAccessKey)) {
    throw new Error('BOOTSTRAP_ADMIN_ACCESS_KEY must contain both letters and digits.');
  }

  if (new Set(normalizedAccessKey).size < 8) {
    throw new Error('BOOTSTRAP_ADMIN_ACCESS_KEY is too predictable; use a randomly generated key.');
  }

  const accessKey = formatAccessKey(normalizedAccessKey);
  const accessKeyHash = hashAccessKey(accessKey);

  return { accessKey, accessKeyHash, fullName, username };
}

async function activateAdmin(
  manager: EntityManager,
  userId: string,
  config: BootstrapAdminConfig,
): Promise<void> {
  await manager.query(
    `UPDATE users
        SET role = 'admin',
            full_name = $1,
            username = $2,
            password_hash = $3,
            access_key = $4,
            access_key_hash = $3,
            is_active = TRUE,
            is_universal_route_setter = FALSE,
            shop_id = NULL,
            session_version = session_version + 1,
            deleted_at = NULL,
            updated_at = NOW()
      WHERE id = $5`,
    [config.fullName, config.username, config.accessKeyHash, config.accessKey, userId],
  );
}

if (require.main === module) {
  void run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown administrator bootstrap error';
    process.stderr.write(`Administrator bootstrap failed: ${message}\n`);
    process.exitCode = 1;
  });
}
