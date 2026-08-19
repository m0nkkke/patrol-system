import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

import { PaginationDto } from './pagination.dto';

export const ARCHIVE_RESOURCE_TYPES = [
  'shops',
  'users',
  'patrol-points',
  'nfc-tags',
  'patrol-routes',
  'file-assets',
] as const;

export type ArchiveResourceType = (typeof ARCHIVE_RESOURCE_TYPES)[number];

export class ListArchiveQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Text search by resource display fields' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: ['createdAt:desc', 'createdAt:asc', 'updatedAt:desc', 'updatedAt:asc'] })
  @IsOptional()
  @IsIn(['createdAt:desc', 'createdAt:asc', 'updatedAt:desc', 'updatedAt:asc'])
  sort?: 'createdAt:desc' | 'createdAt:asc' | 'updatedAt:desc' | 'updatedAt:asc';
}
