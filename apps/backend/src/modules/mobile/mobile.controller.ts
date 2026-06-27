import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  BindRoutePointNfcDto,
  AvailablePatrolScheduleDto,
  CancelPatrolDto,
  CompletePatrolDto,
  CreatePatrolEventDto,
  DevicePushTokenResponseDto,
  RegisterDevicePushTokenDto,
  StartRouteSetupDto,
  StartMobilePatrolDto,
  SyncPatrolEventsDto,
  SyncPatrolEventsResultDto,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MobileService } from './mobile.service';

@ApiBearerAuth()
@ApiTags('mobile')
@Controller('mobile')
@UseGuards(JwtAuthGuard)
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('me')
  @ApiOkResponse({ description: 'Current mobile user profile' })
  me(@CurrentUser() user: AuthenticatedUser): ReturnType<MobileService['getProfile']> {
    return this.mobileService.getProfile(user);
  }

  @Post('devices/push-token')
  @HttpCode(200)
  @ApiOkResponse({
    description: 'Current device push token registered',
    type: DevicePushTokenResponseDto,
  })
  registerDevicePushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RegisterDevicePushTokenDto,
  ): ReturnType<MobileService['registerDevicePushToken']> {
    return this.mobileService.registerDevicePushToken(user, dto);
  }

  @Post('shops/:shopId/route-setup/start')
  @HttpCode(200)
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard)
  @ApiOkResponse({ description: 'Mobile route setup started' })
  startRouteSetup(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: StartRouteSetupDto,
  ): ReturnType<MobileService['startRouteSetup']> {
    return this.mobileService.startRouteSetup(shopId, dto);
  }

  @Get('shops/:shopId/route-setup')
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard)
  @ApiOkResponse({ description: 'Mobile route setup state' })
  getRouteSetup(
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ): ReturnType<MobileService['getRouteSetup']> {
    return this.mobileService.getRouteSetup(shopId);
  }

  @Post('shops/:shopId/route-setup/scan')
  @HttpCode(200)
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard)
  @ApiOkResponse({ description: 'NFC UID bound to next route point' })
  scanNextRoutePoint(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Body() dto: BindRoutePointNfcDto,
  ): ReturnType<MobileService['scanNextRoutePoint']> {
    return this.mobileService.scanNextRoutePoint(shopId, dto);
  }

  @Post('shops/:shopId/route-setup/reset')
  @HttpCode(200)
  @Roles('admin', 'manager')
  @UseGuards(RolesGuard)
  @ApiOkResponse({ description: 'Mobile route setup cancelled and reset' })
  resetRouteSetup(
    @Param('shopId', ParseUUIDPipe) shopId: string,
  ): ReturnType<MobileService['resetRouteSetup']> {
    return this.mobileService.resetRouteSetup(shopId);
  }

  @Get('route')
  @Roles('employee')
  @UseGuards(RolesGuard)
  @ApiOkResponse({ description: 'Current employee shop route' })
  getRoute(@CurrentUser() user: AuthenticatedUser): ReturnType<MobileService['getRoute']> {
    return this.mobileService.getRoute(user);
  }

  @Get('patrols/active')
  @Roles('employee')
  @UseGuards(RolesGuard)
  @ApiOkResponse({ description: 'Current employee active patrol' })
  getActivePatrol(
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<MobileService['getActivePatrol']> {
    return this.mobileService.getActivePatrol(user);
  }

  @Get('patrol-schedules/available')
  @Roles('employee')
  @UseGuards(RolesGuard)
  @ApiOkResponse({
    description: 'Patrol schedules available at current shop time',
    type: [AvailablePatrolScheduleDto],
  })
  getAvailablePatrolSchedules(
    @CurrentUser() user: AuthenticatedUser,
  ): ReturnType<MobileService['getAvailablePatrolSchedules']> {
    return this.mobileService.getAvailablePatrolSchedules(user);
  }

  @Post('patrols/start')
  @Roles('employee')
  @UseGuards(RolesGuard)
  @ApiCreatedResponse({ description: 'Mobile patrol started' })
  startPatrol(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartMobilePatrolDto,
  ): ReturnType<MobileService['startPatrol']> {
    return this.mobileService.startPatrol(user, dto);
  }

  @Post('patrols/:id/events')
  @Roles('employee')
  @UseGuards(RolesGuard)
  @ApiCreatedResponse({ description: 'Mobile patrol NFC event recorded' })
  recordPatrolEvent(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePatrolEventDto,
    @Ip() ipAddress: string,
  ): ReturnType<MobileService['recordPatrolEvent']> {
    return this.mobileService.recordPatrolEvent(user, id, dto, ipAddress);
  }

  @Post('patrols/:id/complete')
  @HttpCode(200)
  @Roles('employee')
  @UseGuards(RolesGuard)
  @ApiOkResponse({ description: 'Mobile patrol completed with employee report' })
  completePatrol(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompletePatrolDto,
  ): ReturnType<MobileService['completePatrol']> {
    return this.mobileService.completePatrol(user, id, dto);
  }

  @Post('patrols/:id/cancel')
  @HttpCode(200)
  @Roles('employee')
  @UseGuards(RolesGuard)
  @ApiOkResponse({ description: 'Mobile patrol cancelled' })
  cancelPatrol(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPatrolDto,
  ): ReturnType<MobileService['cancelPatrol']> {
    return this.mobileService.cancelPatrol(user, id, dto);
  }

  @Post('patrols/:id/events/sync')
  @HttpCode(200)
  @Roles('employee')
  @UseGuards(RolesGuard)
  @ApiOkResponse({
    description: 'Offline patrol NFC events synchronized',
    type: SyncPatrolEventsResultDto,
  })
  syncPatrolEvents(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SyncPatrolEventsDto,
    @Ip() ipAddress: string,
  ): ReturnType<MobileService['syncPatrolEvents']> {
    return this.mobileService.syncPatrolEvents(user, id, dto, ipAddress);
  }
}
