import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { FindControlPatrolsDto } from '@patrol/shared';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ControlPatrolsService } from './control-patrols.service';

@ApiTags('control-patrols')
@ApiBearerAuth()
@Controller('control/patrols')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ControlPatrolsController {
  constructor(private readonly service: ControlPatrolsService) {}

  @Get()
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Control patrol history' })
  findMany(
    @Query() query: FindControlPatrolsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<ControlPatrolsService['findMany']> {
    return this.service.findMany(query, actor);
  }

  @Get(':id')
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Control patrol investigation details' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<ControlPatrolsService['findOne']> {
    return this.service.findOne(id, actor);
  }
}
