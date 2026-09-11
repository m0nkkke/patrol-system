import { Injectable } from '@nestjs/common';
import {
  CreatePatrolScheduleDto,
  MobileSchedulePlanDto,
  MobileSchedulePlanItemDto,
  UpdatePatrolScheduleDto,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../../common/errors/not-found.error';
import { ShopsService } from '../../shops/shops.service';
import { PatrolScheduleEntity } from '../entities/patrol-schedule.entity';
import { PatrolsRepository } from '../patrols.repository';
import { PatrolRoutesService } from '../routes/patrol-routes.service';
import { PatrolSchedulesRepository } from './patrol-schedules.repository';

type AvailablePatrolSchedule = PatrolScheduleEntity & {
  timezone: string;
  isAvailable: boolean;
  dueAt?: Date;
  plannedStartAt?: Date;
  requiresLateStartReason: boolean;
  nextStartAt?: Date;
  nextWeekday?: number;
};

export type ResolvedPatrolScheduleWindow = {
  dueAt: Date;
  plannedStartAt: Date;
};

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
    private readonly patrolsRepository: PatrolsRepository,
    private readonly patrolRoutesService: PatrolRoutesService,
  ) {}

  async create(
    dto: CreatePatrolScheduleDto,
    actor: AuthenticatedUser,
  ): Promise<PatrolScheduleEntity> {
    await this.shopsService.findOne(dto.shopId);
    assertCanManageShop(actor, dto.shopId);
    if (dto.routeId !== undefined) {
      await this.patrolRoutesService.assertRouteUsable(dto.routeId, dto.shopId);
    }
    validateTimeWindow(dto.startTime, dto.endTime);
    if (dto.isActive ?? true) {
      await this.assertNoOverlap(
        dto.shopId,
        dto.weekdays,
        dto.startTime,
        dto.endTime,
        dto.earlyStartMinutes ?? 0,
      );
    }

    const schedule = await this.schedulesRepository.create({
      earlyStartMinutes: dto.earlyStartMinutes ?? 0,
      endTime: normalizeTime(dto.endTime),
      isActive: dto.isActive ?? true,
      name: dto.name,
      period: dto.period ?? 'morning',
      routeId: dto.routeId,
      shopId: dto.shopId,
      startTime: normalizeTime(dto.startTime),
      weekdays: [...dto.weekdays].sort((left, right) => left - right),
    });
    await this.shopsService.recalculateRouteStatus(dto.shopId);

    return schedule;
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
    const localTime = formatTime(local);
    const schedules = (await this.schedulesRepository.findByShop(shopId)).filter(
      (schedule) => schedule.isActive,
    );

    const available: AvailablePatrolSchedule[] = [];

    for (const schedule of schedules) {
      const nextStart = getNextScheduleStart(schedule, local, localTime, shop.timezone);

      if (!isScheduleInCurrentWindow(schedule, local.weekday, localTime)) {
        available.push({
          ...schedule,
          timezone: shop.timezone,
          isAvailable: false,
          requiresLateStartReason: false,
          nextStartAt: nextStart?.date,
          nextWeekday: nextStart?.weekday,
        });
        continue;
      }

      const dueAt = localDateTimeToUtc(local, schedule.endTime, shop.timezone);
      const plannedStartAt = localDateTimeToUtc(local, schedule.startTime, shop.timezone);
      const existingPatrol = await this.patrolsRepository.findExistingScheduledPatrol(
        schedule.id,
        dueAt,
      );

      available.push({
        ...schedule,
        timezone: shop.timezone,
        dueAt,
        isAvailable: existingPatrol === null,
        plannedStartAt,
        requiresLateStartReason: now > plannedStartAt,
        nextStartAt: nextStart?.date,
        nextWeekday: nextStart?.weekday,
      });
    }

    return available.sort(compareAvailableSchedules);
  }

  async getMobileSchedulePlanForShop(
    shopId: string,
    actor: AuthenticatedUser,
    days = 7,
    now: Date = new Date(),
  ): Promise<MobileSchedulePlanDto> {
    const normalizedDays = Math.min(Math.max(days, 1), 31);
    const shop = await this.shopsService.findOne(shopId);
    assertCanAccessShop(actor, shopId);

    const local = getLocalDateTime(now, shop.timezone);
    const schedules = (await this.schedulesRepository.findByShop(shopId)).filter(
      (schedule) => schedule.isActive,
    );
    const items: MobileSchedulePlanItemDto[] = [];

    for (const schedule of schedules) {
      for (let daysAhead = 0; daysAhead < normalizedDays; daysAhead += 1) {
        const weekday = getWeekdayAfter(local.weekday, daysAhead);

        if (!schedule.weekdays.includes(weekday)) {
          continue;
        }

        const targetLocal = addDaysToLocalDate(local, daysAhead);
        const plannedStartAt = localDateTimeToUtc(targetLocal, schedule.startTime, shop.timezone);
        const availableFrom = localDateTimeToUtc(
          targetLocal,
          getScheduleWindowStartTime(schedule),
          shop.timezone,
        );
        const dueAt = localDateTimeToUtc(targetLocal, schedule.endTime, shop.timezone);

        if (dueAt <= now) {
          continue;
        }

        items.push({
          availableFrom,
          dueAt,
          notificationAt: availableFrom,
          period: schedule.period,
          plannedStartAt,
          routeId: schedule.routeId ?? undefined,
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          shopId: shop.id,
          shopName: shop.name,
          timezone: shop.timezone,
          weekday,
        });
      }
    }

    return {
      days: normalizedDays,
      generatedAt: now,
      items: items.sort(compareSchedulePlanItems),
    };
  }

  async resolveDueAt(
    scheduleId: string,
    shopId: string,
    now: Date = new Date(),
  ): Promise<Date> {
    const window = await this.resolveStartWindow(scheduleId, shopId, now);

    return window.dueAt;
  }

  async resolveStartWindow(
    scheduleId: string,
    shopId: string,
    now: Date = new Date(),
  ): Promise<ResolvedPatrolScheduleWindow> {
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
      localTime < getScheduleWindowStartTime(schedule) ||
      localTime >= normalizeTime(schedule.endTime)
    ) {
      throw new DomainValidationError(
        'PATROL_SCHEDULE_OUTSIDE_WINDOW',
        'Patrol schedule is not available at the current local time',
      );
    }

    return {
      dueAt: localDateTimeToUtc(local, schedule.endTime, shop.timezone),
      plannedStartAt: localDateTimeToUtc(local, schedule.startTime, shop.timezone),
    };
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
    const routeId = dto.routeId ?? schedule.routeId;
    if (routeId !== undefined && (isActive || dto.routeId !== undefined)) {
      await this.patrolRoutesService.assertRouteUsable(routeId, schedule.shopId);
    }

    validateTimeWindow(startTime, endTime);

    if (isActive) {
      await this.assertNoOverlap(
        schedule.shopId,
        weekdays,
        startTime,
        endTime,
        dto.earlyStartMinutes ?? schedule.earlyStartMinutes,
        id,
      );
    }

    await this.schedulesRepository.update(id, {
      earlyStartMinutes: dto.earlyStartMinutes,
      endTime: dto.endTime === undefined ? undefined : normalizeTime(dto.endTime),
      isActive: dto.isActive,
      name: dto.name,
      period: dto.period,
      routeId: dto.routeId,
      startTime: dto.startTime === undefined ? undefined : normalizeTime(dto.startTime),
      weekdays:
        dto.weekdays === undefined
          ? undefined
          : [...dto.weekdays].sort((left, right) => left - right),
    });
    await this.shopsService.recalculateRouteStatus(schedule.shopId);

    return this.findOne(id);
  }

  async archive(id: string, actor: AuthenticatedUser): Promise<PatrolScheduleEntity> {
    const schedule = await this.findOne(id);
    assertCanManageShop(actor, schedule.shopId);
    const archived = await this.schedulesRepository.archive(id);
    await this.shopsService.recalculateRouteStatus(schedule.shopId);

    return archived;
  }

  private async assertNoOverlap(
    shopId: string,
    weekdays: number[],
    startTime: string,
    endTime: string,
    earlyStartMinutes: number,
    excludeId?: string,
  ): Promise<void> {
    const overlap = await this.schedulesRepository.findOverlapping(
      shopId,
      weekdays,
      subtractMinutesFromTime(startTime, earlyStartMinutes),
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
  if (actor.role === 'admin' || actor.role === 'route_setter') {
    return;
  }

  if (actor.role !== 'local_route_setter' || !actorHasShop(actor, shopId)) {
    throw new DomainValidationError(
      'PATROL_SCHEDULE_FORBIDDEN',
      'User cannot manage patrol schedules for this shop',
    );
  }
}

function assertCanAccessShop(actor: AuthenticatedUser, shopId: string): void {
  if (
    actor.role !== 'admin' &&
    actor.role !== 'route_setter' &&
    !actorHasShop(actor, shopId)
  ) {
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

function isScheduleInCurrentWindow(
  schedule: PatrolScheduleEntity,
  weekday: number,
  localTime: string,
): boolean {
  return (
    schedule.weekdays.includes(weekday) &&
    localTime >= getScheduleWindowStartTime(schedule) &&
    localTime < normalizeTime(schedule.endTime)
  );
}

function compareSchedulePlanItems(
  left: MobileSchedulePlanItemDto,
  right: MobileSchedulePlanItemDto,
): number {
  const plannedStart = left.plannedStartAt.getTime() - right.plannedStartAt.getTime();
  if (plannedStart !== 0) {
    return plannedStart;
  }

  return left.scheduleName.localeCompare(right.scheduleName);
}

function getNextScheduleStart(
  schedule: PatrolScheduleEntity,
  local: LocalDateTime,
  localTime: string,
  timeZone: string,
): { date: Date; weekday: number } | undefined {
  const startTime = getScheduleWindowStartTime(schedule);

  for (let daysAhead = 0; daysAhead < 7; daysAhead += 1) {
    const weekday = getWeekdayAfter(local.weekday, daysAhead);
    if (!schedule.weekdays.includes(weekday)) {
      continue;
    }
    if (daysAhead === 0 && localTime >= startTime) {
      continue;
    }

    const targetLocal = addDaysToLocalDate(local, daysAhead);
    return {
      date: localDateTimeToUtc(targetLocal, startTime, timeZone),
      weekday,
    };
  }

  return undefined;
}

function getWeekdayAfter(weekday: number, daysAhead: number): number {
  return ((weekday - 1 + daysAhead) % 7) + 1;
}

function addDaysToLocalDate(local: LocalDateTime, daysAhead: number): LocalDateTime {
  const date = new Date(Date.UTC(local.year, local.month - 1, local.day + daysAhead));

  return {
    day: date.getUTCDate(),
    hour: local.hour,
    minute: local.minute,
    month: date.getUTCMonth() + 1,
    second: local.second,
    weekday: getWeekdayAfter(local.weekday, daysAhead),
    year: date.getUTCFullYear(),
  };
}

function compareAvailableSchedules(
  left: AvailablePatrolSchedule,
  right: AvailablePatrolSchedule,
): number {
  const availability = Number(right.isAvailable) - Number(left.isAvailable);
  if (availability !== 0) {
    return availability;
  }

  if (left.isAvailable && right.isAvailable) {
    return compareByStartTimeThenName(left, right);
  }

  const leftNextStart = left.nextStartAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const rightNextStart = right.nextStartAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  const nextStart = leftNextStart - rightNextStart;
  if (nextStart !== 0) {
    return nextStart;
  }

  return compareByStartTimeThenName(left, right);
}

function compareByStartTimeThenName(
  left: PatrolScheduleEntity,
  right: PatrolScheduleEntity,
): number {
  const startTime = getScheduleWindowStartTime(left).localeCompare(getScheduleWindowStartTime(right));
  if (startTime !== 0) {
    return startTime;
  }

  return left.name.localeCompare(right.name);
}

function getScheduleWindowStartTime(schedule: PatrolScheduleEntity): string {
  return subtractMinutesFromTime(schedule.startTime, schedule.earlyStartMinutes);
}

function subtractMinutesFromTime(time: string, minutes: number): string {
  const totalSeconds = timeToSeconds(normalizeTime(time));
  const nextSeconds = Math.max(0, totalSeconds - minutes * 60);

  return secondsToTime(nextSeconds);
}

function timeToSeconds(time: string): number {
  const [hour = 0, minute = 0, second = 0] = normalizeTime(time).split(':').map(Number);

  return hour * 3600 + minute * 60 + second;
}

function secondsToTime(totalSeconds: number): string {
  const hour = Math.floor(totalSeconds / 3600);
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const second = totalSeconds % 60;

  return [hour, minute, second].map((value) => String(value).padStart(2, '0')).join(':');
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
