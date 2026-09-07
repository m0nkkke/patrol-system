import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMinSize, ArrayUnique, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import { USER_ROLES, UserRole } from '../enums/user-role';
import { PaginationDto } from './pagination.dto';

export class CreateControlGuardDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  fullName: string = '';

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  shopIds: string[] = [];
}

const CONTROL_STAFF_SORTS = [
  'fullName:asc',
  'fullName:desc',
  'role:asc',
  'role:desc',
  'isActive:asc',
  'isActive:desc',
] as const;

export class FindControlStaffDto extends PaginationDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional({ enum: USER_ROLES })
  @IsOptional()
  @IsIn(USER_ROLES)
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Search by employee full name' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional({ enum: CONTROL_STAFF_SORTS })
  @IsOptional()
  @IsIn(CONTROL_STAFF_SORTS)
  sort?: (typeof CONTROL_STAFF_SORTS)[number];
}

export class ControlStaffShopDto {
  @ApiProperty({ format: 'uuid' })
  id: string = '';

  @ApiProperty()
  name: string = '';

  @ApiPropertyOptional({ nullable: true })
  address: string | null = null;
}

export class ControlStaffResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string = '';

  @ApiProperty()
  fullName: string = '';

  @ApiProperty({ enum: USER_ROLES })
  role: UserRole = 'security_guard';

  @ApiProperty()
  isActive: boolean = true;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  primaryShopId: string | null = null;

  @ApiProperty({ type: [ControlStaffShopDto] })
  shops: ControlStaffShopDto[] = [];
}

export class PaginatedControlStaffResponseDto {
  @ApiProperty({ type: [ControlStaffResponseDto] })
  items: ControlStaffResponseDto[] = [];

  @ApiProperty()
  limit: number = 0;

  @ApiProperty()
  page: number = 0;

  @ApiProperty()
  total: number = 0;
}
