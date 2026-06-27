import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

const MOBILE_PLATFORMS = ['android', 'ios'] as const;

export type MobilePlatform = (typeof MOBILE_PLATFORMS)[number];

export class RegisterDevicePushTokenDto {
  @ApiProperty({ example: 'android-device-01' })
  @IsString()
  @MinLength(4)
  @MaxLength(200)
  deviceId: string = '';

  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  pushToken: string = '';

  @ApiPropertyOptional({ enum: MOBILE_PLATFORMS, example: 'android' })
  @IsOptional()
  @IsIn(MOBILE_PLATFORMS)
  platform?: MobilePlatform;

  @ApiPropertyOptional({ example: '1.0.0' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  appVersion?: string;
}

export class DevicePushTokenResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string = '';

  @ApiProperty({ example: 'android-device-01' })
  deviceId: string = '';

  @ApiProperty({ example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]' })
  pushToken: string = '';

  @ApiProperty({ default: true })
  isActive: boolean = true;
}
