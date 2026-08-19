import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

import { PATROL_PERIODS, PatrolPeriod } from '../enums/patrol-period';
import { PATROL_REPORT_STATUSES, PatrolReportStatus } from '../enums/patrol-report-status';
import { PATROL_REPORT_TYPES, PatrolReportType } from '../enums/patrol-report-type';
import { PaginationDto } from './pagination.dto';

export class CreatePatrolReportDto {
  @ApiProperty({ enum: PATROL_REPORT_TYPES })
  @IsIn(PATROL_REPORT_TYPES)
  reportType: PatrolReportType = 'photo_report';

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  shopId: string = '';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  patrolId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @ApiPropertyOptional({ enum: PATROL_PERIODS })
  @IsOptional()
  @IsIn(PATROL_PERIODS)
  period?: PatrolPeriod;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  fields?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class SubmitPatrolReportDto {
  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  fields?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comment?: string;
}

export class CancelPatrolReportDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason: string = '';
}

export class FindPatrolReportsDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  patrolId?: string;

  @ApiPropertyOptional({ enum: PATROL_REPORT_TYPES })
  @IsOptional()
  @IsIn(PATROL_REPORT_TYPES)
  reportType?: PatrolReportType;

  @ApiPropertyOptional({ enum: PATROL_REPORT_STATUSES })
  @IsOptional()
  @IsIn(PATROL_REPORT_STATUSES)
  status?: PatrolReportStatus;

  @ApiPropertyOptional({ enum: PATROL_PERIODS })
  @IsOptional()
  @IsIn(PATROL_PERIODS)
  period?: PatrolPeriod;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ default: 'createdAt:desc' })
  @IsOptional()
  @IsIn(['createdAt:desc', 'createdAt:asc', 'submittedAt:desc', 'submittedAt:asc'])
  sort?: 'createdAt:desc' | 'createdAt:asc' | 'submittedAt:desc' | 'submittedAt:asc';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

export class ManagementMetricsQueryDto {
  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  regionId?: string;
}

export class ManagementScorecardsQueryDto extends ManagementMetricsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 50, maximum: 500, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number = 50;

  @ApiPropertyOptional({ default: 'shopName:asc' })
  @IsOptional()
  @IsIn([
    'shopName:asc',
    'shopName:desc',
    'completionRate:asc',
    'completionRate:desc',
    'onTimeRate:asc',
    'onTimeRate:desc',
    'cleanPatrolRate:asc',
    'cleanPatrolRate:desc',
    'attentionRate:asc',
    'attentionRate:desc',
    'status:asc',
    'status:desc',
  ])
  sort?:
    | 'shopName:asc'
    | 'shopName:desc'
    | 'completionRate:asc'
    | 'completionRate:desc'
    | 'onTimeRate:asc'
    | 'onTimeRate:desc'
    | 'cleanPatrolRate:asc'
    | 'cleanPatrolRate:desc'
    | 'attentionRate:asc'
    | 'attentionRate:desc'
    | 'status:asc'
    | 'status:desc';
}

export class ManagementTrendsQueryDto extends ManagementMetricsQueryDto {
  @ApiPropertyOptional({ default: 'day', enum: ['day', 'week', 'month'] })
  @IsOptional()
  @IsIn(['day', 'week', 'month'])
  bucket?: 'day' | 'week' | 'month' = 'day';
}

export class ManagementBreakdownQueryDto extends ManagementMetricsQueryDto {
  @ApiPropertyOptional({ default: 'routeCategory', enum: ['routeCategory', 'period'] })
  @IsOptional()
  @IsIn(['routeCategory', 'period'])
  groupBy?: 'routeCategory' | 'period' = 'routeCategory';
}
