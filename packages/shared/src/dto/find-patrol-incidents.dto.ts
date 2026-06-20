import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsOptional, IsUUID } from 'class-validator';

import { PatrolIncidentType } from '../enums/patrol-incident-type';
import { PaginationDto } from './pagination.dto';

const PATROL_INCIDENT_TYPES = Object.values(PatrolIncidentType);

export class FindPatrolIncidentsDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;

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
}
