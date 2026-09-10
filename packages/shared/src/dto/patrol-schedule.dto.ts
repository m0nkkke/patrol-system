import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

import { PATROL_PERIODS, PatrolPeriod } from '../enums/patrol-period';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreatePatrolScheduleDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  shopId: string = '';

  @ApiProperty({ example: 'Вечерний обход' })
  @IsString()
  @Length(1, 200)
  name: string = '';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @ApiProperty({ enum: PATROL_PERIODS, default: 'morning' })
  @IsIn(PATROL_PERIODS)
  period: PatrolPeriod = 'morning';

  @ApiPropertyOptional({ default: 0, minimum: 0, maximum: 1440 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  earlyStartMinutes?: number;

  @ApiProperty({ example: [1, 2, 3, 4, 5], type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays: number[] = [];

  @ApiProperty({ example: '20:00', pattern: TIME_PATTERN.source })
  @Matches(TIME_PATTERN)
  startTime: string = '';

  @ApiProperty({ example: '21:00', pattern: TIME_PATTERN.source })
  @Matches(TIME_PATTERN)
  endTime: string = '';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePatrolScheduleDto {
  @ApiPropertyOptional({ example: 'Вечерний обход' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @ApiPropertyOptional({ enum: PATROL_PERIODS })
  @IsOptional()
  @IsIn(PATROL_PERIODS)
  period?: PatrolPeriod;

  @ApiPropertyOptional({ minimum: 0, maximum: 1440 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1440)
  earlyStartMinutes?: number;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5], type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays?: number[];

  @ApiPropertyOptional({ example: '20:00', pattern: TIME_PATTERN.source })
  @IsOptional()
  @Matches(TIME_PATTERN)
  startTime?: string;

  @ApiPropertyOptional({ example: '21:00', pattern: TIME_PATTERN.source })
  @IsOptional()
  @Matches(TIME_PATTERN)
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class StartMobilePatrolDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  shopId: string = '';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @ApiPropertyOptional({
    description: 'Required when a scheduled patrol starts after its configured start time',
    maxLength: 1000,
    minLength: 5,
  })
  @IsOptional()
  @IsString()
  @Length(5, 1000)
  lateStartReason?: string;
}

export class PatrolScheduleDto {
  @ApiProperty({ format: 'uuid' })
  id: string = '';

  @ApiProperty({ format: 'uuid' })
  shopId: string = '';

  @ApiPropertyOptional({ format: 'uuid' })
  routeId?: string;

  @ApiProperty({ enum: PATROL_PERIODS })
  period: PatrolPeriod = 'morning';

  @ApiProperty({ minimum: 0, maximum: 1440 })
  earlyStartMinutes: number = 0;

  @ApiProperty()
  name: string = '';

  @ApiProperty({ type: [Number] })
  weekdays: number[] = [];

  @ApiProperty({ example: '20:00:00' })
  startTime: string = '';

  @ApiProperty({ example: '21:00:00' })
  endTime: string = '';

  @ApiProperty()
  isActive: boolean = true;

  @ApiPropertyOptional({ format: 'date-time' })
  deletedAt?: Date;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date = new Date();

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date = new Date();
}

export class AvailablePatrolScheduleDto extends PatrolScheduleDto {
  @ApiProperty()
  isAvailable: boolean = false;

  @ApiPropertyOptional({ format: 'date-time' })
  dueAt?: Date;

  @ApiPropertyOptional({ format: 'date-time' })
  plannedStartAt?: Date;

  @ApiProperty()
  requiresLateStartReason: boolean = false;

  @ApiPropertyOptional({ format: 'date-time' })
  nextStartAt?: Date;

  @ApiPropertyOptional({ example: 3, minimum: 1, maximum: 7 })
  nextWeekday?: number;
}

export class MobileSchedulePlanQueryDto {
  @ApiPropertyOptional({ default: 7, minimum: 1, maximum: 31 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(31)
  days: number = 7;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shopId?: string;
}

export class MobileSchedulePlanItemDto {
  @ApiProperty({ format: 'uuid' })
  scheduleId: string = '';

  @ApiProperty({ format: 'uuid' })
  shopId: string = '';

  @ApiProperty()
  shopName: string = '';

  @ApiPropertyOptional({ format: 'uuid' })
  routeId?: string;

  @ApiProperty()
  scheduleName: string = '';

  @ApiProperty({ enum: PATROL_PERIODS })
  period: PatrolPeriod = 'morning';

  @ApiProperty({ format: 'date-time' })
  plannedStartAt: Date = new Date();

  @ApiProperty({ format: 'date-time' })
  availableFrom: Date = new Date();

  @ApiProperty({ format: 'date-time' })
  dueAt: Date = new Date();

  @ApiProperty({ format: 'date-time' })
  notificationAt: Date = new Date();

  @ApiProperty({ minimum: 1, maximum: 7 })
  weekday: number = 1;

  @ApiProperty()
  timezone: string = 'Europe/Moscow';
}

export class MobileSchedulePlanDto {
  @ApiProperty({ type: [MobileSchedulePlanItemDto] })
  items: MobileSchedulePlanItemDto[] = [];

  @ApiProperty({ minimum: 1, maximum: 31 })
  days: number = 7;

  @ApiProperty({ format: 'date-time' })
  generatedAt: Date = new Date();
}
