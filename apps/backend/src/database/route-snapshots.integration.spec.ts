import { randomUUID } from 'crypto';
import { join } from 'path';
import { DataSource } from 'typeorm';

import { AuthenticatedUser } from '../common/auth/authenticated-user';
import { NfcTagEntity } from '../modules/patrol-points/entities/nfc-tag.entity';
import { NfcTagReplacementEntity } from '../modules/patrol-points/entities/nfc-tag-replacement.entity';
import { PatrolPointEntity } from '../modules/patrol-points/entities/patrol-point.entity';
import { PatrolPointsRepository } from '../modules/patrol-points/patrol-points.repository';
import { PatrolEventEntity } from '../modules/patrols/entities/patrol-event.entity';
import { PatrolIncidentEntity } from '../modules/patrols/entities/patrol-incident.entity';
import { PatrolPointVisitEntity } from '../modules/patrols/entities/patrol-point-visit.entity';
import { PatrolRouteEntity } from '../modules/patrols/entities/patrol-route.entity';
import { PatrolRoutePointEntity } from '../modules/patrols/entities/patrol-route-point.entity';
import { PatrolEntity } from '../modules/patrols/entities/patrol.entity';
import { PatrolRouteIntervalEntity } from '../modules/patrols/entities/patrol-route-interval.entity';
import { RouteTimingProfileEntity } from '../modules/patrols/entities/route-timing-profile.entity';
import { PatrolRoutesRepository } from '../modules/patrols/routes/patrol-routes.repository';
import { PatrolsRepository } from '../modules/patrols/patrols.repository';
import { ShopEntity } from '../modules/shops/entities/shop.entity';
import { UserEntity } from '../modules/users/entities/user.entity';
import { ManagementMetricsRepository } from '../modules/reports/management/management-metrics.repository';
import { ManagementTrendsRepository } from '../modules/reports/management/management-trends.repository';
import { ManagementBreakdownRepository } from '../modules/reports/management/management-breakdown.repository';
import { ManagementScorecardsRepository } from '../modules/reports/management/management-scorecards.repository';
import { ManagementScorecardsService } from '../modules/reports/management/management-scorecards.service';

// Opt-in: use a dedicated empty PostgreSQL database. Tests never clear existing data.
const databaseUrl = process.env.PATROL_TEST_DATABASE_URL;
const describeDatabase = databaseUrl === undefined ? describe.skip : describe;

describeDatabase('Route snapshots and atomic writes (PostgreSQL)', () => {
  let db: DataSource;
  let routes: PatrolRoutesRepository;
  let points: PatrolPointsRepository;
  let patrols: PatrolsRepository;
  let actor: AuthenticatedUser;
  let shopId: string;

  beforeAll(async () => {
    db = new DataSource({
      type: 'postgres',
      url: databaseUrl,
      entities: [join(__dirname, '../modules/**/*.entity.ts')],
      migrations: [join(__dirname, 'migrations/*.ts')],
      synchronize: false,
    });
    await db.initialize();
    await db.runMigrations();
    routes = new PatrolRoutesRepository(
      db.getRepository(PatrolRouteEntity),
      db.getRepository(PatrolRoutePointEntity),
    );
    points = new PatrolPointsRepository(
      db.getRepository(NfcTagEntity),
      db.getRepository(NfcTagReplacementEntity),
      db.getRepository(PatrolPointEntity),
    );
    patrols = new PatrolsRepository(
      db.getRepository(PatrolEntity),
      db.getRepository(PatrolEventEntity),
      db.getRepository(PatrolIncidentEntity),
      db.getRepository(PatrolPointVisitEntity),
      db.getRepository(PatrolRouteIntervalEntity),
      db.getRepository(RouteTimingProfileEntity),
    );
    const shop = await db
      .getRepository(ShopEntity)
      .save(db.getRepository(ShopEntity).create({ name: 'Snapshot tests' }));
    shopId = shop.id;
    const user = await db.getRepository(UserEntity).save(
      db.getRepository(UserEntity).create({
        username: randomUUID(),
        fullName: 'Route tester',
        passwordHash: 'test-only',
        role: 'route_setter',
      }),
    );
    actor = {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      role: user.role,
      authorizationId: randomUUID(),
      authorizationFullName: 'Named setter',
    };
  }, 60000);

  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
  });

  async function newPoint(sortOrder: number): Promise<PatrolPointEntity> {
    return points.createPatrolPointWithNfc(
      { name: `Point ${sortOrder}`, shopId, sortOrder, isActive: true },
      { uid: randomUUID().replace(/-/g, ''), isActive: true, registeredBy: actor.id },
    );
  }

  it('counts unscheduled patrols consistently and does not mark an empty shop green', async () => {
    const shop = await db.getRepository(ShopEntity).save(db.getRepository(ShopEntity).create({ name: 'Management regression' }));
    const metrics = new ManagementMetricsRepository(db);
    const scores = new ManagementScorecardsService(new ManagementScorecardsRepository(db));
    const admin = { ...actor, role: 'admin' as const };
    expect((await metrics.getMetrics({ shopId: shop.id })).green_shop_count).toBe('0');
    expect((await scores.getShopScorecards({ shopId: shop.id }, admin)).items[0]?.status).toBe('no_data');
    const route = await db.getRepository(PatrolRouteEntity).save(db.getRepository(PatrolRouteEntity).create({ shopId: shop.id, name: 'Management route', category: 'internal' }));
    await db.getRepository(PatrolEntity).save(db.getRepository(PatrolEntity).create({
      shopId: shop.id, employeeId: actor.id, status: 'completed', totalPoints: 0, scannedPoints: 0,
      routeId: route.id, createdAt: new Date('2026-09-01T22:29:00Z'),
      startedAt: new Date('2026-09-01T22:30:00Z'), completedAt: new Date('2026-09-01T22:40:00Z'),
    }));
    const result = await metrics.getMetrics({ shopId: shop.id });
    expect(result.registered_patrols).toBe('1');
    expect(result.completed_patrols).toBe('1');
    expect(result.green_shop_count).toBe('1');
    expect((await scores.getShopScorecards({ shopId: shop.id }, admin)).items[0]?.metrics.completionRate).toBe(1);
    const trends = await new ManagementTrendsRepository(db).findTrends({ shopId: shop.id }, 'day');
    expect(new Date(trends[0]!.bucket_start).toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(trends[0]?.registered_patrols).toBe('1');
    const breakdown = await new ManagementBreakdownRepository(db).findBreakdown({ shopId: shop.id }, 'routeCategory');
    expect(breakdown[0]).toMatchObject({ group_key: 'internal', registered_patrols: '1', completed_patrols: '1' });
  });

  it('rolls back NFC creation when point insertion fails, and rejects duplicate UIDs', async () => {
    const uid = randomUUID().replace(/-/g, '');
    await expect(
      points.createPatrolPointWithNfc(
        { name: 'Invalid shop', shopId: randomUUID(), sortOrder: 0, isActive: true },
        { uid, isActive: true, registeredBy: actor.id },
      ),
    ).rejects.toMatchObject({ code: '23503' });
    expect(await points.findNfcTagByUid(uid)).toBeNull();
    const point = await newPoint(0);
    await expect(
      points.createPatrolPointWithNfc(
        { name: 'Duplicate', shopId, sortOrder: 0, isActive: true },
        { uid: point.nfcTag!.uid, isActive: true, registeredBy: actor.id },
      ),
    ).rejects.toMatchObject({ code: 'NFC_UID_ALREADY_REGISTERED' });
    expect(
      await db.getRepository(PatrolPointEntity).count({ where: { nfcTagId: point.nfcTagId! } }),
    ).toBe(1);
    const concurrentUid = randomUUID().replace(/-/g, '');
    const outcomes = await Promise.allSettled(
      [1, 2].map(() =>
        points.createPatrolPointWithNfc(
          { name: 'Concurrent NFC', shopId, sortOrder: 0, isActive: true },
          { uid: concurrentUid, isActive: true, registeredBy: actor.id },
        ),
      ),
    );
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(outcomes.filter((outcome) => outcome.status === 'rejected')).toHaveLength(1);
  });

  it('keeps patrol order and dwell after route edits and records immutable author-attributed versions', async () => {
    const [a, b, extra] = await Promise.all([newPoint(20), newPoint(10), newPoint(30)]);
    const route = await routes.create(
      {
        name: 'Original',
        category: 'external',
        isActive: true,
        shopId,
        pointIds: [a.id, b.id],
        pointSettings: [
          { patrolPointId: a.id, dwellSeconds: 0 },
          { patrolPointId: b.id, dwellSeconds: 120 },
        ],
      },
      actor,
    );
    await routes.create(
      { name: 'Other route', category: 'internal', isActive: true, shopId, pointIds: [extra.id] },
      actor,
    );
    const patrol = await patrols.createPatrol({
      employeeId: actor.id,
      routeId: route.id,
      shopId,
      status: 'in_progress',
      startedAt: new Date(),
      totalPoints: 99,
    });
    expect(patrol.totalPoints).toBe(2);
    expect(patrol.routeSnapshot?.map((p) => [p.id, p.sortOrder, p.dwellSeconds])).toEqual([
      [a.id, 1, 0],
      [b.id, 2, 120],
    ]);
    await routes.update(
      route.id,
      {
        name: 'Changed',
        pointIds: [b.id, extra.id],
        pointSettings: [{ patrolPointId: b.id, dwellSeconds: 30 }],
      },
      actor,
    );
    const stored = (await patrols.findById(patrol.id))!;
    expect(stored.routeSnapshot).toEqual(patrol.routeSnapshot);
    expect(await patrols.findNextExpectedPoint(stored)).toMatchObject({
      id: a.id,
      sortOrder: 1,
      pointDwellSeconds: 0,
    });
    await db.getRepository(PatrolPointVisitEntity).save(
      db.getRepository(PatrolPointVisitEntity).create({
        patrolId: patrol.id,
        patrolPointId: a.id,
        status: 'completed',
      }),
    );
    expect(await patrols.findNextExpectedPoint(stored)).toMatchObject({
      id: b.id,
      sortOrder: 2,
      pointDwellSeconds: 120,
    });
    for (const point of [a, b]) {
      await patrols.createPatrolEvent({
        employeeId: actor.id,
        patrolId: patrol.id,
        patrolPointId: point.id,
        deviceId: 'test',
        nfcTagId: point.nfcTagId!,
        nfcUid: point.nfcTag!.uid,
        scannedAt: new Date(),
        isSuspicious: false,
        accepted: true,
        scanAction: 'depart',
      });
    }
    expect(
      (await patrols.findEventsByPatrolOrdered(patrol.id)).map((event) => [
        event.patrolPointId,
        event.patrolPoint?.sortOrder,
      ]),
    ).toEqual([
      [a.id, 1],
      [b.id, 2],
    ]);
    expect(await patrols.findPreviousEventByRouteOrder(patrol.id, 2)).toMatchObject({
      patrolPointId: a.id,
    });
    const versions = await routes.findVersions(route.id);
    expect(versions.map((v) => v.version)).toEqual([2, 1]);
    expect(versions[1]).toMatchObject({
      actorId: actor.id,
      actorFullName: 'Named setter',
      authorizationId: actor.authorizationId,
      snapshot: {
        name: 'Original',
        points: [
          { patrolPointId: a.id, sortOrder: 1, dwellSeconds: 0 },
          { patrolPointId: b.id, sortOrder: 2, dwellSeconds: 120 },
        ],
      },
    });
    // Constraint failure after replacing links must roll back metadata, links and version together.
    await expect(
      routes.update(
        route.id,
        {
          name: 'Must roll back',
          pointIds: [a.id],
          pointSettings: [{ patrolPointId: a.id, dwellSeconds: 121 }],
        },
        actor,
      ),
    ).rejects.toMatchObject({ code: '23514' });
    expect((await routes.findById(route.id))?.name).toBe('Changed');
    expect((await routes.findById(route.id))?.points?.map((p) => p.patrolPointId).sort()).toEqual(
      [b.id, extra.id].sort(),
    );
    expect(await routes.findVersions(route.id)).toHaveLength(2);
  });

  it('serializes concurrent edits and preserves dwell when reordering without overrides', async () => {
    const [a, b] = await Promise.all([newPoint(1), newPoint(2)]);
    const route = await routes.create(
      {
        name: 'Concurrent',
        category: 'internal',
        isActive: true,
        shopId,
        pointIds: [a.id, b.id],
        pointSettings: [
          { patrolPointId: a.id, dwellSeconds: 0 },
          { patrolPointId: b.id, dwellSeconds: 120 },
        ],
      },
      actor,
    );
    await Promise.all([
      routes.update(route.id, { pointIds: [b.id, a.id] }, actor),
      routes.update(route.id, { name: 'Renamed' }, actor),
    ]);
    const result = (await routes.findById(route.id))!;
    expect(result.name).toBe('Renamed');
    expect(
      result.points
        ?.sort((x, y) => x.sortOrder - y.sortOrder)
        .map((p) => [p.patrolPointId, p.dwellSeconds]),
    ).toEqual([
      [b.id, 120],
      [a.id, 0],
    ]);
    expect((await routes.findVersions(route.id)).map((v) => v.version)).toEqual([3, 2, 1]);
  });
});
