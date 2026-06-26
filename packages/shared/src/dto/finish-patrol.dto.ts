import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompletePatrolDto {
  @ApiPropertyOptional({
    description: 'Отчет сотрудника по итогам обхода и объяснение больших таймингов',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  completionReport?: string;
}

export class CancelPatrolDto {
  @ApiPropertyOptional({
    description: 'Причина отмены обхода',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  cancellationReason?: string;
}
