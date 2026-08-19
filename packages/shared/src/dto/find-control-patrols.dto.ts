import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PatrolStatus } from '../enums/patrol-status';
import { PaginationDto } from './pagination.dto';

const PATROL_STATUSES = ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'] satisfies PatrolStatus[];
const CONTROL_PATROL_SORTS = [
  'startedAt:desc',
  'startedAt:asc',
  'createdAt:desc',
  'createdAt:asc',
  'status:asc',
  'status:desc',
] as const;

export class FindControlPatrolsDto extends PaginationDto {
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
  routeId?: string;

  @ApiPropertyOptional({ enum: PATROL_STATUSES })
  @IsOptional()
  @IsIn(PATROL_STATUSES)
  status?: PatrolStatus;

  @ApiPropertyOptional({ description: 'Search by shop, employee or route name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ enum: CONTROL_PATROL_SORTS })
  @IsOptional()
  @IsIn(CONTROL_PATROL_SORTS)
  sort?: (typeof CONTROL_PATROL_SORTS)[number];
}
