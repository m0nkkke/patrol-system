import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreatePatrolRouteDto, UpdatePatrolRouteDto } from '@patrol/shared';

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
  create(@Body() dto: CreatePatrolRouteDto): Promise<PatrolRouteEntity> {
    return this.patrolRoutesService.create(dto);
  }

  @Get('shop/:shopId')
  @Roles('admin', 'route_setter', 'local_route_setter', 'inspector')
  @ApiOkResponse({ description: 'Patrol routes by shop' })
  findByShop(@Param('shopId', ParseUUIDPipe) shopId: string): Promise<PatrolRouteEntity[]> {
    return this.patrolRoutesService.findByShop(shopId);
  }

  @Get(':id')
  @Roles('admin', 'route_setter', 'local_route_setter', 'inspector')
  @ApiOkResponse({ description: 'Patrol route details' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PatrolRouteEntity> {
    return this.patrolRoutesService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'route_setter', 'local_route_setter')
  @ApiOkResponse({ description: 'Patrol route updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatrolRouteDto,
  ): Promise<PatrolRouteEntity> {
    return this.patrolRoutesService.update(id, dto);
  }

  @Post(':id/archive')
  @Roles('admin', 'route_setter', 'local_route_setter')
  @ApiOkResponse({ description: 'Patrol route archived' })
  archive(@Param('id', ParseUUIDPipe) id: string): Promise<PatrolRouteEntity> {
    return this.patrolRoutesService.deactivate(id);
  }
}
