import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreatePatrolRouteDto, UpdatePatrolRouteDto } from '@patrol/shared';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PatrolRouteEntity } from '../entities/patrol-route.entity';
import { PatrolRoutesService } from './patrol-routes.service';

@ApiTags('patrol-routes')
@ApiBearerAuth()
@Controller('patrol-routes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatrolRoutesController {
  constructor(private readonly patrolRoutesService: PatrolRoutesService) {}

  @Post()
  @Roles('admin', 'route_setter', 'local_route_setter')
  @ApiCreatedResponse({ description: 'Patrol route created' })
  create(
    @Body() dto: CreatePatrolRouteDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolRouteEntity> {
    return this.patrolRoutesService.create(dto, actor);
  }

  @Get('shop/:shopId')
  @Roles('admin', 'route_setter', 'local_route_setter', 'inspector')
  @ApiOkResponse({ description: 'Patrol routes by shop' })
  findByShop(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolRouteEntity[]> {
    return this.patrolRoutesService.findByShopForActor(shopId, actor);
  }

  @Get(':id')
  @Roles('admin', 'route_setter', 'local_route_setter', 'inspector')
  @ApiOkResponse({ description: 'Patrol route details' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolRouteEntity> {
    return this.patrolRoutesService.findOneForActor(id, actor);
  }

  @Get(':id/versions')
  @Roles('admin', 'route_setter', 'local_route_setter', 'inspector')
  @ApiOkResponse({ description: 'Immutable route versions, newest first' })
  findVersions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<PatrolRoutesService['findVersions']> {
    return this.patrolRoutesService.findVersions(id, actor);
  }

  @Patch(':id')
  @Roles('admin', 'route_setter', 'local_route_setter')
  @ApiOkResponse({ description: 'Patrol route updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatrolRouteDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolRouteEntity> {
    return this.patrolRoutesService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('admin', 'route_setter', 'local_route_setter')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Patrol route archived' })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolRouteEntity> {
    return this.patrolRoutesService.archive(id, actor);
  }
}
