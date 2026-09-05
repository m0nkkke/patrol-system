import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsInt,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Max,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

import { PATROL_ROUTE_CATEGORIES, PatrolRouteCategory } from '../enums/patrol-route-category';

export const DEFAULT_PATROL_POINT_DWELL_SECONDS = 90;
export const MAX_PATROL_POINT_DWELL_SECONDS = 120;
export const MIN_PATROL_POINT_DWELL_SECONDS = 0;

export class PatrolRoutePointSettingDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patrolPointId: string = '';

  @ApiProperty({ default: DEFAULT_PATROL_POINT_DWELL_SECONDS, maximum: 120, minimum: 0 })
  @IsInt()
  @Min(MIN_PATROL_POINT_DWELL_SECONDS)
  @Max(MAX_PATROL_POINT_DWELL_SECONDS)
  dwellSeconds: number = DEFAULT_PATROL_POINT_DWELL_SECONDS;
}

export class CreatePatrolRouteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  shopId: string = '';

  @ApiProperty({ example: 'Morning internal route' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string = '';

  @ApiProperty({ enum: PATROL_ROUTE_CATEGORIES })
  @IsIn(PATROL_ROUTE_CATEGORIES)
  category: PatrolRouteCategory = 'internal';

  @ApiProperty({ description: 'Ordered patrol point IDs included into route.', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  patrolPointIds: string[] = [];

  @ApiPropertyOptional({
    description: 'Per-route dwell overrides. Omitted points use 90 seconds.',
    type: [PatrolRoutePointSettingDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique((setting: PatrolRoutePointSettingDto) => setting.patrolPointId)
  @ValidateNested({ each: true })
  @Type(() => PatrolRoutePointSettingDto)
  pointSettings?: PatrolRoutePointSettingDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePatrolRouteDto {
  @ApiPropertyOptional({ example: 'Morning internal route' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ enum: PATROL_ROUTE_CATEGORIES })
  @IsOptional()
  @IsIn(PATROL_ROUTE_CATEGORIES)
  category?: PatrolRouteCategory;

  @ApiPropertyOptional({
    description: 'Full ordered replacement list of route points.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  patrolPointIds?: string[];

  @ApiPropertyOptional({
    description: 'Per-route dwell overrides. Omitted points use 90 seconds.',
    type: [PatrolRoutePointSettingDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique((setting: PatrolRoutePointSettingDto) => setting.patrolPointId)
  @ValidateNested({ each: true })
  @Type(() => PatrolRoutePointSettingDto)
  pointSettings?: PatrolRoutePointSettingDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
