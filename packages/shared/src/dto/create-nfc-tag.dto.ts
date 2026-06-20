import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class CreateNfcTagDto {
  @ApiProperty({ example: '04a1b2c3d4e5f6' })
  @IsString()
  @Length(4, 32)
  uid: string = '';

  @ApiPropertyOptional({ example: 'point:uuid:token' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  payload?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  registeredBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
