import { Injectable } from '@nestjs/common';
import { CreatePatrolScheduleDto, UpdatePatrolScheduleDto } from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { ShopsService } from '../shops/shops.service';
import { PatrolScheduleEntity } from './entities/patrol-schedule.entity';
import { PatrolSchedulesRepository } from './patrol-schedules.repository';

type AvailablePatrolSchedule = PatrolScheduleEntity & { dueAt: Date };

type LocalDateTime = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  weekday: number;
  year: number;
};

@Injectable()
export class PatrolSchedulesService {
  constructor(
    private readonly schedulesRepository: PatrolSchedulesRepository,
    private readonly shopsService: ShopsService,
  ) {}

  async create(
    dto: CreatePatrolScheduleDto,
    actor: AuthenticatedUser,
  ): Promise<PatrolScheduleEntity> {
    await this.shopsService.findOne(dto.shopId);
    assertCanManageShop(actor, dto.shopId);
    validateTimeWindow(dto.startTime, dto.endTime);
    if (dto.isActive ?? true) {
      await this.assertNoOverlap(dto.shopId, dto.weekdays, dto.startTime, dto.endTime);
    }

    return this.schedulesRepository.create({
      endTime: normalizeTime(dto.endTime),
      isActive: dto.isActive ?? true,
      name: dto.name,
      shopId: dto.shopId,
      startTime: normalizeTime(dto.startTime),
      weekdays: [...dto.weekdays].sort((left, right) => left - right),
    });
  }

  async findByShop(shopId: string, actor: AuthenticatedUser): Promise<PatrolScheduleEntity[]> {
    await this.shopsService.findOne(shopId);
    assertCanAccessShop(actor, shopId);

    return this.schedulesRepository.findByShop(shopId);
  }

  async findOne(id: string): Promise<PatrolScheduleEntity> {
    const schedule = await this.schedulesRepository.findById(id);

    if (schedule === null) {
      throw new EntityNotFoundError('PatrolSchedule', id);
    }

    return schedule;
  }

  async findOneForActor(id: string, actor: AuthenticatedUser): Promise<PatrolScheduleEntity> {
    const schedule = await this.findOne(id);
    assertCanAccessShop(actor, schedule.shopId);

    return schedule;
  }

  async findAvailableByShop(
    shopId: string,
    actor: AuthenticatedUser,
    now: Date = new Date(),
  ): Promise<AvailablePatrolSchedule[]> {
    const shop = await this.shopsService.findOne(shopId);
    assertCanAccessShop(actor, shopId);
    const local = getLocalDateTime(now, shop.timezone);
    const schedules = await this.schedulesRepository.findActiveByShopAndLocalTime(
      shopId,
      local.weekday,
      formatTime(local),
    );

    return schedules.map((schedule) => ({
      ...schedule,
      dueAt: localDateTimeToUtc(local, schedule.endTime, shop.timezone),
    }));
  }

  async resolveDueAt(
    scheduleId: string,
    shopId: string,
    now: Date = new Date(),
  ): Promise<Date> {
    const [schedule, shop] = await Promise.all([
      this.findOne(scheduleId),
      this.shopsService.findOne(shopId),
    ]);

    if (schedule.shopId !== shopId) {
      throw new DomainValidationError(
        'PATROL_SCHEDULE_WRONG_SHOP',
        'Patrol schedule belongs to another shop',
      );
    }

    if (!schedule.isActive) {
      throw new DomainValidationError('PATROL_SCHEDULE_INACTIVE', 'Patrol schedule is inactive');
    }

    const local = getLocalDateTime(now, shop.timezone);
    const localTime = formatTime(local);

    if (
      !schedule.weekdays.includes(local.weekday) ||
      localTime < normalizeTime(schedule.startTime) ||
      localTime >= normalizeTime(schedule.endTime)
    ) {
      throw new DomainValidationError(
        'PATROL_SCHEDULE_OUTSIDE_WINDOW',
        'Patrol schedule is not available at the current local time',
      );
    }

    return localDateTimeToUtc(local, schedule.endTime, shop.timezone);
  }

  async update(
    id: string,
    dto: UpdatePatrolScheduleDto,
    actor: AuthenticatedUser,
  ): Promise<PatrolScheduleEntity> {
    const schedule = await this.findOne(id);
    assertCanManageShop(actor, schedule.shopId);
    const weekdays = dto.weekdays ?? schedule.weekdays;
    const startTime = dto.startTime ?? schedule.startTime;
    const endTime = dto.endTime ?? schedule.endTime;
    const isActive = dto.isActive ?? schedule.isActive;

    validateTimeWindow(startTime, endTime);

    if (isActive) {
      await this.assertNoOverlap(schedule.shopId, weekdays, startTime, endTime, id);
    }

    await this.schedulesRepository.update(id, {
      endTime: dto.endTime === undefined ? undefined : normalizeTime(dto.endTime),
      isActive: dto.isActive,
      name: dto.name,
      startTime: dto.startTime === undefined ? undefined : normalizeTime(dto.startTime),
      weekdays:
        dto.weekdays === undefined
          ? undefined
          : [...dto.weekdays].sort((left, right) => left - right),
    });

    return this.findOne(id);
  }

  deactivate(id: string, actor: AuthenticatedUser): Promise<PatrolScheduleEntity> {
    return this.update(id, { isActive: false }, actor);
  }

  private async assertNoOverlap(
    shopId: string,
    weekdays: number[],
    startTime: string,
    endTime: string,
    excludeId?: string,
  ): Promise<void> {
    const overlap = await this.schedulesRepository.findOverlapping(
      shopId,
      weekdays,
      normalizeTime(startTime),
      normalizeTime(endTime),
      excludeId,
    );

    if (overlap !== null) {
      throw new DomainValidationError(
        'PATROL_SCHEDULE_OVERLAP',
        `Patrol schedule overlaps with "${overlap.name}"`,
      );
    }
  }
}

function assertCanManageShop(actor: AuthenticatedUser, shopId: string): void {
  if (actor.role === 'admin') {
    return;
  }

  if (actor.role !== 'manager' || !actorHasShop(actor, shopId)) {
    throw new DomainValidationError(
      'PATROL_SCHEDULE_FORBIDDEN',
      'User cannot manage patrol schedules for this shop',
    );
  }
}

function assertCanAccessShop(actor: AuthenticatedUser, shopId: string): void {
  if (actor.role !== 'admin' && !actorHasShop(actor, shopId)) {
    throw new DomainValidationError(
      'PATROL_SCHEDULE_FORBIDDEN',
      'User cannot access patrol schedules for this shop',
    );
  }
}

function actorHasShop(actor: AuthenticatedUser, shopId: string): boolean {
  return actor.shopId === shopId || actor.shopIds?.includes(shopId) === true;
}

function validateTimeWindow(startTime: string, endTime: string): void {
  if (normalizeTime(endTime) <= normalizeTime(startTime)) {
    throw new DomainValidationError(
      'PATROL_SCHEDULE_INVALID_WINDOW',
      'Patrol schedule end time must be later than start time',
    );
  }
}

function normalizeTime(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function getLocalDateTime(date: Date, timeZone: string): LocalDateTime {
  const parts = new Intl.DateTimeFormat('en-US', {
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    month: '2-digit',
    second: '2-digit',
    timeZone,
    weekday: 'short',
    year: 'numeric',
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekday = weekdayNames.indexOf(values.get('weekday') ?? '') + 1;

  return {
    day: Number(values.get('day')),
    hour: Number(values.get('hour')),
    minute: Number(values.get('minute')),
    month: Number(values.get('month')),
    second: Number(values.get('second')),
    weekday,
    year: Number(values.get('year')),
  };
}

function formatTime(local: LocalDateTime): string {
  return [local.hour, local.minute, local.second]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}

function localDateTimeToUtc(local: LocalDateTime, time: string, timeZone: string): Date {
  const [hour = 0, minute = 0, second = 0] = normalizeTime(time).split(':').map(Number);
  const intendedUtc = Date.UTC(local.year, local.month - 1, local.day, hour, minute, second);
  let candidate = new Date(intendedUtc);

  // Two passes account for DST transitions without coupling the domain to the server timezone.
  for (let pass = 0; pass < 2; pass += 1) {
    const represented = getLocalDateTime(candidate, timeZone);
    const representedUtc = Date.UTC(
      represented.year,
      represented.month - 1,
      represented.day,
      represented.hour,
      represented.minute,
      represented.second,
    );
    candidate = new Date(candidate.getTime() + intendedUtc - representedUtc);
  }

  return candidate;
}
