import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateShopDto {
  @ApiProperty({ example: 'Shop 042' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string = '';

  @ApiPropertyOptional({ example: '00234343' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  externalId?: string;

  @ApiPropertyOptional({ example: 'Красноярск, ул. Мира, 1' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Asia/Krasnoyarsk' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  timezone?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  regionId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
