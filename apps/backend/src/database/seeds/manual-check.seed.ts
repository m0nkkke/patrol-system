import { PatrolPointVisitStatus, PatrolScanAction } from '@patrol/shared';
import { Repository } from 'typeorm';

import { formatAccessKey, hashAccessKey } from '../../common/auth/access-key';
import { NfcTagEntity } from '../../modules/patrol-points/entities/nfc-tag.entity';
import { PatrolPointEntity } from '../../modules/patrol-points/entities/patrol-point.entity';
import { PatrolEventEntity } from '../../modules/patrols/entities/patrol-event.entity';
import { PatrolPointVisitEntity } from '../../modules/patrols/entities/patrol-point-visit.entity';
import { PatrolRoutePointEntity } from '../../modules/patrols/entities/patrol-route-point.entity';
import { PatrolRouteEntity } from '../../modules/patrols/entities/patrol-route.entity';
import { PatrolScheduleEntity } from '../../modules/patrols/entities/patrol-schedule.entity';
import { PatrolEntity } from '../../modules/patrols/entities/patrol.entity';
import { RegionEntity } from '../../modules/shops/entities/region.entity';
import { ShopEntity } from '../../modules/shops/entities/shop.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import dataSource from '../data-source';

const SEED_MARKER = 'manual-check-seed';
const MINUTE_MS = 60_000;

type SeedUser = {
  accessKey: string;
  fullName: string;
  isUniversalRouteSetter?: boolean;
  role: UserEntity['role'];
  shopId?: string;
  username: string;
};

async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    await assertSchemaIsReady();
    process.stdout.write(`${JSON.stringify(await seedManualCheckData(), null, 2)}\n`);
  } finally {
    await dataSource.destroy();
  }
}

async function assertSchemaIsReady(): Promise<void> {
  const required = [
    'patrol_routes',
    'patrol_route_points',
    'patrol_point_visits',
    'route_timing_profiles',
    'patrol_reports',
  ];
  const rows: unknown = await dataSource.query(
    `SELECT table_name AS "tableName" FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [required],
  );
  const existing = new Set(
    Array.isArray(rows)
      ? rows.flatMap((row) => {
          const value = row as { tableName?: unknown };
          return typeof value.tableName === 'string' ? [value.tableName] : [];
        })
      : [],
  );
  const missing = required.filter((table) => !existing.has(table));
  if (missing.length > 0) {
    throw new Error(
      `Database schema is outdated. Missing tables: ${missing.join(', ')}. ` +
        'Run npm run backend:migration:run before the seed.',
    );
  }
}

async function seedManualCheckData(): Promise<Record<string, unknown>> {
  const region = await ensureRegion();
  const shop = await ensureShop(region.id);
  const users = await ensureUsers(shop.id);
  const admin = users.admin;
  const guard = users.guard;
  if (admin === undefined || guard === undefined) throw new Error('Seed users were not created');
  const tags = await ensureTags(admin.id);
  const points = await ensurePoints(shop.id, tags);
  const route = await ensureRoute(shop.id, points);
  const schedule = await ensureSchedule(shop.id, route.id);
  const base = { employeeId: guard.id, points, routeId: route.id, scheduleId: schedule.id, shopId: shop.id, tags };
  const completedPatrol = await ensurePatrol({ ...base, marker: `${SEED_MARKER}:completed`, status: 'completed' });
  const inProgressPatrol = await ensurePatrol({ ...base, marker: `${SEED_MARKER}:in-progress`, status: 'in_progress' });

  return {
    credentials: Object.fromEntries(
      Object.entries(users).map(([key, user]) => [key, { accessKey: user.accessKey, username: user.username }]),
    ),
    ids: {
      completedPatrolId: completedPatrol.id,
      inProgressPatrolId: inProgressPatrol.id,
      pointIds: points.map((point) => point.id),
      routeId: route.id,
      scheduleId: schedule.id,
      shopId: shop.id,
    },
    nextAction: { patrolId: inProgressPatrol.id, scanAction: PatrolScanAction.DEPART, uid: tags[0]?.uid },
    nfcUids: tags.map((tag) => tag.uid),
  };
}

async function ensureRegion(): Promise<RegionEntity> {
  const repository = dataSource.getRepository(RegionEntity);
  const existing = await repository.findOne({ where: { name: 'Seed region' } });
  return repository.save(repository.create({ id: existing?.id, name: 'Seed region' }));
}

async function ensureShop(regionId: string): Promise<ShopEntity> {
  const repository = dataSource.getRepository(ShopEntity);
  const existing = await repository.findOne({ where: { externalId: 'SEED-MANUAL' } });
  return repository.save(repository.create({
    address: 'Krasnoyarsk, manual API check', externalId: 'SEED-MANUAL', id: existing?.id,
    isActive: true, name: 'Manual check shop', regionId, routeExpectedPoints: 3,
    routeRegisteredPoints: 3, routeStatus: 'ready', timezone: 'Asia/Krasnoyarsk',
  }));
}

async function ensureUsers(shopId: string): Promise<Record<string, UserEntity>> {
  const inputs: Record<string, SeedUser> = {
    admin: { accessKey: 'SADM-SEED-0001', fullName: 'Seed Administrator', role: 'admin', username: 'seed.admin' },
    guard: { accessKey: 'EMPL-SEED-0001', fullName: 'Seed Security Guard', role: 'security_guard', shopId, username: 'seed.employee' },
    inspector: { accessKey: 'MNGR-SEED-0001', fullName: 'Seed Inspector', role: 'inspector', shopId, username: 'seed.manager' },
    universalRouteSetter: {
      accessKey: 'RSET-SEED-0001', fullName: 'Universal Route Setter Account',
      isUniversalRouteSetter: true, role: 'route_setter', username: 'seed.route-setter',
    },
  };
  const result: Record<string, UserEntity> = {};
  for (const [key, input] of Object.entries(inputs)) {
    const user = await ensureUser(input);
    result[key] = user;
    if (input.shopId !== undefined) await assignShop(user.id, input.shopId);
  }
  return result;
}

async function ensureUser(input: SeedUser): Promise<UserEntity> {
  const repository = dataSource.getRepository(UserEntity);
  const existing = await repository.findOne({ where: { username: input.username } });
  const accessKey = formatAccessKey(input.accessKey);
  const accessKeyHash = hashAccessKey(accessKey);
  return repository.save(repository.create({
    accessKey, accessKeyHash, fullName: input.fullName, id: existing?.id, isActive: true,
    isUniversalRouteSetter: input.isUniversalRouteSetter ?? false, passwordHash: accessKeyHash,
    role: input.role, shopId: input.shopId, username: input.username,
  }));
}

async function assignShop(userId: string, shopId: string): Promise<void> {
  await dataSource.query(
    `INSERT INTO user_shop_assignments (user_id, shop_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, shopId],
  );
}

async function ensureTags(registeredBy: string): Promise<NfcTagEntity[]> {
  const repository = dataSource.getRepository(NfcTagEntity);
  const result: NfcTagEntity[] = [];
  for (const uid of ['04a1b2c3d4e501', '04a1b2c3d4e502', '04a1b2c3d4e503']) {
    const existing = await repository.findOne({ where: { uid } });
    result.push(await repository.save(repository.create({
      id: existing?.id, isActive: true, notes: SEED_MARKER,
      payload: `${SEED_MARKER}:${uid}`, registeredBy, uid,
    })));
  }
  return result;
}

async function ensurePoints(shopId: string, tags: NfcTagEntity[]): Promise<PatrolPointEntity[]> {
  const repository = dataSource.getRepository(PatrolPointEntity);
  const inputs = [
    { description: 'Main entrance', name: 'Entrance' },
    { description: 'Warehouse area', name: 'Warehouse' },
    { description: 'Electrical room', name: 'Electrical room' },
  ];
  const result: PatrolPointEntity[] = [];
  for (let index = 0; index < inputs.length; index += 1) {
    const input = inputs[index];
    const tag = tags[index];
    if (input === undefined || tag === undefined) continue;
    const existing = await repository.findOne({ where: { name: input.name, shopId } });
    result.push(await repository.save(repository.create({
      ...input, id: existing?.id, isActive: true, nfcTagId: tag.id, shopId, sortOrder: index + 1,
    })));
  }
  return result;
}

async function ensureRoute(shopId: string, points: PatrolPointEntity[]): Promise<PatrolRouteEntity> {
  const repository = dataSource.getRepository(PatrolRouteEntity);
  const pointRepository = dataSource.getRepository(PatrolRoutePointEntity);
  const existing = await repository.findOne({ where: { name: 'Manual internal route', shopId } });
  const route = await repository.save(repository.create({
    category: 'internal', id: existing?.id, isActive: true, name: 'Manual internal route', shopId,
  }));
  await pointRepository.delete({ routeId: route.id });
  await pointRepository.save(points.map((point, index) => pointRepository.create({
    patrolPointId: point.id, routeId: route.id, sortOrder: index + 1,
  })));
  return route;
}

async function ensureSchedule(shopId: string, routeId: string): Promise<PatrolScheduleEntity> {
  const repository = dataSource.getRepository(PatrolScheduleEntity);
  const existing = await repository.findOne({ where: { name: 'Manual morning patrol', shopId } });
  return repository.save(repository.create({
    earlyStartMinutes: 30, endTime: '23:00', id: existing?.id, isActive: true,
    name: 'Manual morning patrol', period: 'morning', routeId, shopId, startTime: '09:00',
    weekdays: [1, 2, 3, 4, 5, 6, 7],
  }));
}

async function ensurePatrol(input: {
  employeeId: string; marker: string; points: PatrolPointEntity[]; routeId: string;
  scheduleId: string; shopId: string; status: 'completed' | 'in_progress'; tags: NfcTagEntity[];
}): Promise<PatrolEntity> {
  const patrolRepository = dataSource.getRepository(PatrolEntity);
  const eventRepository = dataSource.getRepository(PatrolEventEntity);
  const visitRepository = dataSource.getRepository(PatrolPointVisitEntity);
  const existing = await patrolRepository.findOne({ where: { notes: input.marker } });
  const now = new Date();
  const completed = input.status === 'completed';
  const patrol = await patrolRepository.save(patrolRepository.create({
    completedAt: completed ? now : undefined,
    dueAt: completed ? undefined : new Date(now.getTime() + 60 * MINUTE_MS),
    employeeId: input.employeeId, id: existing?.id, notes: input.marker, routeId: input.routeId,
    scannedPoints: completed ? input.points.length : 0, scheduleId: input.scheduleId,
    shopId: input.shopId, startedAt: new Date(now.getTime() - (completed ? 20 : 5) * MINUTE_MS),
    status: input.status, totalPoints: input.points.length,
  }));

  await eventRepository.delete({ patrolId: patrol.id });
  await visitRepository.delete({ patrolId: patrol.id });
  const pointCount = completed ? input.points.length : 1;
  for (let index = 0; index < pointCount; index += 1) {
    const point = input.points[index];
    const tag = input.tags[index];
    if (point === undefined || tag === undefined) continue;
    const arrivedAt = new Date(now.getTime() - (completed ? 17 - index * 5 : 3) * MINUTE_MS);
    const departedAt = new Date(arrivedAt.getTime() + 90_000);
    const visit = await visitRepository.save(visitRepository.create({
      arrivedAt, departedAt: completed ? departedAt : undefined,
      dwellSeconds: completed ? 90 : undefined, lockedUntil: departedAt,
      patrolId: patrol.id, patrolPointId: point.id,
      status: completed ? PatrolPointVisitStatus.COMPLETED : PatrolPointVisitStatus.READY_TO_DEPART,
    }));
    const arrival = await saveEvent(eventRepository, patrol, point, tag, visit.id, PatrolScanAction.ARRIVE, arrivedAt);
    visit.arrivalEventId = arrival.id;
    if (completed) {
      const departure = await saveEvent(eventRepository, patrol, point, tag, visit.id, PatrolScanAction.DEPART, departedAt);
      visit.departureEventId = departure.id;
    }
    await visitRepository.save(visit);
  }
  return patrol;
}

function saveEvent(
  repository: Repository<PatrolEventEntity>, patrol: PatrolEntity, point: PatrolPointEntity,
  tag: NfcTagEntity, pointVisitId: string, scanAction: PatrolScanAction, scannedAt: Date,
): Promise<PatrolEventEntity> {
  return repository.save(repository.create({
    accepted: true, deviceId: 'manual-seed-device', employeeId: patrol.employeeId,
    gpsAccuracy: 5, lat: '56.010563', lng: '92.852572', nfcTagId: tag.id,
    nfcUid: tag.uid, patrolId: patrol.id, patrolPointId: point.id, pointVisitId,
    scanAction, scannedAt,
  }));
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
