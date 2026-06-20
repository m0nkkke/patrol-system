import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class BindRoutePointNfcDto {
  @ApiProperty({ example: '04a1b2c3d4e5f6' })
  @IsString()
  @Length(4, 32)
  uid: string = '';

  @ApiPropertyOptional({ example: 'Электрощитовая' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
