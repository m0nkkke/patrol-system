import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class StartRouteSetupDto {
  @ApiProperty({ example: 31, maximum: 32767, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(32767)
  expectedPoints: number = 1;

  @ApiPropertyOptional({ default: 'Контрольная точка' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  pointNamePrefix?: string;
}
