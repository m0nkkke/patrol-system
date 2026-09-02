import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PatrolPointEntity } from './entities/patrol-point.entity';
import { PatrolPointsController } from './patrol-points.controller';
import { PatrolPointsService } from './patrol-points.service';

type PatrolPointsServiceMock = Pick<PatrolPointsService, 'archive' | 'restore' | 'update'>;

describe('Patrol points API contract', () => {
  let app: INestApplication;
  let service: jest.Mocked<PatrolPointsServiceMock>;

  beforeEach(async () => {
    service = {
      archive: jest.fn(),
      restore: jest.fn(),
      update: jest.fn(),
    };
    const actor: AuthenticatedUser = {
      fullName: 'Local Route Setter',
      id: '00000000-0000-4000-8000-000000000001',
      role: 'local_route_setter',
      shopId: '00000000-0000-4000-8000-000000000010',
      username: 'local.setter',
    };
    const authGuard = {
      canActivate(context: ExecutionContext): boolean {
        context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user = actor;
        return true;
      },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [PatrolPointsController],
      providers: [{ provide: PatrolPointsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(authGuard)
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new GlobalExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('updates name and description through PATCH', async () => {
    service.update.mockResolvedValue(createPoint({ name: 'Updated point' }));

    await request(app.getHttpServer())
      .patch('/api/v1/patrol-points/00000000-0000-4000-8000-000000000020')
      .send({ description: 'Updated description', name: 'Updated point' })
      .expect(200)
      .expect((response) => {
        expect((response.body as { name?: string }).name).toBe('Updated point');
      });

    expect(service.update).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000020',
      { description: 'Updated description', name: 'Updated point' },
      expect.objectContaining({ role: 'local_route_setter' }),
    );
  });

  it('rejects route order and NFC binding in the generic PATCH contract', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/patrol-points/00000000-0000-4000-8000-000000000020')
      .send({ name: 'Updated point', nfcTagId: null, sortOrder: 4 })
      .expect(400);

    expect(service.update).not.toHaveBeenCalled();
  });

  it('archives with DELETE and restores with POST', async () => {
    service.archive.mockResolvedValue(createPoint({ isActive: false }));
    service.restore.mockResolvedValue(createPoint());
    const endpoint = '/api/v1/patrol-points/00000000-0000-4000-8000-000000000020';

    await request(app.getHttpServer()).delete(endpoint).expect(200);
    await request(app.getHttpServer()).post(`${endpoint}/restore`).expect(200);

    expect(service.archive).toHaveBeenCalledTimes(1);
    expect(service.restore).toHaveBeenCalledTimes(1);
  });
});

function createPoint(overrides: Partial<PatrolPointEntity> = {}): PatrolPointEntity {
  return {
    createdAt: new Date(),
    id: '00000000-0000-4000-8000-000000000020',
    isActive: true,
    name: 'Point 1',
    shopId: '00000000-0000-4000-8000-000000000010',
    sortOrder: 1,
    updatedAt: new Date(),
    ...overrides,
  };
}
