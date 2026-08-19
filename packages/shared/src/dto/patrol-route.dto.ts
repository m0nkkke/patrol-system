import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

import {
  PATROL_ROUTE_CATEGORIES,
  PatrolRouteCategory,
} from '../enums/patrol-route-category';

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

  @ApiPropertyOptional({ description: 'Full ordered replacement list of route points.', type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  patrolPointIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
