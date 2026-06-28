import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { ShopEntity } from '../shops/entities/shop.entity';
import { ShopsService } from '../shops/shops.service';
import { PatrolScheduleEntity } from './entities/patrol-schedule.entity';
import { PatrolEntity } from './entities/patrol.entity';
import { PatrolSchedulesRepository } from './patrol-schedules.repository';
import { PatrolSchedulesService } from './patrol-schedules.service';
import { PatrolsRepository } from './patrols.repository';

type PatrolSchedulesRepositoryMock = Pick<
  PatrolSchedulesRepository,
  | 'create'
  | 'findActiveByShopAndLocalTime'
  | 'findById'
  | 'findByShop'
  | 'findOverlapping'
  | 'update'
>;

type ShopsServiceMock = Pick<ShopsService, 'findOne'>;
type PatrolsRepositoryMock = Pick<PatrolsRepository, 'findExistingScheduledPatrol'>;

describe('PatrolSchedulesService', () => {
  let patrolsRepository: jest.Mocked<PatrolsRepositoryMock>;
  let repository: jest.Mocked<PatrolSchedulesRepositoryMock>;
  let service: PatrolSchedulesService;
  let shopsService: jest.Mocked<ShopsServiceMock>;

  beforeEach(() => {
    repository = {
      create: jest.fn(),
      findActiveByShopAndLocalTime: jest.fn(),
      findById: jest.fn(),
      findByShop: jest.fn(),
      findOverlapping: jest.fn(),
      update: jest.fn(),
    };
    patrolsRepository = {
      findExistingScheduledPatrol: jest.fn().mockResolvedValue(null),
    };
    shopsService = { findOne: jest.fn() };
    service = new PatrolSchedulesService(
      repository as unknown as PatrolSchedulesRepository,
      shopsService as unknown as ShopsService,
      patrolsRepository as unknown as PatrolsRepository,
    );
  });

  it('calculates schedule deadline in shop timezone', async () => {
    const schedule = createSchedule({ endTime: '11:00:00' });
    shopsService.findOne.mockResolvedValue(createShop());
    repository.findActiveByShopAndLocalTime.mockResolvedValue([schedule]);

    const result = await service.findAvailableByShop(
      'shop-id',
      createActor({ shopId: 'shop-id' }),
      new Date('2026-06-22T03:30:00.000Z'),
    );

    expect(repository.findActiveByShopAndLocalTime).toHaveBeenCalledWith(
      'shop-id',
      1,
      '10:30:00',
    );
    expect(result[0]?.dueAt).toEqual(new Date('2026-06-22T04:00:00.000Z'));
  });

  it('excludes schedules already started for the current window', async () => {
    const availableSchedule = createSchedule({ id: 'available-schedule-id' });
    const startedSchedule = createSchedule({ id: 'started-schedule-id' });
    shopsService.findOne.mockResolvedValue(createShop());
    repository.findActiveByShopAndLocalTime.mockResolvedValue([
      availableSchedule,
      startedSchedule,
    ]);
    patrolsRepository.findExistingScheduledPatrol
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createPatrol({ scheduleId: startedSchedule.id }));

    const result = await service.findAvailableByShop(
      'shop-id',
      createActor({ shopId: 'shop-id' }),
      new Date('2026-06-22T03:30:00.000Z'),
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(availableSchedule.id);
    expect(patrolsRepository.findExistingScheduledPatrol).toHaveBeenCalledWith(
      startedSchedule.id,
      new Date('2026-06-22T04:00:00.000Z'),
    );
  });

  it('rejects start outside configured time window', async () => {
    shopsService.findOne.mockResolvedValue(createShop());
    repository.findById.mockResolvedValue(createSchedule());

    await expect(
      service.resolveDueAt(
        'schedule-id',
        'shop-id',
        new Date('2026-06-22T05:30:00.000Z'),
      ),
    ).rejects.toMatchObject({ code: 'PATROL_SCHEDULE_OUTSIDE_WINDOW' });
  });

  it('rejects overlapping active schedule', async () => {
    shopsService.findOne.mockResolvedValue(createShop());
    repository.findOverlapping.mockResolvedValue(createSchedule({ name: 'Утренний обход' }));

    await expect(
      service.create(
        {
          endTime: '10:30',
          name: 'Второй обход',
          shopId: 'shop-id',
          startTime: '09:30',
          weekdays: [1],
        },
        createActor({ role: 'admin' }),
      ),
    ).rejects.toMatchObject({ code: 'PATROL_SCHEDULE_OVERLAP' });
  });

  it('does not allow manager to manage another shop schedule', async () => {
    shopsService.findOne.mockResolvedValue(createShop());

    await expect(
      service.create(
        {
          endTime: '11:00',
          name: 'Утренний обход',
          shopId: 'shop-id',
          startTime: '10:00',
          weekdays: [1],
        },
        createActor({ shopId: 'another-shop' }),
      ),
    ).rejects.toBeInstanceOf(DomainValidationError);
    expect(repository.create).not.toHaveBeenCalled();
  });
});

function createActor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    fullName: 'Manager',
    id: 'user-id',
    role: 'manager',
    shopId: 'shop-id',
    username: 'manager',
    ...overrides,
  };
}

function createSchedule(overrides: Partial<PatrolScheduleEntity> = {}): PatrolScheduleEntity {
  return {
    createdAt: new Date(),
    endTime: '11:00:00',
    id: 'schedule-id',
    isActive: true,
    name: 'Утренний обход',
    shopId: 'shop-id',
    startTime: '10:00:00',
    updatedAt: new Date(),
    weekdays: [1, 2, 3, 4, 5],
    ...overrides,
  } as PatrolScheduleEntity;
}

function createShop(): ShopEntity {
  return {
    id: 'shop-id',
    routeStatus: 'ready',
    timezone: 'Asia/Krasnoyarsk',
  } as ShopEntity;
}

function createPatrol(overrides: Partial<PatrolEntity> = {}): PatrolEntity {
  return {
    createdAt: new Date(),
    employeeId: 'employee-id',
    id: 'patrol-id',
    scannedPoints: 0,
    shopId: 'shop-id',
    startedAt: new Date(),
    status: 'in_progress',
    totalPoints: 3,
    updatedAt: new Date(),
    ...overrides,
  } as PatrolEntity;
}
