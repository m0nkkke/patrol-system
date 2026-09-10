import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class StartPatrolDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  shopId: string = '';

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  employeeId: string = '';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  routeId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  dueAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Required when a scheduled patrol starts after its configured start time',
    maxLength: 1000,
    minLength: 5,
  })
  @IsOptional()
  @IsString()
  @Length(5, 1000)
  lateStartReason?: string;
}
