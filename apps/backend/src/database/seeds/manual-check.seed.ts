import { Repository } from 'typeorm';

import dataSource from '../data-source';
import { formatAccessKey, hashAccessKey } from '../../common/auth/access-key';
import { NfcTagEntity } from '../../modules/patrol-points/entities/nfc-tag.entity';
import { PatrolPointEntity } from '../../modules/patrol-points/entities/patrol-point.entity';
import { PatrolEventEntity } from '../../modules/patrols/entities/patrol-event.entity';
import { PatrolScheduleEntity } from '../../modules/patrols/entities/patrol-schedule.entity';
import { PatrolEntity } from '../../modules/patrols/entities/patrol.entity';
import { RegionEntity } from '../../modules/shops/entities/region.entity';
import { ShopEntity } from '../../modules/shops/entities/shop.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';

const SEED_MARKER = 'manual-check-seed';

type SeedResult = {
  admin: UserEntity;
  completedPatrol: PatrolEntity;
  employee: UserEntity;
  inProgressPatrol: PatrolEntity;
  manager: UserEntity;
  mobileAdmin: UserEntity;
  mobileEmployee: UserEntity;
  points: PatrolPointEntity[];
  shop: ShopEntity;
  tags: NfcTagEntity[];
};

async function run(): Promise<void> {
  await dataSource.initialize();

  try {
    await assertSchemaIsReady();
    const result = await seedManualCheckData();
    printSeedResult(result);
  } finally {
    await dataSource.destroy();
  }
}

async function assertSchemaIsReady(): Promise<void> {
  const requiredColumns = [
    { column: 'external_id', table: 'shops' },
    { column: 'route_status', table: 'shops' },
    { column: 'access_key', table: 'users' },
    { column: 'access_key_hash', table: 'users' },
    { column: 'client_local_id', table: 'patrol_events' },
    { column: 'late_sync', table: 'patrol_events' },
    { column: 'point_deactivated_after_scan', table: 'patrol_events' },
  ];

  const rows: unknown = await dataSource.query(
    `
      SELECT table_name AS "tableName", column_name AS "columnName"
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
    `,
    [[...new Set(requiredColumns.map((item) => item.table))]],
  );

  const existingColumns = new Set(
    toColumnRows(rows).map((row) => `${row.tableName}.${row.columnName}`),
  );
  const missingColumns = requiredColumns
    .filter((item) => !existingColumns.has(`${item.table}.${item.column}`))
    .map((item) => `${item.table}.${item.column}`);

  if (missingColumns.length > 0) {
    throw new Error(
      [
        'База данных не соответствует текущей схеме backend.',
        `Не найдены колонки: ${missingColumns.join(', ')}.`,
        'Сначала примените миграции: npm run backend:migration:run',
        'После успешных миграций повторите seed: npm run backend:seed:manual',
      ].join('\n'),
    );
  }
}

async function seedManualCheckData(): Promise<SeedResult> {
  const region = await findOrCreateRegion(dataSource.getRepository(RegionEntity));
  const shop = await findOrCreateShop(dataSource.getRepository(ShopEntity), region.id);
  const users = await findOrCreateUsers(dataSource.getRepository(UserEntity), shop.id);
  const tags = await findOrCreateNfcTags(dataSource.getRepository(NfcTagEntity), users.admin.id);
  const points = await findOrCreatePatrolPoints(
    dataSource.getRepository(PatrolPointEntity),
    shop.id,
    tags,
  );

  await findOrCreateSchedule(dataSource.getRepository(PatrolScheduleEntity), shop.id);

  const patrols = await findOrCreatePatrols(
    dataSource.getRepository(PatrolEntity),
    dataSource.getRepository(PatrolEventEntity),
    shop.id,
    users.employee.id,
    points,
    tags,
  );

  return {
    admin: users.admin,
    completedPatrol: patrols.completed,
    employee: users.employee,
    inProgressPatrol: patrols.inProgress,
    manager: users.manager,
    mobileAdmin: users.mobileAdmin,
    mobileEmployee: users.mobileEmployee,
    points,
    shop,
    tags,
  };
}

async function findOrCreateRegion(repository: Repository<RegionEntity>): Promise<RegionEntity> {
  const existing = await repository.findOne({ where: { name: 'Сибирь / ручная проверка' } });

  if (existing !== null) {
    return existing;
  }

  return repository.save(repository.create({ name: 'Сибирь / ручная проверка' }));
}

async function findOrCreateShop(
  repository: Repository<ShopEntity>,
  regionId: string,
): Promise<ShopEntity> {
  const existing = await repository.findOne({ where: { name: 'Магазин для ручной проверки' } });

  if (existing !== null) {
    existing.routeExpectedPoints = 3;
    existing.routeRegisteredPoints = 3;
    existing.routeStatus = 'ready';

    await repository.save(existing);

    return existing;
  }

  return repository.save(
    repository.create({
      address: 'Красноярск, тестовый контур',
      isActive: true,
      name: 'Магазин для ручной проверки',
      regionId,
      routeExpectedPoints: 3,
      routeRegisteredPoints: 3,
      routeStatus: 'ready',
      timezone: 'Asia/Krasnoyarsk',
    }),
  );
}

async function findOrCreateUsers(
  repository: Repository<UserEntity>,
  shopId: string,
): Promise<{
  admin: UserEntity;
  employee: UserEntity;
  manager: UserEntity;
  mobileAdmin: UserEntity;
  mobileEmployee: UserEntity;
}> {
  const admin = await findOrCreateUser(repository, {
    accessKey: 'SADM-SEED-0001',
    fullName: 'Администратор Seed',
    role: 'admin',
    username: 'seed.admin',
  });
  const manager = await findOrCreateUser(repository, {
    accessKey: 'MNGR-SEED-0001',
    fullName: 'Руководитель Seed',
    role: 'manager',
    shopId,
    username: 'seed.manager',
  });
  const employee = await findOrCreateUser(repository, {
    accessKey: 'EMPL-SEED-0001',
    fullName: 'Обходчик Seed',
    role: 'employee',
    shopId,
    username: 'seed.employee',
  });
  const mobileAdmin = await findOrCreateUser(repository, {
    accessKey: 'MADM-SEED-0001',
    fullName: 'Мобильный администратор Seed',
    role: 'admin',
    username: 'mobile.admin',
  });
  const mobileEmployee = await findOrCreateUser(repository, {
    accessKey: 'MEMP-SEED-0001',
    fullName: 'Мобильный обходчик Seed',
    role: 'employee',
    shopId,
    username: 'mobile.employee',
  });

  for (const user of [manager, employee, mobileEmployee]) {
    await ensureUserShopAssignment(repository, user.id, shopId);
  }

  return { admin, employee, manager, mobileAdmin, mobileEmployee };
}

async function ensureUserShopAssignment(
  repository: Repository<UserEntity>,
  userId: string,
  shopId: string,
): Promise<void> {
  await repository.query(
    `
      INSERT INTO user_shop_assignments (user_id, shop_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
    `,
    [userId, shopId],
  );
}

async function findOrCreateUser(
  repository: Repository<UserEntity>,
  data: Pick<UserEntity, 'fullName' | 'role' | 'shopId' | 'username'> & { accessKey: string },
): Promise<UserEntity> {
  const accessKey = formatAccessKey(data.accessKey);
  const accessKeyHash = hashAccessKey(accessKey);
  const existing = await repository.findOne({ where: { username: data.username } });

  if (existing !== null) {
    existing.accessKey = accessKey;
    existing.accessKeyHash = accessKeyHash;
    existing.passwordHash = accessKeyHash;
    existing.role = data.role;
    existing.shopId = data.shopId;

    await repository.save(existing);

    return existing;
  }

  return repository.save(
    repository.create({ ...data, accessKey, accessKeyHash, isActive: true, passwordHash: accessKeyHash }),
  );
}

async function findOrCreateNfcTags(
  repository: Repository<NfcTagEntity>,
  registeredBy: string,
): Promise<NfcTagEntity[]> {
  const tagInputs = [
    { payload: 'seed:entrance', uid: '04a1b2c3d4e501' },
    { payload: 'seed:warehouse', uid: '04a1b2c3d4e502' },
    { payload: 'seed:electrical', uid: '04a1b2c3d4e503' },
  ];
  const tags: NfcTagEntity[] = [];

  for (const input of tagInputs) {
    const existing = await repository.findOne({ where: { uid: input.uid } });

    if (existing !== null) {
      tags.push(existing);
      continue;
    }

    tags.push(
      await repository.save(
        repository.create({
          isActive: true,
          notes: SEED_MARKER,
          payload: input.payload,
          registeredBy,
          uid: input.uid,
        }),
      ),
    );
  }

  return tags;
}

async function findOrCreatePatrolPoints(
  repository: Repository<PatrolPointEntity>,
  shopId: string,
  tags: NfcTagEntity[],
): Promise<PatrolPointEntity[]> {
  const pointInputs = [
    { description: 'Входная группа магазина', name: 'Вход', sortOrder: 1, tag: tags[0] },
    { description: 'Складская зона', name: 'Склад', sortOrder: 2, tag: tags[1] },
    { description: 'Электрощитовая', name: 'Электрощитовая', sortOrder: 3, tag: tags[2] },
  ];
  const points: PatrolPointEntity[] = [];

  for (const input of pointInputs) {
    const existing = await repository.findOne({
      relations: { nfcTag: true },
      where: { name: input.name, shopId },
    });

    if (existing !== null) {
      points.push(existing);
      continue;
    }

    points.push(
      await repository.save(
        repository.create({
          description: input.description,
          isActive: true,
          name: input.name,
          nfcTagId: input.tag?.id,
          shopId,
          sortOrder: input.sortOrder,
        }),
      ),
    );
  }

  return points;
}

async function findOrCreateSchedule(
  repository: Repository<PatrolScheduleEntity>,
  shopId: string,
): Promise<PatrolScheduleEntity> {
  const existing = await repository.findOne({
    where: { name: 'Ежедневный тестовый обход', shopId },
  });

  if (existing !== null) {
    return existing;
  }

  return repository.save(
    repository.create({
      endTime: '23:00',
      isActive: true,
      name: 'Ежедневный тестовый обход',
      shopId,
      startTime: '09:00',
      weekdays: [1, 2, 3, 4, 5, 6, 7],
    }),
  );
}

async function findOrCreatePatrols(
  patrolRepository: Repository<PatrolEntity>,
  eventRepository: Repository<PatrolEventEntity>,
  shopId: string,
  employeeId: string,
  points: PatrolPointEntity[],
  tags: NfcTagEntity[],
): Promise<{ completed: PatrolEntity; inProgress: PatrolEntity }> {
  const completed = await findOrCreateCompletedPatrol(
    patrolRepository,
    eventRepository,
    shopId,
    employeeId,
    points,
    tags,
  );
  const inProgress = await findOrCreateInProgressPatrol(
    patrolRepository,
    eventRepository,
    shopId,
    employeeId,
    points,
    tags,
  );

  return { completed, inProgress };
}

async function findOrCreateCompletedPatrol(
  patrolRepository: Repository<PatrolEntity>,
  eventRepository: Repository<PatrolEventEntity>,
  shopId: string,
  employeeId: string,
  points: PatrolPointEntity[],
  tags: NfcTagEntity[],
): Promise<PatrolEntity> {
  const existing = await patrolRepository.findOne({
    where: { notes: `${SEED_MARKER}:completed`, shopId },
  });

  if (existing !== null) {
    return existing;
  }

  const now = new Date();
  const patrol = await patrolRepository.save(
    patrolRepository.create({
      completedAt: now,
      employeeId,
      notes: `${SEED_MARKER}:completed`,
      scannedPoints: points.length,
      shopId,
      startedAt: new Date(now.getTime() - 20 * 60 * 1000),
      status: 'completed',
      totalPoints: points.length,
    }),
  );

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    const tag = tags[index];

    if (point === undefined || tag === undefined) {
      continue;
    }

    await eventRepository.save(
      eventRepository.create({
        deviceId: 'seed-device-01',
        employeeId,
        gpsAccuracy: 5,
        lat: '56.010563',
        lng: '92.852572',
        nfcTagId: tag.id,
        nfcUid: tag.uid,
        patrolId: patrol.id,
        patrolPointId: point.id,
        scannedAt: new Date(now.getTime() - (15 - index * 5) * 60 * 1000),
      }),
    );
  }

  return patrol;
}

async function findOrCreateInProgressPatrol(
  patrolRepository: Repository<PatrolEntity>,
  eventRepository: Repository<PatrolEventEntity>,
  shopId: string,
  employeeId: string,
  points: PatrolPointEntity[],
  tags: NfcTagEntity[],
): Promise<PatrolEntity> {
  const existing = await patrolRepository.findOne({
    where: { notes: `${SEED_MARKER}:in-progress`, shopId },
  });

  if (existing !== null) {
    return existing;
  }

  const firstPoint = points[0];
  const firstTag = tags[0];
  const now = new Date();
  const patrol = await patrolRepository.save(
    patrolRepository.create({
      dueAt: new Date(now.getTime() + 60 * 60 * 1000),
      employeeId,
      notes: `${SEED_MARKER}:in-progress`,
      scannedPoints: firstPoint === undefined ? 0 : 1,
      shopId,
      startedAt: new Date(now.getTime() - 5 * 60 * 1000),
      status: 'in_progress',
      totalPoints: points.length,
    }),
  );

  if (firstPoint !== undefined && firstTag !== undefined) {
    await eventRepository.save(
      eventRepository.create({
        deviceId: 'seed-device-02',
        employeeId,
        gpsAccuracy: 6,
        lat: '56.010563',
        lng: '92.852572',
        nfcTagId: firstTag.id,
        nfcUid: firstTag.uid,
        patrolId: patrol.id,
        patrolPointId: firstPoint.id,
        scannedAt: new Date(now.getTime() - 4 * 60 * 1000),
      }),
    );
  }

  return patrol;
}

function printSeedResult(result: SeedResult): void {
  const payload = {
    credentials: {
      admin: { accessKey: result.admin.accessKey, username: result.admin.username },
      employee: { accessKey: result.employee.accessKey, username: result.employee.username },
      manager: { accessKey: result.manager.accessKey, username: result.manager.username },
      mobileAdmin: { accessKey: result.mobileAdmin.accessKey, username: result.mobileAdmin.username },
      mobileEmployee: { accessKey: result.mobileEmployee.accessKey, username: result.mobileEmployee.username },
    },
    ids: {
      completedPatrolId: result.completedPatrol.id,
      inProgressPatrolId: result.inProgressPatrol.id,
      pointIds: result.points.map((point) => point.id),
      shopId: result.shop.id,
      tagIds: result.tags.map((tag) => tag.id),
    },
    nfcUids: result.tags.map((tag) => tag.uid),
  };

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function toColumnRows(rows: unknown): Array<{ columnName: string; tableName: string }> {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.filter(
    (row): row is { columnName: string; tableName: string } => {
      if (typeof row !== 'object' || row === null) {
        return false;
      }

      const record = row as Record<string, unknown>;

      return typeof record.columnName === 'string' && typeof record.tableName === 'string';
    },
  );
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
