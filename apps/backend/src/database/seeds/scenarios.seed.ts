import {
  PatrolIncidentType,
  PatrolPointVisitStatus,
  PatrolReportStatus,
  PatrolReportType,
  PatrolScanAction,
  RouteStatus,
} from '@patrol/shared';
import { Repository } from 'typeorm';
import { createHash } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, resolve } from 'path';
import type sharpFactory from 'sharp';

import { formatAccessKey, hashAccessKey } from '../../common/auth/access-key';
import { NfcTagEntity } from '../../modules/patrol-points/entities/nfc-tag.entity';
import { PatrolPointEntity } from '../../modules/patrol-points/entities/patrol-point.entity';
import { PatrolReportEntity } from '../../modules/reports/entities/patrol-report.entity';
import { PatrolReportFileEntity } from '../../modules/reports/entities/patrol-report-file.entity';
import { FileAssetEntity } from '../../modules/files/entities/file-asset.entity';
import { PatrolEventEntity } from '../../modules/patrols/entities/patrol-event.entity';
import { PatrolIncidentEntity } from '../../modules/patrols/entities/patrol-incident.entity';
import { PatrolPointVisitEntity } from '../../modules/patrols/entities/patrol-point-visit.entity';
import { PatrolRoutePointEntity } from '../../modules/patrols/entities/patrol-route-point.entity';
import { PatrolRouteEntity } from '../../modules/patrols/entities/patrol-route.entity';
import { PatrolScheduleEntity } from '../../modules/patrols/entities/patrol-schedule.entity';
import { PatrolEntity } from '../../modules/patrols/entities/patrol.entity';
import { RouteTimingProfileEntity } from '../../modules/patrols/entities/route-timing-profile.entity';
import { RegionEntity } from '../../modules/shops/entities/region.entity';
import { ShopEntity } from '../../modules/shops/entities/shop.entity';
import { UserEntity } from '../../modules/users/entities/user.entity';
import dataSource from '../data-source';

const SEED_MARKER = 'scenarios-seed-v030';
const sharp: typeof sharpFactory = require('sharp');
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;
const seedNow = new Date();

type Repositories = {
  events: Repository<PatrolEventEntity>;
  fileAssets: Repository<FileAssetEntity>;
  incidents: Repository<PatrolIncidentEntity>;
  patrols: Repository<PatrolEntity>;
  points: Repository<PatrolPointEntity>;
  reports: Repository<PatrolReportEntity>;
  reportFiles: Repository<PatrolReportFileEntity>;
  routePoints: Repository<PatrolRoutePointEntity>;
  routes: Repository<PatrolRouteEntity>;
  schedules: Repository<PatrolScheduleEntity>;
  shops: Repository<ShopEntity>;
  tags: Repository<NfcTagEntity>;
  timingProfiles: Repository<RouteTimingProfileEntity>;
  users: Repository<UserEntity>;
  visits: Repository<PatrolPointVisitEntity>;
};

type ShopSeed = {
  externalId: string;
  name: string;
  routeExpectedPoints: number;
  routeRegisteredPoints: number;
  routeStatus: RouteStatus;
  timezone: string;
};

type UserSeed = {
  accessKey: string;
  fullName: string;
  isActive?: boolean;
  isUniversalRouteSetter?: boolean;
  role: UserEntity['role'];
  shopId?: string;
  username: string;
};

type PatrolSeed = {
  cancellationReason?: string;
  completedAt?: Date;
  completedPointCount: number;
  dueAt?: Date;
  employeeId: string;
  marker: string;
  openPointIndex?: number;
  points: PatrolPointEntity[];
  routeId: string;
  scheduleId: string;
  shopId: string;
  startedAt: Date;
  status: PatrolEntity['status'];
  tags: NfcTagEntity[];
};

async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    await assertSchemaIsReady();
    process.stdout.write(`${JSON.stringify(await seedScenarios(createRepositories()), null, 2)}\n`);
  } finally {
    await dataSource.destroy();
  }
}

function createRepositories(): Repositories {
  return {
    events: dataSource.getRepository(PatrolEventEntity),
    fileAssets: dataSource.getRepository(FileAssetEntity),
    incidents: dataSource.getRepository(PatrolIncidentEntity),
    patrols: dataSource.getRepository(PatrolEntity),
    points: dataSource.getRepository(PatrolPointEntity),
    reports: dataSource.getRepository(PatrolReportEntity),
    reportFiles: dataSource.getRepository(PatrolReportFileEntity),
    routePoints: dataSource.getRepository(PatrolRoutePointEntity),
    routes: dataSource.getRepository(PatrolRouteEntity),
    schedules: dataSource.getRepository(PatrolScheduleEntity),
    shops: dataSource.getRepository(ShopEntity),
    tags: dataSource.getRepository(NfcTagEntity),
    timingProfiles: dataSource.getRepository(RouteTimingProfileEntity),
    users: dataSource.getRepository(UserEntity),
    visits: dataSource.getRepository(PatrolPointVisitEntity),
  };
}

async function assertSchemaIsReady(): Promise<void> {
  const required = [
    'patrol_routes', 'patrol_route_points', 'patrol_point_visits', 'route_timing_profiles',
    'patrol_reports', 'universal_auth_sessions', 'anonymous_appeals',
  ];
  const rows: unknown = await dataSource.query(
    `SELECT table_name AS "tableName" FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [required],
  );
  const existing = new Set(Array.isArray(rows) ? rows.flatMap((row) => {
    const value = row as { tableName?: unknown };
    return typeof value.tableName === 'string' ? [value.tableName] : [];
  }) : []);
  const missing = required.filter((table) => !existing.has(table));
  if (missing.length > 0) {
    throw new Error(
      `Database schema is outdated. Missing tables: ${missing.join(', ')}. ` +
      'Run npm run backend:migration:run before npm run backend:seed:scenarios.',
    );
  }
}

async function seedScenarios(repositories: Repositories): Promise<Record<string, unknown>> {
  const region = await ensureRegion();
  const shops = {
    irkutsk: await ensureShop(repositories.shops, region.id, {
      externalId: 'DEMO-IRK', name: 'Demo Irkutsk', routeExpectedPoints: 4,
      routeRegisteredPoints: 4, routeStatus: RouteStatus.READY, timezone: 'Asia/Irkutsk',
    }),
    moscow: await ensureShop(repositories.shops, region.id, {
      externalId: 'DEMO-MSK', name: 'Demo Moscow', routeExpectedPoints: 3,
      routeRegisteredPoints: 3, routeStatus: RouteStatus.READY, timezone: 'Europe/Moscow',
    }),
    setup: await ensureShop(repositories.shops, region.id, {
      externalId: 'DEMO-KRS', name: 'Demo Krasnoyarsk route setup', routeExpectedPoints: 4,
      routeRegisteredPoints: 2, routeStatus: RouteStatus.SETUP_IN_PROGRESS, timezone: 'Asia/Krasnoyarsk',
    }),
    unconfigured: await ensureShop(repositories.shops, region.id, {
      externalId: 'DEMO-VVO', name: 'Demo Vladivostok without route', routeExpectedPoints: 0,
      routeRegisteredPoints: 0, routeStatus: RouteStatus.NOT_CONFIGURED, timezone: 'Asia/Vladivostok',
    }),
  };

  const users = await ensureUsers(repositories.users, shops);
  const admin = requiredUser(users, 'admin');
  const guardIrkutsk = requiredUser(users, 'guardIrkutsk');
  const guardMoscow = requiredUser(users, 'guardMoscow');

  const irkutskTags = await ensureTags(repositories.tags, admin.id, '04demoirk', 4);
  const moscowTags = await ensureTags(repositories.tags, admin.id, '04demomsk', 3);
  const setupTags = await ensureTags(repositories.tags, admin.id, '04demokrs', 2);
  const irkutskPoints = await ensurePoints(repositories.points, shops.irkutsk.id, irkutskTags,
    ['Entrance', 'Warehouse', 'Electrical room', 'Cash desk']);
  const moscowPoints = await ensurePoints(repositories.points, shops.moscow.id, moscowTags,
    ['Entrance', 'Sales floor', 'Back office']);
  await ensurePoints(repositories.points, shops.setup.id, setupTags,
    ['Setup point 1', 'Setup point 2', 'Setup point 3', 'Setup point 4']);

  const routes = {
    irkutskInternal: await ensureRoute(repositories, shops.irkutsk.id, 'Irkutsk internal', 'internal', irkutskPoints),
    irkutskExternal: await ensureRoute(repositories, shops.irkutsk.id, 'Irkutsk external', 'external',
      [irkutskPoints[0], irkutskPoints[3]].filter((point): point is PatrolPointEntity => point !== undefined)),
    moscowInternal: await ensureRoute(repositories, shops.moscow.id, 'Moscow internal', 'internal', moscowPoints),
  };
  const schedules = {
    irkutskMorning: await ensureSchedule(repositories.schedules, shops.irkutsk.id, routes.irkutskInternal.id,
      'Irkutsk morning', 'morning', '08:00', '10:00', 30),
    irkutskEvening: await ensureSchedule(repositories.schedules, shops.irkutsk.id, routes.irkutskExternal.id,
      'Irkutsk evening', 'evening', '19:00', '22:00', 15),
    moscowNoon: await ensureSchedule(repositories.schedules, shops.moscow.id, routes.moscowInternal.id,
      'Moscow noon', 'noon', '12:00', '15:00', 20),
  };

  const historyDurations = [19, 21, 20, 22, 18, 20];
  const history: PatrolEntity[] = [];
  for (let index = 0; index < historyDurations.length; index += 1) {
    const startedAt = daysAgo(index + 1, 8);
    history.push(await ensurePatrol(repositories, {
      completedAt: new Date(startedAt.getTime() + historyDurations[index]! * MINUTE_MS),
      completedPointCount: irkutskPoints.length,
      employeeId: guardIrkutsk.id,
      marker: `${SEED_MARKER}:timing:${index + 1}`,
      points: irkutskPoints,
      routeId: routes.irkutskInternal.id,
      scheduleId: schedules.irkutskMorning.id,
      shopId: shops.irkutsk.id,
      startedAt,
      status: 'completed',
      tags: irkutskTags,
    }));
  }
  await ensureTimingProfile(repositories.timingProfiles, routes.irkutskInternal, historyDurations);

  const fastStart = minutesAgo(240);
  const fastPatrol = await ensurePatrol(repositories, {
    completedAt: new Date(fastStart.getTime() + 8 * MINUTE_MS), completedPointCount: irkutskPoints.length,
    employeeId: guardIrkutsk.id, marker: `${SEED_MARKER}:fast`, points: irkutskPoints,
    routeId: routes.irkutskInternal.id, scheduleId: schedules.irkutskMorning.id,
    shopId: shops.irkutsk.id, startedAt: fastStart, status: 'completed', tags: irkutskTags,
  });
  await ensureIncident(repositories.incidents, fastPatrol, PatrolIncidentType.ROUTE_TOO_FAST,
    'Route completed faster than its learned norm', 1200, 480);

  const slowStart = minutesAgo(190);
  const slowPatrol = await ensurePatrol(repositories, {
    completedAt: new Date(slowStart.getTime() + 35 * MINUTE_MS), completedPointCount: irkutskPoints.length,
    employeeId: guardIrkutsk.id, marker: `${SEED_MARKER}:slow`, points: irkutskPoints,
    routeId: routes.irkutskInternal.id, scheduleId: schedules.irkutskMorning.id,
    shopId: shops.irkutsk.id, startedAt: slowStart, status: 'completed', tags: irkutskTags,
  });
  await ensureIncident(repositories.incidents, slowPatrol, PatrolIncidentType.ROUTE_TOO_SLOW,
    'Route completed slower than its learned norm', 1200, 2100);

  const overdue = await ensurePatrol(repositories, {
    completedPointCount: 1, dueAt: minutesAgo(60), employeeId: guardMoscow.id,
    marker: `${SEED_MARKER}:overdue`, openPointIndex: 1, points: moscowPoints,
    routeId: routes.moscowInternal.id, scheduleId: schedules.moscowNoon.id,
    shopId: shops.moscow.id, startedAt: minutesAgo(180), status: 'overdue', tags: moscowTags,
  });
  await ensureIncident(repositories.incidents, overdue, PatrolIncidentType.PATROL_OVERDUE,
    'Patrol was not completed by its due time');

  const active = await ensurePatrol(repositories, {
    completedPointCount: 0, dueAt: minutesAhead(50), employeeId: guardMoscow.id,
    marker: `${SEED_MARKER}:active`, openPointIndex: 0, points: moscowPoints,
    routeId: routes.moscowInternal.id, scheduleId: schedules.moscowNoon.id,
    shopId: shops.moscow.id, startedAt: minutesAgo(5), status: 'in_progress', tags: moscowTags,
  });
  await ensureReports(repositories, shops.irkutsk.id, guardIrkutsk.id,
    history[0], routes.irkutskInternal.id, schedules.irkutskMorning.id);

  return {
    credentials: Object.fromEntries(Object.entries(users).map(([key, user]) => [key, user.accessKey])),
    ids: {
      activePatrolId: active.id, fastPatrolId: fastPatrol.id, overduePatrolId: overdue.id,
      timingRouteId: routes.irkutskInternal.id,
    },
    nfcUids: {
      irkutsk: irkutskTags.map((tag) => tag.uid),
      krasnoyarskSetup: setupTags.map((tag) => tag.uid),
      moscow: moscowTags.map((tag) => tag.uid),
    },
    shops: Object.fromEntries(Object.entries(shops).map(([key, shop]) => [key, shop.id])),
    timingProfile: { averageMinutes: 20, sampleCount: historyDurations.length },
  };
}

async function ensureRegion(): Promise<RegionEntity> {
  const repository = dataSource.getRepository(RegionEntity);
  const existing = await repository.findOne({ where: { name: 'Demo scenarios' } });
  return repository.save(repository.create({ id: existing?.id, name: 'Demo scenarios' }));
}

async function ensureShop(repository: Repository<ShopEntity>, regionId: string, input: ShopSeed): Promise<ShopEntity> {
  const existing = await repository.findOne({ where: { externalId: input.externalId } });
  return repository.save(repository.create({
    ...input, address: `${input.name}, test address`, id: existing?.id, isActive: true, regionId,
  }));
}

async function ensureUsers(repository: Repository<UserEntity>, shops: Record<string, ShopEntity>): Promise<Record<string, UserEntity>> {
  const inputs: Record<string, UserSeed> = {
    admin: { accessKey: 'ADMN-DEMO-0001', fullName: 'Demo Administrator', role: 'admin', username: 'demo.admin' },
    guardInactive: { accessKey: 'EMPL-INAC-0001', fullName: 'Inactive Guard', isActive: false, role: 'security_guard', shopId: shops.irkutsk?.id, username: 'demo.employee.inactive' },
    guardIrkutsk: { accessKey: 'EMPL-IRKK-0001', fullName: 'Irkutsk Guard', role: 'security_guard', shopId: shops.irkutsk?.id, username: 'demo.employee.irkutsk' },
    guardMoscow: { accessKey: 'EMPL-MSKK-0001', fullName: 'Moscow Guard', role: 'security_guard', shopId: shops.moscow?.id, username: 'demo.employee.moscow' },
    guardMultiShop: { accessKey: 'EMPL-MULT-0001', fullName: 'Multi-shop Guard', role: 'security_guard', shopId: shops.irkutsk?.id, username: 'demo.employee.multi' },
    inspectorIrkutsk: { accessKey: 'MNGR-IRKK-0001', fullName: 'Irkutsk Inspector', role: 'inspector', shopId: shops.irkutsk?.id, username: 'demo.manager.irkutsk' },
    inspectorMoscow: { accessKey: 'MNGR-MSKK-0001', fullName: 'Moscow Inspector', role: 'inspector', shopId: shops.moscow?.id, username: 'demo.manager.moscow' },
    localRouteSetter: { accessKey: 'LRST-DEMO-0001', fullName: 'Local Route Setter', role: 'local_route_setter', shopId: shops.setup?.id, username: 'demo.local-route-setter' },
    universalRouteSetter: { accessKey: 'RSET-DEMO-0001', fullName: 'Universal Route Setter Account', isUniversalRouteSetter: true, role: 'route_setter', username: 'demo.route-setter' },
  };
  const result: Record<string, UserEntity> = {};
  for (const [key, input] of Object.entries(inputs)) {
    const accessKey = formatAccessKey(input.accessKey);
    const accessKeyHash = hashAccessKey(accessKey);
    const existing = await repository.findOne({ where: { username: input.username } });
    const user = await repository.save(repository.create({
      accessKey, accessKeyHash, fullName: input.fullName, id: existing?.id,
      isActive: input.isActive ?? true, isUniversalRouteSetter: input.isUniversalRouteSetter ?? false,
      passwordHash: accessKeyHash, role: input.role, shopId: input.shopId, username: input.username,
    }));
    result[key] = user;
    if (input.shopId !== undefined) await assignShop(user.id, input.shopId);
  }
  const multi = result.guardMultiShop;
  if (multi !== undefined && shops.moscow !== undefined) await assignShop(multi.id, shops.moscow.id);
  return result;
}

function requiredUser(users: Record<string, UserEntity>, key: string): UserEntity {
  const user = users[key];
  if (user === undefined) throw new Error(`Seed user ${key} was not created`);
  return user;
}

async function assignShop(userId: string, shopId: string): Promise<void> {
  await dataSource.query(
    `INSERT INTO user_shop_assignments (user_id, shop_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, shopId],
  );
}

async function ensureTags(repository: Repository<NfcTagEntity>, registeredBy: string, prefix: string, count: number): Promise<NfcTagEntity[]> {
  const result: NfcTagEntity[] = [];
  for (let index = 1; index <= count; index += 1) {
    const uid = `${prefix}${String(index).padStart(4, '0')}`;
    const existing = await repository.findOne({ where: { uid } });
    result.push(await repository.save(repository.create({
      id: existing?.id, isActive: true, notes: SEED_MARKER,
      payload: `${SEED_MARKER}:${uid}`, registeredBy, uid,
    })));
  }
  return result;
}

async function ensurePoints(repository: Repository<PatrolPointEntity>, shopId: string, tags: NfcTagEntity[], names: string[]): Promise<PatrolPointEntity[]> {
  const result: PatrolPointEntity[] = [];
  for (let index = 0; index < names.length; index += 1) {
    const name = names[index];
    if (name === undefined) continue;
    const existing = await repository.findOne({ where: { name, shopId } });
    result.push(await repository.save(repository.create({
      description: `${name} control point`, id: existing?.id, isActive: true,
      name, nfcTagId: tags[index]?.id, shopId, sortOrder: index + 1,
    })));
  }
  return result;
}

async function ensureRoute(repositories: Repositories, shopId: string, name: string, category: PatrolRouteEntity['category'], points: PatrolPointEntity[]): Promise<PatrolRouteEntity> {
  const existing = await repositories.routes.findOne({ where: { name, shopId } });
  const route = await repositories.routes.save(repositories.routes.create({
    category, id: existing?.id, isActive: true, name, shopId,
  }));
  await repositories.routePoints.delete({ routeId: route.id });
  await repositories.routePoints.save(points.map((point, index) => repositories.routePoints.create({
    patrolPointId: point.id, routeId: route.id, sortOrder: index + 1,
  })));
  return route;
}

async function ensureSchedule(repository: Repository<PatrolScheduleEntity>, shopId: string, routeId: string, name: string, period: PatrolScheduleEntity['period'], startTime: string, endTime: string, earlyStartMinutes: number): Promise<PatrolScheduleEntity> {
  const existing = await repository.findOne({ where: { name, shopId } });
  return repository.save(repository.create({
    earlyStartMinutes, endTime, id: existing?.id, isActive: true, name, period,
    routeId, shopId, startTime, weekdays: [1, 2, 3, 4, 5, 6, 7],
  }));
}

async function ensurePatrol(repositories: Repositories, input: PatrolSeed): Promise<PatrolEntity> {
  const existing = await repositories.patrols.findOne({ where: { notes: input.marker } });
  const patrol = await repositories.patrols.save(repositories.patrols.create({
    cancellationReason: input.cancellationReason,
    cancelledAt: input.status === 'cancelled' ? input.completedAt : undefined,
    completedAt: input.completedAt, dueAt: input.dueAt, employeeId: input.employeeId,
    id: existing?.id, notes: input.marker, routeId: input.routeId,
    scannedPoints: input.completedPointCount, scheduleId: input.scheduleId,
    shopId: input.shopId, startedAt: input.startedAt, status: input.status,
    totalPoints: input.points.length,
  }));
  await repositories.events.delete({ patrolId: patrol.id });
  await repositories.visits.delete({ patrolId: patrol.id });

  const durationMs = (input.completedAt?.getTime() ?? seedNow.getTime()) - input.startedAt.getTime();
  const stepMs = Math.max(3 * MINUTE_MS, Math.floor(durationMs / Math.max(input.points.length, 1)));
  for (let index = 0; index < input.completedPointCount; index += 1) {
    await ensureVisit(repositories, patrol, input.points[index], input.tags[index],
      new Date(input.startedAt.getTime() + index * stepMs + MINUTE_MS), true);
  }
  if (input.openPointIndex !== undefined) {
    await ensureVisit(repositories, patrol, input.points[input.openPointIndex], input.tags[input.openPointIndex],
      new Date(seedNow.getTime() - 3 * MINUTE_MS), false);
  }
  return patrol;
}

async function ensureVisit(repositories: Repositories, patrol: PatrolEntity, point: PatrolPointEntity | undefined, tag: NfcTagEntity | undefined, arrivedAt: Date, completed: boolean): Promise<void> {
  if (point === undefined || tag === undefined) return;
  const departedAt = new Date(arrivedAt.getTime() + 90_000);
  const visit = await repositories.visits.save(repositories.visits.create({
    arrivedAt, departedAt: completed ? departedAt : undefined,
    dwellSeconds: completed ? 90 : undefined, lockedUntil: departedAt,
    patrolId: patrol.id, patrolPointId: point.id,
    status: completed ? PatrolPointVisitStatus.COMPLETED : PatrolPointVisitStatus.READY_TO_DEPART,
  }));
  const arrival = await saveEvent(repositories.events, patrol, point, tag, visit.id, PatrolScanAction.ARRIVE, arrivedAt);
  visit.arrivalEventId = arrival.id;
  if (completed) {
    const departure = await saveEvent(repositories.events, patrol, point, tag, visit.id, PatrolScanAction.DEPART, departedAt);
    visit.departureEventId = departure.id;
  }
  await repositories.visits.save(visit);
}

function saveEvent(repository: Repository<PatrolEventEntity>, patrol: PatrolEntity, point: PatrolPointEntity, tag: NfcTagEntity, pointVisitId: string, scanAction: PatrolScanAction, scannedAt: Date): Promise<PatrolEventEntity> {
  return repository.save(repository.create({
    accepted: true, deviceId: 'scenario-seed-device', employeeId: patrol.employeeId,
    gpsAccuracy: 5, lat: '52.289588', lng: '104.280606', nfcTagId: tag.id,
    nfcUid: tag.uid, patrolId: patrol.id, patrolPointId: point.id, pointVisitId,
    scanAction, scannedAt,
  }));
}

async function ensureTimingProfile(repository: Repository<RouteTimingProfileEntity>, route: PatrolRouteEntity, durationsMinutes: number[]): Promise<void> {
  const averageSeconds = Math.round(
    durationsMinutes.reduce((sum, duration) => sum + duration * 60, 0) / durationsMinutes.length,
  );
  const existing = await repository.findOne({ where: { routeId: route.id } });
  await repository.save(repository.create({
    averageTotalSeconds: averageSeconds, calculatedFrom: new Date(seedNow.getTime() - 14 * DAY_MS),
    calculatedTo: seedNow, fastSeconds: Math.round(averageSeconds * 0.7), id: existing?.id,
    routeId: route.id, sampleCount: durationsMinutes.length, shopId: route.shopId,
    slowSeconds: Math.round(averageSeconds * 1.3),
    suspiciousFastSeconds: Math.round(averageSeconds * 0.5),
  }));
}

async function ensureIncident(repository: Repository<PatrolIncidentEntity>, patrol: PatrolEntity, type: PatrolIncidentType, message: string, expectedSeconds?: number, actualSeconds?: number): Promise<void> {
  const existing = await repository.findOne({ where: { patrolId: patrol.id, type } });
  await repository.save(repository.create({
    actualSeconds, expectedSeconds, id: existing?.id, message,
    patrolId: patrol.id, shopId: patrol.shopId, type,
  }));
}

async function ensureReports(repositories: Repositories, shopId: string, employeeId: string, patrol: PatrolEntity | undefined, routeId: string, scheduleId: string): Promise<void> {
  const types: PatrolReportType[] = ['photo_report', 'morning', 'closing', 'sunday', 'heating', 'evacuation'];
  for (const reportType of types) {
    const comment = `${SEED_MARKER}:${reportType}`;
    const existing = await repositories.reports.findOne({ where: { comment } });
    const status: PatrolReportStatus = reportType === 'evacuation' ? 'draft' : 'submitted';
    const report = await repositories.reports.save(repositories.reports.create({
      comment, employeeId, fields: { checklistComplete: true, seed: true }, id: existing?.id,
      patrolId: patrol?.id, period: reportType === 'closing' ? 'evening' : 'morning',
      reportType, routeId, scheduleId, shopId, status,
      submittedAt: status === 'submitted' ? minutesAgo(30) : undefined,
    }));
    if (reportType === 'photo_report') await ensureReportPhoto(repositories, report, employeeId);
  }
}

async function ensureReportPhoto(repositories: Repositories, report: PatrolReportEntity, uploadedBy: string): Promise<void> {
  if ((process.env.FILE_STORAGE_BACKEND ?? 'local') !== 'local') return;

  const existing = await repositories.fileAssets.findOne({
    where: { kind: 'report_photo', ownerId: report.id, ownerType: 'patrol_report' },
  });
  const storageKey = `report_photo/seed/${SEED_MARKER}.webp`;
  const svg = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640"><rect width="960" height="640" fill="#dfe9e1"/><rect x="80" y="90" width="800" height="460" rx="18" fill="#ffffff" stroke="#35634a" stroke-width="8"/><path d="M180 430L360 270L490 385L610 235L790 430Z" fill="#78a187"/><circle cx="285" cy="205" r="58" fill="#e8b85d"/><rect x="300" y="476" width="360" height="18" rx="9" fill="#244535"/><rect x="375" y="508" width="210" height="10" rx="5" fill="#8aa095"/></svg>',
  );
  const processed = await sharp(svg).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const root = resolve(process.env.FILE_STORAGE_LOCAL_ROOT ?? './storage');
  const filePath = resolve(root, storageKey);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, processed.data);

  const asset = await repositories.fileAssets.save(repositories.fileAssets.create({
    checksumSha256: createHash('sha256').update(processed.data).digest('hex'),
    height: processed.info.height,
    id: existing?.id,
    kind: 'report_photo',
    mimeType: 'image/webp',
    originalName: 'demo-control-photo.webp',
    ownerId: report.id,
    ownerType: 'patrol_report',
    sizeBytes: processed.data.byteLength,
    storage: 'local',
    storageKey,
    uploadedBy,
    width: processed.info.width,
  }));
  const link = await repositories.reportFiles.findOne({ where: { fileId: asset.id, reportId: report.id } });
  await repositories.reportFiles.save(repositories.reportFiles.create({
    fileId: asset.id,
    id: link?.id,
    kind: 'report_photo',
    reportId: report.id,
  }));
}

function daysAgo(days: number, hourUtc: number): Date {
  const value = new Date(seedNow.getTime() - days * DAY_MS);
  value.setUTCHours(hourUtc, 0, 0, 0);
  return value;
}

function minutesAgo(minutes: number): Date {
  return new Date(seedNow.getTime() - minutes * MINUTE_MS);
}

function minutesAhead(minutes: number): Date {
  return new Date(seedNow.getTime() + minutes * MINUTE_MS);
}

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
