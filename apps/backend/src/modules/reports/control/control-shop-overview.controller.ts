import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ControlShopOverviewService } from './control-shop-overview.service';

@ApiTags('control-shops')
@ApiBearerAuth()
@Controller('control/shops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ControlShopOverviewController {
  constructor(private readonly service: ControlShopOverviewService) {}

  @Get(':shopId/overview')
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Control shop overview for inspector workspace' })
  getOverview(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<ControlShopOverviewService['getOverview']> {
    return this.service.getOverview(shopId, actor);
  }
}
