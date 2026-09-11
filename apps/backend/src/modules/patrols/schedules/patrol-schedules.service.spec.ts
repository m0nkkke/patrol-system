import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { ShopEntity } from '../../shops/entities/shop.entity';
import { ShopsService } from '../../shops/shops.service';
import { PatrolScheduleEntity } from '../entities/patrol-schedule.entity';
import { PatrolEntity } from '../entities/patrol.entity';
import { PatrolsRepository } from '../patrols.repository';
import { PatrolRoutesService } from '../routes/patrol-routes.service';
import { PatrolSchedulesRepository } from './patrol-schedules.repository';
import { PatrolSchedulesService } from './patrol-schedules.service';

type PatrolSchedulesRepositoryMock = Pick<
  PatrolSchedulesRepository,
  | 'archive'
  | 'create'
  | 'findActiveByShopAndLocalTime'
  | 'findById'
  | 'findByShop'
  | 'findOverlapping'
  | 'update'
>;

type ShopsServiceMock = Pick<ShopsService, 'findOne' | 'recalculateRouteStatus'>;
type PatrolsRepositoryMock = Pick<PatrolsRepository, 'findExistingScheduledPatrol'>;
type PatrolRoutesServiceMock = Pick<PatrolRoutesService, 'assertRouteUsable'>;

describe('PatrolSchedulesService', () => {
  let patrolsRepository: jest.Mocked<PatrolsRepositoryMock>;
  let repository: jest.Mocked<PatrolSchedulesRepositoryMock>;
  let service: PatrolSchedulesService;
  let shopsService: jest.Mocked<ShopsServiceMock>;
  let patrolRoutesService: jest.Mocked<PatrolRoutesServiceMock>;

  beforeEach(() => {
    repository = {
      archive: jest.fn(),
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
    shopsService = { findOne: jest.fn(), recalculateRouteStatus: jest.fn() };
    patrolRoutesService = {
      assertRouteUsable: jest.fn(),
    };
    service = new PatrolSchedulesService(
      repository as unknown as PatrolSchedulesRepository,
      shopsService as unknown as ShopsService,
      patrolsRepository as unknown as PatrolsRepository,
      patrolRoutesService as unknown as PatrolRoutesService,
    );
  });

  it('calculates schedule deadline in shop timezone', async () => {
    const schedule = createSchedule({ endTime: '11:00:00' });
    shopsService.findOne.mockResolvedValue(createShop());
    repository.findByShop.mockResolvedValue([schedule]);

    const result = await service.findAvailableByShop(
      'shop-id',
      createActor({ shopId: 'shop-id' }),
      new Date('2026-06-22T03:30:00.000Z'),
    );

    expect(result[0]?.isAvailable).toBe(true);
    expect(result[0]?.dueAt).toEqual(new Date('2026-06-22T04:00:00.000Z'));
    expect(result[0]?.plannedStartAt).toEqual(new Date('2026-06-22T03:00:00.000Z'));
    expect(result[0]?.requiresLateStartReason).toBe(true);
    expect(result[0]?.timezone).toBe('Asia/Krasnoyarsk');
    expect(result[0]?.nextStartAt).toEqual(new Date('2026-06-23T03:00:00.000Z'));
    expect(result[0]?.nextWeekday).toBe(2);
  });

  it('keeps started schedules unavailable for the current window', async () => {
    const availableSchedule = createSchedule({ id: 'available-schedule-id' });
    const startedSchedule = createSchedule({ id: 'started-schedule-id' });
    shopsService.findOne.mockResolvedValue(createShop());
    repository.findByShop.mockResolvedValue([availableSchedule, startedSchedule]);
    patrolsRepository.findExistingScheduledPatrol
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createPatrol({ scheduleId: startedSchedule.id }));

    const result = await service.findAvailableByShop(
      'shop-id',
      createActor({ shopId: 'shop-id' }),
      new Date('2026-06-22T03:30:00.000Z'),
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe(availableSchedule.id);
    expect(result[0]?.isAvailable).toBe(true);
    expect(result[1]?.id).toBe(startedSchedule.id);
    expect(result[1]?.isAvailable).toBe(false);
    expect(patrolsRepository.findExistingScheduledPatrol).toHaveBeenCalledWith(
      startedSchedule.id,
      new Date('2026-06-22T04:00:00.000Z'),
    );
  });

  it('sorts unavailable schedules by nearest next start in shop timezone', async () => {
    const fridaySchedule = createSchedule({
      id: 'friday-schedule-id',
      weekdays: [5],
    });
    const wednesdaySchedule = createSchedule({
      id: 'wednesday-schedule-id',
      weekdays: [3, 4],
    });
    shopsService.findOne.mockResolvedValue(createShop());
    repository.findByShop.mockResolvedValue([fridaySchedule, wednesdaySchedule]);

    const result = await service.findAvailableByShop(
      'shop-id',
      createActor({ shopId: 'shop-id' }),
      new Date('2026-06-23T03:30:00.000Z'),
    );

    expect(result[0]?.id).toBe(wednesdaySchedule.id);
    expect(result[0]?.nextStartAt).toEqual(new Date('2026-06-24T03:00:00.000Z'));
    expect(result[0]?.nextWeekday).toBe(3);
    expect(result[1]?.id).toBe(fridaySchedule.id);
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

  it('allows start inside configured early start window', async () => {
    shopsService.findOne.mockResolvedValue(createShop());
    repository.findById.mockResolvedValue(createSchedule({ earlyStartMinutes: 60 }));

    await expect(
      service.resolveDueAt(
        'schedule-id',
        'shop-id',
        new Date('2026-06-22T02:30:00.000Z'),
      ),
    ).resolves.toEqual(new Date('2026-06-22T04:00:00.000Z'));
  });

  it('resolves both planned start and deadline in the shop timezone', async () => {
    shopsService.findOne.mockResolvedValue(createShop());
    repository.findById.mockResolvedValue(createSchedule({ earlyStartMinutes: 60 }));

    await expect(
      service.resolveStartWindow(
        'schedule-id',
        'shop-id',
        new Date('2026-06-22T02:30:00.000Z'),
      ),
    ).resolves.toEqual({
      dueAt: new Date('2026-06-22T04:00:00.000Z'),
      plannedStartAt: new Date('2026-06-22T03:00:00.000Z'),
    });
  });

  it('builds mobile schedule plan for local reminders', async () => {
    shopsService.findOne.mockResolvedValue(createShop());
    repository.findByShop.mockResolvedValue([
      createSchedule({
        earlyStartMinutes: 30,
        id: 'morning-schedule-id',
        routeId: 'route-id',
        weekdays: [1, 2],
      }),
    ]);

    const result = await service.getMobileSchedulePlanForShop(
      'shop-id',
      createActor({ role: 'security_guard', shopId: 'shop-id' }),
      2,
      new Date('2026-06-22T01:00:00.000Z'),
    );

    expect(result).toMatchObject({
      days: 2,
      items: [
        {
          availableFrom: new Date('2026-06-22T02:30:00.000Z'),
          dueAt: new Date('2026-06-22T04:00:00.000Z'),
          notificationAt: new Date('2026-06-22T02:30:00.000Z'),
          plannedStartAt: new Date('2026-06-22T03:00:00.000Z'),
          routeId: 'route-id',
          scheduleId: 'morning-schedule-id',
          shopId: 'shop-id',
          shopName: 'Shop 1',
          weekday: 1,
        },
        {
          plannedStartAt: new Date('2026-06-23T03:00:00.000Z'),
          weekday: 2,
        },
      ],
    });
  });

  it('rejects overlapping active schedule', async () => {
    shopsService.findOne.mockResolvedValue(createShop());
    repository.findOverlapping.mockResolvedValue(createSchedule({ name: 'Утренний обход' }));

    await expect(
      service.create(
        {
          endTime: '10:30',
          period: 'morning',
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
          period: 'morning',
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

  it('soft-archives a schedule and recalculates shop readiness', async () => {
    const schedule = createSchedule();
    const archived = createSchedule({ deletedAt: new Date(), isActive: false });
    repository.findById.mockResolvedValue(schedule);
    repository.archive.mockResolvedValue(archived);

    await expect(service.archive('schedule-id', createActor())).resolves.toBe(archived);
    expect(repository.archive).toHaveBeenCalledWith('schedule-id');
    expect(shopsService.recalculateRouteStatus).toHaveBeenCalledWith('shop-id');
  });

  it('does not reactivate a schedule whose route is unavailable', async () => {
    repository.findById.mockResolvedValue(
      createSchedule({ isActive: false, routeId: 'route-id' }),
    );
    patrolRoutesService.assertRouteUsable.mockRejectedValue(
      new DomainValidationError('PATROL_ROUTE_INACTIVE', 'Patrol route is inactive'),
    );

    await expect(
      service.update('schedule-id', { isActive: true }, createActor()),
    ).rejects.toMatchObject({ code: 'PATROL_ROUTE_INACTIVE' });
    expect(repository.update).not.toHaveBeenCalled();
  });
});

function createActor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    fullName: 'Manager',
    id: 'user-id',
    role: 'local_route_setter',
    shopId: 'shop-id',
    username: 'manager',
    ...overrides,
  };
}

function createSchedule(overrides: Partial<PatrolScheduleEntity> = {}): PatrolScheduleEntity {
  return {
    createdAt: new Date(),
    earlyStartMinutes: 0,
    endTime: '11:00:00',
    id: 'schedule-id',
    isActive: true,
    period: 'morning',
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
    name: 'Shop 1',
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
