import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { sign } from 'jsonwebtoken';
import request = require('supertest');

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthController } from '../auth/auth.controller';
import { AuthService } from '../auth/auth.service';
import { UserEntity } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';

const ACCESS_SECRET = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const REFRESH_SECRET = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

type AuthServiceMock = Pick<AuthService, 'login'>;
type MobileServiceMock = Pick<
  MobileService,
  | 'getActivePatrol'
  | 'getProfile'
  | 'getRoute'
  | 'recordPatrolEvent'
  | 'registerDevicePushToken'
  | 'scanNextRoutePoint'
  | 'startPatrol'
  | 'startRouteSetup'
  | 'syncPatrolEvents'
>;
type UsersServiceMock = Pick<UsersService, 'findEntityById'>;

describe('Mobile API contract', () => {
  let app: INestApplication;
  let authService: jest.Mocked<AuthServiceMock>;
  let mobileService: jest.Mocked<MobileServiceMock>;
  let usersService: jest.Mocked<UsersServiceMock>;

  const employeeUser = createUser({ role: 'employee' });
  const adminUser = createUser({
    fullName: 'Mobile Admin',
    id: '00000000-0000-4000-8000-0000000000ad',
    role: 'admin',
    username: 'mobile.admin',
  });

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
    };
    mobileService = {
      getActivePatrol: jest.fn(),
      getProfile: jest.fn(),
      getRoute: jest.fn(),
      recordPatrolEvent: jest.fn(),
      registerDevicePushToken: jest.fn(),
      scanNextRoutePoint: jest.fn(),
      startPatrol: jest.fn(),
      startRouteSetup: jest.fn(),
      syncPatrolEvents: jest.fn(),
    };
    usersService = {
      findEntityById: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController, MobileController],
      providers: [
        JwtAuthGuard,
        RolesGuard,
        { provide: AuthService, useValue: authService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const values: Record<string, string | number> = {
                'jwt.accessSecret': ACCESS_SECRET,
                'jwt.accessTtl': '15m',
                'jwt.refreshSecret': REFRESH_SECRET,
                'jwt.refreshTtlSeconds': 604800,
              };

              return values[key];
            }),
          },
        },
        { provide: MobileService, useValue: mobileService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('returns mobile tokens from login endpoint', async () => {
    const accessToken = issueAccessToken(employeeUser);
    const refreshToken = sign(
      {
        role: employeeUser.role,
        sessionVersion: 0,
        sub: employeeUser.id,
        username: employeeUser.username,
      },
      REFRESH_SECRET,
      { expiresIn: '7d' },
    );
    authService.login.mockResolvedValue({ accessToken, refreshToken });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        accessKey: 'MEMP-TEST-0001',
        deviceId: 'android-device-01',
      })
      .expect(200)
      .expect((response) => {
        const body = response.body as { accessToken?: string; refreshToken?: string };

        expect(body.accessToken).toBe(accessToken);
        expect(body.refreshToken).toBe(refreshToken);
      });
  });

  it('allows employee to read route, start patrol and sync offline events', async () => {
    const accessToken = issueAccessToken(employeeUser);
    usersService.findEntityById.mockResolvedValue(createUserEntity(employeeUser));
    mobileService.getRoute.mockResolvedValue([
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Вход',
        nfcTag: { uid: '04a1b2c3d4e5f6' },
        shopId: employeeUser.shopId,
        sortOrder: 1,
      },
    ] as Awaited<ReturnType<MobileService['getRoute']>>);
    mobileService.startPatrol.mockResolvedValue({
      employeeId: employeeUser.id,
      id: '33333333-3333-4333-8333-333333333333',
      shopId: employeeUser.shopId,
      status: 'in_progress',
    } as Awaited<ReturnType<MobileService['startPatrol']>>);
    mobileService.syncPatrolEvents.mockResolvedValue({
      items: [
        {
          localId: '11111111-1111-4111-8111-111111111111',
          serverId: '44444444-4444-4444-8444-444444444444',
          status: 'created',
        },
        {
          localId: '55555555-5555-4555-8555-555555555555',
          serverId: '66666666-6666-4666-8666-666666666666',
          status: 'duplicate',
        },
      ],
    });
    mobileService.registerDevicePushToken.mockResolvedValue({
      deviceId: 'android-device-01',
      id: '77777777-7777-4777-8777-777777777777',
      isActive: true,
      pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      userId: employeeUser.id,
    } as Awaited<ReturnType<MobileService['registerDevicePushToken']>>);

    await request(app.getHttpServer())
      .get('/api/v1/mobile/route')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = response.body as unknown[];

        expect(body).toHaveLength(1);
      });

    await request(app.getHttpServer())
      .post('/api/v1/mobile/patrols/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(201)
      .expect((response) => {
        const body = response.body as { status?: string };

        expect(body.status).toBe('in_progress');
      });

    await request(app.getHttpServer())
      .post('/api/v1/mobile/patrols/33333333-3333-4333-8333-333333333333/events/sync')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        events: [
          {
            deviceId: 'android-device-01',
            localId: '11111111-1111-4111-8111-111111111111',
            nfcUid: '04a1b2c3d4e5f6',
            patrolPointId: '22222222-2222-4222-8222-222222222222',
            scannedAt: '2026-06-19T10:00:00.000Z',
          },
        ],
      })
      .expect(200)
      .expect(
        (response) => {
          const body = response.body as {
            items?: Array<{ localId: string; serverId: string; status: string }>;
          };

          expect(body.items).toEqual([
            {
              localId: '11111111-1111-4111-8111-111111111111',
              serverId: '44444444-4444-4444-8444-444444444444',
              status: 'created',
            },
            {
              localId: '55555555-5555-4555-8555-555555555555',
              serverId: '66666666-6666-4666-8666-666666666666',
              status: 'duplicate',
            },
          ]);
        },
      );

    await request(app.getHttpServer())
      .post('/api/v1/mobile/devices/push-token')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        deviceId: 'android-device-01',
        platform: 'android',
        pushToken: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
      })
      .expect(200)
      .expect((response) => {
        const body = response.body as { isActive?: boolean; pushToken?: string };

        expect(body.isActive).toBe(true);
        expect(body.pushToken).toBe('ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]');
      });
  });

  it('allows admin to register route points but forbids patrol execution', async () => {
    const accessToken = issueAccessToken(adminUser);
    usersService.findEntityById.mockResolvedValue(createUserEntity(adminUser));
    mobileService.scanNextRoutePoint.mockResolvedValue({
      expectedPoints: 3,
      nextSortOrder: 2,
      points: [],
      registeredPoints: 1,
      routeStatus: 'setup_in_progress',
      shopId: '00000000-0000-4000-8000-0000000000aa',
    } as Awaited<ReturnType<MobileService['scanNextRoutePoint']>>);

    await request(app.getHttpServer())
      .post('/api/v1/mobile/shops/00000000-0000-4000-8000-0000000000aa/route-setup/scan')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ uid: '04a1b2c3d4e5f6' })
      .expect(200)
      .expect((response) => {
        const body = response.body as { registeredPoints?: number };

        expect(body.registeredPoints).toBe(1);
      });

    await request(app.getHttpServer())
      .post('/api/v1/mobile/patrols/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(403);
  });
});

function createUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    fullName: 'Mobile Employee',
    id: '00000000-0000-4000-8000-0000000000ee',
    role: 'employee',
    shopId: '00000000-0000-4000-8000-0000000000aa',
    username: 'mobile.employee',
    ...overrides,
  };
}

function issueAccessToken(user: AuthenticatedUser): string {
  return sign(
    { role: user.role, sessionVersion: 0, sub: user.id, username: user.username },
    ACCESS_SECRET,
    {
      expiresIn: '15m',
    },
  );
}

function createUserEntity(user: AuthenticatedUser): UserEntity {
  return {
    createdAt: new Date(),
    fullName: user.fullName,
    id: user.id,
    isActive: true,
    sessionVersion: 0,
    accessKey: 'MEMP-TEST-0001',
    accessKeyHash: 'hashed-access-key',
    passwordHash: 'hashed-password',
    role: user.role,
    shop: user.shop,
    shopId: user.shopId,
    updatedAt: new Date(),
    username: user.username,
  } as UserEntity;
}
