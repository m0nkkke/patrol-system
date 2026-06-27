import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PatrolIncidentType } from '../enums/patrol-incident-type';
import { PatrolStatus } from '../enums/patrol-status';
import { PaginationDto } from './pagination.dto';

const PATROL_INCIDENT_TYPES = Object.values(PatrolIncidentType);
const PATROL_STATUSES = ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'] satisfies PatrolStatus[];
const PATROL_SORT_FIELDS = ['createdAt:desc', 'createdAt:asc', 'startedAt:desc', 'startedAt:asc', 'status:asc', 'status:desc'] as const;
const INCIDENT_SORT_FIELDS = ['createdAt:desc', 'createdAt:asc', 'type:asc', 'type:desc'] as const;

export class FindPatrolIncidentsDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ description: 'Search by incident message, shop name or employee full name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: PATROL_INCIDENT_TYPES })
  @IsOptional()
  @IsIn(PATROL_INCIDENT_TYPES)
  type?: PatrolIncidentType;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ enum: INCIDENT_SORT_FIELDS })
  @IsOptional()
  @IsIn(INCIDENT_SORT_FIELDS)
  sort?: (typeof INCIDENT_SORT_FIELDS)[number];
}

export class FindPatrolsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PATROL_STATUSES })
  @IsOptional()
  @IsIn(PATROL_STATUSES)
  status?: PatrolStatus;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  to?: string;

  @ApiPropertyOptional({ enum: PATROL_SORT_FIELDS })
  @IsOptional()
  @IsIn(PATROL_SORT_FIELDS)
  sort?: (typeof PATROL_SORT_FIELDS)[number];
}
