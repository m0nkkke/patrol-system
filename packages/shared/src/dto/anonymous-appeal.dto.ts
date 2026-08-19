import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

import { PaginationDto } from './pagination.dto';

export const ANONYMOUS_APPEAL_CATEGORIES = ['message', 'complaint', 'safety', 'other'] as const;
export type AnonymousAppealCategory = (typeof ANONYMOUS_APPEAL_CATEGORIES)[number];

export const ANONYMOUS_APPEAL_STATUSES = ['new', 'in_review', 'resolved', 'archived'] as const;
export type AnonymousAppealStatus = (typeof ANONYMOUS_APPEAL_STATUSES)[number];

const ANONYMOUS_APPEAL_SORT_FIELDS = ['createdAt:desc', 'createdAt:asc'] as const;

export class CreateAnonymousAppealDto {
  @ApiPropertyOptional({ enum: ANONYMOUS_APPEAL_CATEGORIES, default: 'message' })
  @IsOptional()
  @IsIn(ANONYMOUS_APPEAL_CATEGORIES)
  category?: AnonymousAppealCategory;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  shopId: string = '';

  @ApiProperty({ example: 'Сообщение для службы контроля' })
  @IsString()
  @MinLength(5)
  @MaxLength(4000)
  message: string = '';
}

export class UpdateAnonymousAppealDto {
  @ApiPropertyOptional({ enum: ANONYMOUS_APPEAL_STATUSES })
  @IsOptional()
  @IsIn(ANONYMOUS_APPEAL_STATUSES)
  status?: AnonymousAppealStatus;
}

export class FindAnonymousAppealsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ANONYMOUS_APPEAL_CATEGORIES })
  @IsOptional()
  @IsIn(ANONYMOUS_APPEAL_CATEGORIES)
  category?: AnonymousAppealCategory;

  @ApiPropertyOptional({ enum: ANONYMOUS_APPEAL_STATUSES })
  @IsOptional()
  @IsIn(ANONYMOUS_APPEAL_STATUSES)
  status?: AnonymousAppealStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  shopId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === undefined ? undefined : new Date(value).toISOString())
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === undefined ? undefined : new Date(value).toISOString())
  to?: string;

  @ApiPropertyOptional({ enum: ANONYMOUS_APPEAL_SORT_FIELDS })
  @IsOptional()
  @IsIn(ANONYMOUS_APPEAL_SORT_FIELDS)
  sort?: (typeof ANONYMOUS_APPEAL_SORT_FIELDS)[number];
}
