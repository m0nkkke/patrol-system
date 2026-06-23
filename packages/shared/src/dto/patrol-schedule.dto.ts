import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CreatePatrolScheduleDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  shopId: string = '';

  @ApiProperty({ example: 'Вечерний обход' })
  @IsString()
  @Length(1, 200)
  name: string = '';

  @ApiProperty({ example: [1, 2, 3, 4, 5], type: [Number] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays: number[] = [];

  @ApiProperty({ example: '20:00', pattern: TIME_PATTERN.source })
  @Matches(TIME_PATTERN)
  startTime: string = '';

  @ApiProperty({ example: '21:00', pattern: TIME_PATTERN.source })
  @Matches(TIME_PATTERN)
  endTime: string = '';

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdatePatrolScheduleDto {
  @ApiPropertyOptional({ example: 'Вечерний обход' })
  @IsOptional()
  @IsString()
  @Length(1, 200)
  name?: string;

  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5], type: [Number] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekdays?: number[];

  @ApiPropertyOptional({ example: '20:00', pattern: TIME_PATTERN.source })
  @IsOptional()
  @Matches(TIME_PATTERN)
  startTime?: string;

  @ApiPropertyOptional({ example: '21:00', pattern: TIME_PATTERN.source })
  @IsOptional()
  @Matches(TIME_PATTERN)
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class StartMobilePatrolDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  scheduleId?: string;
}

export class PatrolScheduleDto {
  @ApiProperty({ format: 'uuid' })
  id: string = '';

  @ApiProperty({ format: 'uuid' })
  shopId: string = '';

  @ApiProperty()
  name: string = '';

  @ApiProperty({ type: [Number] })
  weekdays: number[] = [];

  @ApiProperty({ example: '20:00:00' })
  startTime: string = '';

  @ApiProperty({ example: '21:00:00' })
  endTime: string = '';

  @ApiProperty()
  isActive: boolean = true;

  @ApiProperty({ format: 'date-time' })
  createdAt: Date = new Date();

  @ApiProperty({ format: 'date-time' })
  updatedAt: Date = new Date();
}

export class AvailablePatrolScheduleDto extends PatrolScheduleDto {
  @ApiProperty({ format: 'date-time' })
  dueAt: Date = new Date();
}
