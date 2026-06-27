import { PatrolIncidentType, RouteStatus } from '@patrol/shared';
import { Repository } from 'typeorm';

import { formatAccessKey, hashAccessKey } from '../../common/auth/access-key';
import { NfcTagEntity } from '../../modules/patrol-points/entities/nfc-tag.entity';
import { PatrolPointEntity } from '../../modules/patrol-points/entities/patrol-point.entity';
import { PatrolEventEntity } from '../../modules/patrols/entities/patrol-event.entity';
import { PatrolIncidentEntity } from '../../modules/patrols/entities/patrol-incident.entity';
import { PatrolScheduleEntity } from '../../modules/patrols/entities/patrol-schedule.entity';
import { PatrolEntity } from '../../modules/patrols/entities/patrol.entity';
import { RegionEntity } from '../../modules/shops/entities/region.entity';
import { ShopEntity } from '../../modules/shops/entities/shop.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import dataSource from '../data-source';

const SEED_MARKER = 'scenarios-seed';
const MINUTE_MS = 60 * 1000;
const seedStartedAt = Date.now();

type Repositories = {
  events: Repository<PatrolEventEntity>;
  incidents: Repository<PatrolIncidentEntity>;
  patrols: Repository<PatrolEntity>;
  points: Repository<PatrolPointEntity>;
  regions: Repository<RegionEntity>;
  schedules: Repository<PatrolScheduleEntity>;
  shops: Repository<ShopEntity>;
  tags: Repository<NfcTagEntity>;
  users: Repository<UserEntity>;
};

type SeedSummary = {
  credentials: Record<string, string | undefined>;
  nfcUids: Record<string, string[]>;
  notes: Record<string, string>;
  shops: Record<string, string>;
};

type ShopInput = {
  address: string;
  externalId: string;
  name: string;
  regionId: string;
  routeExpectedPoints: number;
  routeRegisteredPoints: number;
  routeStatus: RouteStatus;
  timezone: string;
};

type UserInput = {
  accessKey: string;
  fullName: string;
  isActive?: boolean;
  role: UserEntity['role'];
  shopId?: string;
  username: string;
};

type PointInput = {
  description: string;
  name: string;
  tag?: NfcTagEntity;
};

type ScheduleInput = {
  endTime: string;
  isActive: boolean;
  name: string;
  startTime: string;
  weekdays: number[];
};

type PatrolInput = {
  cancellationReason?: string;
  cancelledAt?: Date;
  completedAt?: Date;
  completionReport?: string;
  dueAt?: Date;
  employeeId: string;
  events: Array<{ point: PatrolPointEntity; scannedAt: Date; tag?: NfcTagEntity }>;
  note: string;
  scannedPoints: number;
  shopId: string;
  startedAt: Date;
  status: PatrolEntity['status'];
  totalPoints: number;
};

async function run(): Promise<void> {
  await dataSource.initialize();

  try {
    await assertSchemaIsReady();
    const summary = await seedScenarios(createRepositories());
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  } finally {
    await dataSource.destroy();
  }
}

function createRepositories(): Repositories {
  return {
    events: dataSource.getRepository(PatrolEventEntity),
    incidents: dataSource.getRepository(PatrolIncidentEntity),
    patrols: dataSource.getRepository(PatrolEntity),
    points: dataSource.getRepository(PatrolPointEntity),
    regions: dataSource.getRepository(RegionEntity),
    schedules: dataSource.getRepository(PatrolScheduleEntity),
    shops: dataSource.getRepository(ShopEntity),
    tags: dataSource.getRepository(NfcTagEntity),
    users: dataSource.getRepository(UserEntity),
  };
}

async function assertSchemaIsReady(): Promise<void> {
  const requiredColumns = [
    { column: 'external_id', table: 'shops' },
    { column: 'route_status', table: 'shops' },
    { column: 'route_expected_points', table: 'shops' },
    { column: 'route_registered_points', table: 'shops' },
    { column: 'access_key', table: 'users' },
    { column: 'access_key_hash', table: 'users' },
    { column: 'completion_report', table: 'patrols' },
    { column: 'cancellation_reason', table: 'patrols' },
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
        'После успешных миграций повторите seed: npm run backend:seed:scenarios',
      ].join('\n'),
    );
  }
}

async function seedScenarios(repositories: Repositories): Promise<SeedSummary> {
  const region = await findOrCreateRegion(repositories.regions);

  const shopIrkutsk = await findOrCreateShop(repositories.shops, {
    address: 'Иркутск, ул. Демонстрационная, 1',
    externalId: 'DEMO-IRK',
    name: 'Демо - Иркутск',
    regionId: region.id,
    routeExpectedPoints: 4,
    routeRegisteredPoints: 4,
    routeStatus: RouteStatus.READY,
    timezone: 'Asia/Irkutsk',
  });
  const shopMoscow = await findOrCreateShop(repositories.shops, {
    address: 'Москва, ул. Демонстрационная, 2',
    externalId: 'DEMO-MSK',
    name: 'Демо - Москва',
    regionId: region.id,
    routeExpectedPoints: 3,
    routeRegisteredPoints: 3,
    routeStatus: RouteStatus.READY,
    timezone: 'Europe/Moscow',
  });
  const shopSetup = await findOrCreateShop(repositories.shops, {
    address: 'Красноярск, ул. Демонстрационная, 3',
    externalId: 'DEMO-KRS',
    name: 'Демо - Красноярск (настройка маршрута)',
    regionId: region.id,
    routeExpectedPoints: 4,
    routeRegisteredPoints: 2,
    routeStatus: RouteStatus.SETUP_IN_PROGRESS,
    timezone: 'Asia/Krasnoyarsk',
  });
  const shopNotConfigured = await findOrCreateShop(repositories.shops, {
    address: 'Владивосток, ул. Демонстрационная, 4',
    externalId: 'DEMO-VVO',
    name: 'Демо - Владивосток (без маршрута)',
    regionId: region.id,
    routeExpectedPoints: 0,
    routeRegisteredPoints: 0,
    routeStatus: RouteStatus.NOT_CONFIGURED,
    timezone: 'Asia/Vladivostok',
  });

  const users = {
    admin: await findOrCreateUser(repositories.users, {
      accessKey: 'ADMN-DEMO-0001',
      fullName: 'Демо Администратор',
      role: 'admin',
      username: 'demo.admin',
    }),
    employeeInactive: await findOrCreateUser(repositories.users, {
      accessKey: 'EMPL-INAC-0001',
      fullName: 'Демо Обходчик Неактивный',
      isActive: false,
      role: 'employee',
      shopId: shopIrkutsk.id,
      username: 'demo.employee.inactive',
    }),
    employeeIrkutsk: await findOrCreateUser(repositories.users, {
      accessKey: 'EMPL-IRKK-0001',
      fullName: 'Демо Обходчик Иркутск',
      role: 'employee',
      shopId: shopIrkutsk.id,
      username: 'demo.employee.irkutsk',
    }),
    employeeMoscow: await findOrCreateUser(repositories.users, {
      accessKey: 'EMPL-MSKK-0001',
      fullName: 'Демо Обходчик Москва',
      role: 'employee',
      shopId: shopMoscow.id,
      username: 'demo.employee.moscow',
    }),
    employeeMultiShop: await findOrCreateUser(repositories.users, {
      accessKey: 'EMPL-MULT-0001',
      fullName: 'Демо Обходчик Несколько Магазинов',
      role: 'employee',
      shopId: shopIrkutsk.id,
      username: 'demo.employee.multi',
    }),
    managerIrkutsk: await findOrCreateUser(repositories.users, {
      accessKey: 'MNGR-IRKK-0001',
      fullName: 'Демо Менеджер Иркутск',
      role: 'manager',
      shopId: shopIrkutsk.id,
      username: 'demo.manager.irkutsk',
    }),
    managerMoscow: await findOrCreateUser(repositories.users, {
      accessKey: 'MNGR-MSKK-0001',
      fullName: 'Демо Менеджер Москва',
      role: 'manager',
      shopId: shopMoscow.id,
      username: 'demo.manager.moscow',
    }),
  };

  await assignShop(repositories.users, users.managerIrkutsk.id, shopIrkutsk.id);
  await assignShop(repositories.users, users.managerMoscow.id, shopMoscow.id);
  await assignShop(repositories.users, users.employeeIrkutsk.id, shopIrkutsk.id);
  await assignShop(repositories.users, users.employeeInactive.id, shopIrkutsk.id);
  await assignShop(repositories.users, users.employeeMoscow.id, shopMoscow.id);
  await assignShop(repositories.users, users.employeeMultiShop.id, shopIrkutsk.id);
  await assignShop(repositories.users, users.employeeMultiShop.id, shopMoscow.id);

  const irkutskTags = await ensureTags(repositories.tags, users.admin.id, [
    '04demoirk0001',
    '04demoirk0002',
    '04demoirk0003',
    '04demoirk0004',
  ]);
  const irkutskPoints = await ensurePoints(repositories.points, shopIrkutsk.id, [
    { description: 'Входная группа магазина', name: 'Вход', tag: irkutskTags[0] },
    { description: 'Складская зона', name: 'Склад', tag: irkutskTags[1] },
    { description: 'Электрощитовая', name: 'Электрощитовая', tag: irkutskTags[2] },
    { description: 'Кассовая зона', name: 'Касса', tag: irkutskTags[3] },
  ]);

  const moscowTags = await ensureTags(repositories.tags, users.admin.id, [
    '04demomsk0001',
    '04demomsk0002',
    '04demomsk0003',
  ]);
  const moscowPoints = await ensurePoints(repositories.points, shopMoscow.id, [
    { description: 'Входная группа магазина', name: 'Вход', tag: moscowTags[0] },
    { description: 'Торговый зал', name: 'Торговый зал', tag: moscowTags[1] },
    { description: 'Подсобное помещение', name: 'Подсобка', tag: moscowTags[2] },
  ]);

  const setupTags = await ensureTags(repositories.tags, users.admin.id, [
    '04demokrs0001',
    '04demokrs0002',
  ]);
  await ensurePoints(repositories.points, shopSetup.id, [
    { description: 'Уже привязана', name: 'Точка 1', tag: setupTags[0] },
    { description: 'Уже привязана', name: 'Точка 2', tag: setupTags[1] },
    { description: 'Ожидает NFC-метку', name: 'Точка 3' },
    { description: 'Ожидает NFC-метку', name: 'Точка 4' },
  ]);

  await ensureSchedule(repositories.schedules, shopIrkutsk.id, {
    endTime: '23:59',
    isActive: true,
    name: 'Круглосуточный демо-обход',
    startTime: '00:00',
    weekdays: [1, 2, 3, 4, 5, 6, 7],
  });
  await ensureSchedule(repositories.schedules, shopIrkutsk.id, {
    endTime: '10:00',
    isActive: true,
    name: 'Утренний обход',
    startTime: '08:00',
    weekdays: [1, 2, 3, 4, 5],
  });
  await ensureSchedule(repositories.schedules, shopIrkutsk.id, {
    endTime: '13:00',
    isActive: false,
    name: 'Отключенное расписание',
    startTime: '12:00',
    weekdays: [1, 2, 3, 4, 5, 6, 7],
  });
  await ensureSchedule(repositories.schedules, shopMoscow.id, {
    endTime: '21:00',
    isActive: true,
    name: 'Дневной обход',
    startTime: '09:00',
    weekdays: [1, 2, 3, 4, 5, 6, 7],
  });

  await seedPatrolScenarios(
    repositories,
    shopIrkutsk,
    shopMoscow,
    users.employeeIrkutsk,
    users.employeeMoscow,
    irkutskPoints,
    irkutskTags,
    moscowPoints,
    moscowTags,
  );

  return {
    credentials: {
      admin: users.admin.accessKey,
      employeeInactive: users.employeeInactive.accessKey,
      employeeIrkutsk: users.employeeIrkutsk.accessKey,
      employeeMoscow: users.employeeMoscow.accessKey,
      employeeMultiShop: users.employeeMultiShop.accessKey,
      managerIrkutsk: users.managerIrkutsk.accessKey,
      managerMoscow: users.managerMoscow.accessKey,
    },
    nfcUids: {
      irkutsk: irkutskTags.map((tag) => tag.uid),
      krasnoyarskSetup: setupTags.map((tag) => tag.uid),
      moscow: moscowTags.map((tag) => tag.uid),
    },
    notes: {
      employeeInactive: 'Вход должен быть заблокирован, пользователь isActive=false.',
      employeeIrkutsk: 'Нет активного обхода: удобно проверять старт по расписанию и внеплановый старт.',
      employeeMoscow: 'Есть активный обход и просроченный обход в истории.',
      shopNotConfigured: 'Магазин без маршрута: старт обхода должен вернуть PATROL_ROUTE_NOT_READY.',
      shopSetup: 'Маршрут частично настроен: следующий bind-nfc должен продолжить с точки 3.',
    },
    shops: {
      irkutsk: shopIrkutsk.id,
      krasnoyarskSetup: shopSetup.id,
      moscow: shopMoscow.id,
      vladivostokNotConfigured: shopNotConfigured.id,
    },
  };
}

async function seedPatrolScenarios(
  repositories: Repositories,
  shopIrkutsk: ShopEntity,
  shopMoscow: ShopEntity,
  employeeIrkutsk: UserEntity,
  employeeMoscow: UserEntity,
  irkutskPoints: PatrolPointEntity[],
  irkutskTags: NfcTagEntity[],
  moscowPoints: PatrolPointEntity[],
  moscowTags: NfcTagEntity[],
): Promise<void> {
  await ensurePatrol(repositories, {
    completedAt: minutesAgo(20),
    employeeId: employeeIrkutsk.id,
    events: irkutskPoints.map((point, index) => ({
      point,
      scannedAt: minutesAgo(38 - index * 5),
      tag: irkutskTags[index],
    })),
    note: `${SEED_MARKER}:irkutsk:completed`,
    scannedPoints: irkutskPoints.length,
    shopId: shopIrkutsk.id,
    startedAt: minutesAgo(40),
    status: 'completed',
    totalPoints: irkutskPoints.length,
  });

  const reportPatrol = await ensurePatrol(repositories, {
    completedAt: minutesAgo(120),
    completionReport:
      'На точке "Склад" задержался: помогал покупателю найти товар. Перед электрощитовой ждал, пока освободит проход персонал.',
    employeeId: employeeIrkutsk.id,
    events: irkutskPoints.map((point, index) => ({
      point,
      scannedAt: minutesAgo(178 - index * 10),
      tag: irkutskTags[index],
    })),
    note: `${SEED_MARKER}:irkutsk:report`,
    scannedPoints: irkutskPoints.length,
    shopId: shopIrkutsk.id,
    startedAt: minutesAgo(180),
    status: 'completed',
    totalPoints: irkutskPoints.length,
  });

  await ensurePatrol(repositories, {
    cancellationReason: 'Срочно вызвали к руководству, начну обход заново позже.',
    cancelledAt: minutesAgo(295),
    employeeId: employeeIrkutsk.id,
    events: irkutskPoints.slice(0, 2).map((point, index) => ({
      point,
      scannedAt: minutesAgo(299 - index * 2),
      tag: irkutskTags[index],
    })),
    note: `${SEED_MARKER}:irkutsk:cancelled`,
    scannedPoints: 2,
    shopId: shopIrkutsk.id,
    startedAt: minutesAgo(300),
    status: 'cancelled',
    totalPoints: irkutskPoints.length,
  });

  await ensureIncident(repositories.incidents, {
    actualSeconds: 45,
    expectedSeconds: 3600,
    fromPatrolPointId: irkutskPoints[0]?.id,
    message: 'Подозрительно короткий интервал между точками',
    patrolId: reportPatrol.id,
    shopId: shopIrkutsk.id,
    toPatrolPointId: irkutskPoints[1]?.id,
    type: PatrolIncidentType.SHORT_INTERVAL,
  });
  await ensureIncident(repositories.incidents, {
    actualSeconds: 5400,
    expectedSeconds: 600,
    fromPatrolPointId: irkutskPoints[1]?.id,
    message: 'Слишком долгий интервал между точками',
    patrolId: reportPatrol.id,
    shopId: shopIrkutsk.id,
    toPatrolPointId: irkutskPoints[2]?.id,
    type: PatrolIncidentType.LONG_INTERVAL,
  });
  await ensureIncident(repositories.incidents, {
    fromPatrolPointId: irkutskPoints[0]?.id,
    message: 'Пропущены точки маршрута между 1 и 3',
    patrolId: reportPatrol.id,
    shopId: shopIrkutsk.id,
    toPatrolPointId: irkutskPoints[2]?.id,
    type: PatrolIncidentType.MISSED_POINT,
  });

  await ensurePatrol(repositories, {
    completedAt: minutesAgo(70),
    employeeId: employeeMoscow.id,
    events: moscowPoints.map((point, index) => ({
      point,
      scannedAt: minutesAgo(88 - index * 6),
      tag: moscowTags[index],
    })),
    note: `${SEED_MARKER}:moscow:completed`,
    scannedPoints: moscowPoints.length,
    shopId: shopMoscow.id,
    startedAt: minutesAgo(90),
    status: 'completed',
    totalPoints: moscowPoints.length,
  });

  await ensurePatrol(repositories, {
    dueAt: minutesAgo(60),
    employeeId: employeeMoscow.id,
    events: moscowPoints.slice(0, 2).map((point, index) => ({
      point,
      scannedAt: minutesAgo(178 - index * 5),
      tag: moscowTags[index],
    })),
    note: `${SEED_MARKER}:moscow:overdue`,
    scannedPoints: 2,
    shopId: shopMoscow.id,
    startedAt: minutesAgo(180),
    status: 'overdue',
    totalPoints: moscowPoints.length,
  });

  await ensurePatrol(repositories, {
    dueAt: minutesAhead(50),
    employeeId: employeeMoscow.id,
    events: moscowPoints.slice(0, 1).map((point) => ({
      point,
      scannedAt: minutesAgo(8),
      tag: moscowTags[0],
    })),
    note: `${SEED_MARKER}:moscow:in-progress`,
    scannedPoints: 1,
    shopId: shopMoscow.id,
    startedAt: minutesAgo(10),
    status: 'in_progress',
    totalPoints: moscowPoints.length,
  });
}

async function findOrCreateRegion(repository: Repository<RegionEntity>): Promise<RegionEntity> {
  const existing = await repository.findOne({ where: { name: 'Демо-сценарии' } });

  if (existing !== null) {
    return existing;
  }

  return repository.save(repository.create({ name: 'Демо-сценарии' }));
}

async function findOrCreateShop(
  repository: Repository<ShopEntity>,
  input: ShopInput,
): Promise<ShopEntity> {
  const existing = await repository.findOne({ where: { externalId: input.externalId } });

  if (existing !== null) {
    existing.address = input.address;
    existing.isActive = true;
    existing.name = input.name;
    existing.regionId = input.regionId;
    existing.routeExpectedPoints = input.routeExpectedPoints;
    existing.routeRegisteredPoints = input.routeRegisteredPoints;
    existing.routeStatus = input.routeStatus;
    existing.timezone = input.timezone;

    return repository.save(existing);
  }

  return repository.save(repository.create({ isActive: true, ...input }));
}

async function findOrCreateUser(
  repository: Repository<UserEntity>,
  input: UserInput,
): Promise<UserEntity> {
  const accessKey = formatAccessKey(input.accessKey);
  const accessKeyHash = hashAccessKey(accessKey);
  const existing = await repository.findOne({ where: { username: input.username } });

  if (existing !== null) {
    existing.accessKey = accessKey;
    existing.accessKeyHash = accessKeyHash;
    existing.fullName = input.fullName;
    existing.isActive = input.isActive ?? true;
    existing.passwordHash = accessKeyHash;
    existing.role = input.role;
    existing.shopId = input.shopId;

    return repository.save(existing);
  }

  return repository.save(
    repository.create({
      accessKey,
      accessKeyHash,
      fullName: input.fullName,
      isActive: input.isActive ?? true,
      passwordHash: accessKeyHash,
      role: input.role,
      shopId: input.shopId,
      username: input.username,
    }),
  );
}

async function assignShop(
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

async function ensureTags(
  repository: Repository<NfcTagEntity>,
  registeredBy: string,
  uids: string[],
): Promise<NfcTagEntity[]> {
  const tags: NfcTagEntity[] = [];

  for (const uid of uids) {
    const existing = await repository.findOne({ where: { uid } });

    if (existing !== null) {
      existing.isActive = true;
      existing.notes = SEED_MARKER;
      existing.payload = `${SEED_MARKER}:${uid}`;
      existing.registeredBy = registeredBy;
      tags.push(await repository.save(existing));
      continue;
    }

    tags.push(
      await repository.save(
        repository.create({
          isActive: true,
          notes: SEED_MARKER,
          payload: `${SEED_MARKER}:${uid}`,
          registeredBy,
          uid,
        }),
      ),
    );
  }

  return tags;
}

async function ensurePoints(
  repository: Repository<PatrolPointEntity>,
  shopId: string,
  inputs: PointInput[],
): Promise<PatrolPointEntity[]> {
  const points: PatrolPointEntity[] = [];

  for (let index = 0; index < inputs.length; index += 1) {
    const input = inputs[index];

    if (input === undefined) {
      continue;
    }

    const existing = await repository.findOne({ where: { name: input.name, shopId } });

    if (existing !== null) {
      existing.description = input.description;
      existing.isActive = true;
      existing.nfcTagId = input.tag?.id;
      existing.sortOrder = index + 1;
      points.push(await repository.save(existing));
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
          sortOrder: index + 1,
        }),
      ),
    );
  }

  return points;
}

async function ensureSchedule(
  repository: Repository<PatrolScheduleEntity>,
  shopId: string,
  input: ScheduleInput,
): Promise<PatrolScheduleEntity> {
  const existing = await repository.findOne({ where: { name: input.name, shopId } });

  if (existing !== null) {
    existing.endTime = input.endTime;
    existing.isActive = input.isActive;
    existing.startTime = input.startTime;
    existing.weekdays = input.weekdays;

    return repository.save(existing);
  }

  return repository.save(repository.create({ shopId, ...input }));
}

async function ensurePatrol(
  repositories: Repositories,
  input: PatrolInput,
): Promise<PatrolEntity> {
  const existing = await repositories.patrols.findOne({
    where: { notes: input.note, shopId: input.shopId },
  });

  if (existing !== null) {
    return existing;
  }

  const patrol = await repositories.patrols.save(
    repositories.patrols.create({
      cancellationReason: input.cancellationReason,
      cancelledAt: input.cancelledAt,
      completedAt: input.completedAt,
      completionReport: input.completionReport,
      dueAt: input.dueAt,
      employeeId: input.employeeId,
      notes: input.note,
      scannedPoints: input.scannedPoints,
      shopId: input.shopId,
      startedAt: input.startedAt,
      status: input.status,
      totalPoints: input.totalPoints,
    }),
  );

  for (const event of input.events) {
    if (event.tag === undefined) {
      continue;
    }

    await repositories.events.save(
      repositories.events.create({
        deviceId: 'scenario-seed-device',
        employeeId: input.employeeId,
        gpsAccuracy: 5,
        lat: '52.289588',
        lng: '104.280606',
        nfcTagId: event.tag.id,
        nfcUid: event.tag.uid,
        patrolId: patrol.id,
        patrolPointId: event.point.id,
        scannedAt: event.scannedAt,
      }),
    );
  }

  return patrol;
}

async function ensureIncident(
  repository: Repository<PatrolIncidentEntity>,
  input: {
    actualSeconds?: number;
    expectedSeconds?: number;
    fromPatrolPointId?: string;
    message: string;
    patrolId: string;
    shopId: string;
    toPatrolPointId?: string;
    type: PatrolIncidentType;
  },
): Promise<void> {
  const existing = await repository.findOne({
    where: { patrolId: input.patrolId, type: input.type },
  });

  if (existing !== null) {
    return;
  }

  await repository.save(repository.create(input));
}

function minutesAgo(minutes: number): Date {
  return new Date(seedStartedAt - minutes * MINUTE_MS);
}

function minutesAhead(minutes: number): Date {
  return new Date(seedStartedAt + minutes * MINUTE_MS);
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
