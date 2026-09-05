import { ExecutionContext, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PatrolPointVisitEntity } from '../../patrols/entities/patrol-point-visit.entity';
import { PatrolEntity } from '../../patrols/entities/patrol.entity';
import { PatrolRouteEntity } from '../../patrols/entities/patrol-route.entity';
import { PatrolScheduleEntity } from '../../patrols/entities/patrol-schedule.entity';
import { ShopEntity } from '../../shops/entities/shop.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { ControlPatrolsController } from './control-patrols.controller';
import { ControlPatrolsRepository } from './control-patrols.repository';
import { ControlPatrolsService } from './control-patrols.service';

type RepositoryMock = Pick<
  ControlPatrolsRepository,
  'findById' | 'findEvents' | 'findIncidents' | 'findMany' | 'findReports' | 'findTimingProfile' | 'findVisits'
>;

describe('Control patrols API contract', () => {
  let app: INestApplication;
  let repository: jest.Mocked<RepositoryMock>;

  beforeEach(async () => {
    repository = {
      findById: jest.fn().mockResolvedValue(createPatrol()),
      findEvents: jest.fn().mockResolvedValue([]),
      findIncidents: jest.fn().mockResolvedValue([]),
      findMany: jest.fn(),
      findReports: jest.fn().mockResolvedValue([]),
      findTimingProfile: jest.fn().mockResolvedValue(null),
      findVisits: jest.fn().mockResolvedValue([createVisit()]),
    };
    const actor: AuthenticatedUser = {
      fullName: 'Admin',
      id: '00000000-0000-4000-8000-000000000001',
      role: 'admin',
      username: 'admin',
    };
    const authGuard = {
      canActivate(context: ExecutionContext): boolean {
        context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user = actor;
        return true;
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ControlPatrolsController],
      providers: [
        ControlPatrolsService,
        { provide: ControlPatrolsRepository, useValue: repository },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns null visit events when nullable TypeORM relations are absent', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/control/patrols/00000000-0000-4000-8000-000000000020')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          visits: [{ arrivalEvent: null, departureEvent: null }],
        });
      });
  });

  it('returns a pending patrol with startedAt null without failing duration calculation', async () => {
    repository.findById.mockResolvedValue({
      ...createPatrol(),
      completedAt: null,
      startedAt: null,
      status: 'pending',
    });
    repository.findVisits.mockResolvedValue([]);

    await request(app.getHttpServer())
      .get('/api/v1/control/patrols/00000000-0000-4000-8000-000000000020')
      .expect(200)
      .expect((response) => {
        expect(response.body).toMatchObject({
          durationIsFinal: false,
          durationSeconds: null,
          startedAt: null,
          status: 'pending',
        });
      });
  });
});

function createPatrol(): PatrolEntity {
  return {
    completedAt: new Date('2026-08-18T05:15:00.000Z'),
    createdAt: new Date('2026-08-18T05:00:00.000Z'),
    employee: { fullName: 'Guard' } as UserEntity,
    employeeId: '00000000-0000-4000-8000-000000000002',
    id: '00000000-0000-4000-8000-000000000020',
    route: {
      category: 'internal',
      id: '00000000-0000-4000-8000-000000000003',
      name: 'Route 1',
    } as PatrolRouteEntity,
    routeId: '00000000-0000-4000-8000-000000000003',
    scannedPoints: 0,
    schedule: { period: 'morning' } as PatrolScheduleEntity,
    scheduleId: '00000000-0000-4000-8000-000000000004',
    shop: {
      id: '00000000-0000-4000-8000-000000000005',
      name: 'Shop 1',
    } as ShopEntity,
    shopId: '00000000-0000-4000-8000-000000000005',
    startedAt: new Date('2026-08-18T05:00:00.000Z'),
    status: 'in_progress',
    totalPoints: 1,
  } as PatrolEntity;
}

function createVisit(): PatrolPointVisitEntity {
  return {
    arrivalEvent: null,
    arrivedAt: new Date('2026-08-18T05:01:00.000Z'),
    createdAt: new Date('2026-08-18T05:01:00.000Z'),
    departureEvent: null,
    id: '00000000-0000-4000-8000-000000000030',
    lockedUntil: new Date('2026-08-18T05:02:00.000Z'),
    patrolId: '00000000-0000-4000-8000-000000000020',
    patrolPointId: '00000000-0000-4000-8000-000000000040',
    status: 'arrived',
    updatedAt: new Date('2026-08-18T05:01:00.000Z'),
  } as PatrolPointVisitEntity;
}
