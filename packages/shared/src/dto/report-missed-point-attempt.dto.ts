import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ReportMissedPointAttemptDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  expectedPatrolPointId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  attemptedPatrolPointId!: string;

  @ApiProperty({ example: '04a1b2c3d4e5f6' })
  @IsString()
  @MinLength(4)
  @MaxLength(32)
  nfcUid!: string;

  @ApiProperty({ example: '2026-06-19T10:00:00.000Z' })
  @IsISO8601()
  scannedAt!: string;

  @ApiProperty({ example: 'android-device-01' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  deviceId!: string;
}
