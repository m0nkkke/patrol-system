import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ReportOutboxMonitoringService } from './report-outbox-monitoring.service';

@ApiTags('report-outbox-monitoring')
@ApiBearerAuth()
@Controller('reports/outbox')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportOutboxMonitoringController {
  constructor(private readonly monitoringService: ReportOutboxMonitoringService) {}

  @Get('status')
  @Roles('admin')
  @ApiOkResponse({ description: 'Report outbox publisher status and lag' })
  getStatus(
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<ReportOutboxMonitoringService['getStatus']> {
    return this.monitoringService.getStatus(actor);
  }
}
