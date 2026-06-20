import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class ReplaceNfcTagDto {
  @ApiProperty({ example: '04a1b2c3d4e5f7' })
  @IsString()
  @Length(4, 32)
  uid: string = '';

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  replacedBy?: string;

  @ApiPropertyOptional({ example: 'Повреждён корпус метки' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
