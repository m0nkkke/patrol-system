import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ManagementMetricsQueryDto, PlanFactResponse } from '@patrol/shared';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PlanFactService } from './plan-fact.service';

@ApiTags('management-plan-fact')
@ApiBearerAuth()
@Controller('management/plan-fact')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PlanFactController {
  constructor(private readonly service: PlanFactService) {}

  @Get()
  @Roles('admin')
  getReport(@Query() query: ManagementMetricsQueryDto, @CurrentUser() actor: AuthenticatedUser): Promise<PlanFactResponse> {
    return this.service.getReport(query, actor);
  }
}
