import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePatrolEventDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  patrolPointId: string = '';

  @ApiProperty({ example: '04a1b2c3d4e5f6' })
  @IsString()
  @Length(4, 32)
  nfcUid: string = '';

  @ApiProperty({ format: 'date-time' })
  @IsISO8601()
  scannedAt: string = '';

  @ApiProperty({ example: 'android-device-fingerprint' })
  @IsString()
  @Length(4, 200)
  deviceId: string = '';

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gpsAccuracy?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  suspicionReason?: string;
}
