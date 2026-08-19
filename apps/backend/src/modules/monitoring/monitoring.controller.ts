import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { MonitoringService } from './monitoring.service';

@ApiTags('monitoring')
@ApiBearerAuth()
@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('status')
  @ApiOkResponse({ description: 'Production monitoring status without secrets' })
  getStatus(
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<MonitoringService['getStatus']> {
    return this.monitoringService.getStatus(actor);
  }
}
