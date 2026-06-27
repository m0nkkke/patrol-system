import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import { RouteStatus } from '../enums/route-status';
import { PaginationDto } from './pagination.dto';

const SHOP_SORT_FIELDS = ['createdAt:desc', 'createdAt:asc', 'name:asc', 'name:desc', 'routeStatus:asc', 'routeStatus:desc'] as const;
const ROUTE_STATUSES = Object.values(RouteStatus);

export class CreateShopDto {
  @ApiProperty({ example: 'Shop 042' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string = '';

  @ApiPropertyOptional({ example: '00234343' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  externalId?: string;

  @ApiPropertyOptional({ example: 'Красноярск, ул. Мира, 1' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Asia/Krasnoyarsk' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateShopDto {
  @ApiPropertyOptional({ example: 'Shop 042' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: '00234343' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  externalId?: string;

  @ApiPropertyOptional({ example: 'Красноярск, ул. Мира, 1' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Asia/Krasnoyarsk' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;
}

export class ListShopsQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search by name, address or external ID' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: ROUTE_STATUSES })
  @IsOptional()
  @IsIn(ROUTE_STATUSES)
  routeStatus?: RouteStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ enum: SHOP_SORT_FIELDS })
  @IsOptional()
  @IsIn(SHOP_SORT_FIELDS)
  sort?: (typeof SHOP_SORT_FIELDS)[number];
}
