import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ description: 'Permanent user access key', example: 'MEMP-TEST-0001' })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9 -]+$/)
  accessKey: string = '';

  @ApiProperty({ example: 'android-device-fingerprint' })
  @IsString()
  @MinLength(4)
  @MaxLength(200)
  deviceId: string = '';
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string = '';

  @ApiProperty({ example: 'android-device-fingerprint' })
  @IsString()
  @MinLength(4)
  @MaxLength(200)
  deviceId: string = '';
}
