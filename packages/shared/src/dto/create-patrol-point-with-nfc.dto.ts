import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

import { CreatePatrolPointDto } from './create-patrol-point.dto';

export class CreatePatrolPointWithNfcDto extends OmitType(CreatePatrolPointDto, [
  'nfcTagId',
] as const) {
  @ApiProperty({ example: '04a1b2c3d4e5f6' })
  @IsString()
  @Length(4, 32)
  uid: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  payload?: string;
}
