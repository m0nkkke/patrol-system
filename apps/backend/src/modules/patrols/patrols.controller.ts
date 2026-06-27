import {
  Body,
  Controller,
  Get,
  HttpCode,
  Ip,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CancelPatrolDto,
  CompletePatrolDto,
  CreatePatrolEventDto,
  FindPatrolIncidentsDto,
  FindPatrolsDto,
  StartPatrolDto,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PatrolEventEntity } from './entities/patrol-event.entity';
import { PatrolEntity } from './entities/patrol.entity';
import { PatrolsService } from './patrols.service';

@ApiTags('patrols')
@ApiBearerAuth()
@Controller('patrols')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatrolsController {
  constructor(private readonly patrolsService: PatrolsService) {}

  @Post()
  @Roles('admin')
  @ApiCreatedResponse({ description: 'Patrol started' })
  start(@Body() dto: StartPatrolDto): Promise<PatrolEntity> {
    return this.patrolsService.start(dto);
  }

  @Get('shop/:shopId')
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'Patrols by shop' })
  findByShop(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query() query: FindPatrolsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<PatrolsService['findByShop']> {
    return this.patrolsService.findByShop(shopId, query, actor);
  }

  @Get('incidents')
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'Patrol incidents list' })
  findIncidents(
    @Query() query: FindPatrolIncidentsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<PatrolsService['findIncidents']> {
    return this.patrolsService.findIncidents(query, actor);
  }

  @Get('employee/:employeeId')
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'Patrol history by employee' })
  findByEmployee(
    @Param('employeeId', ParseUUIDPipe) employeeId: string,
    @Query() query: FindPatrolsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<PatrolsService['findByEmployee']> {
    return this.patrolsService.findByEmployee(employeeId, query, actor);
  }

  @Get(':id')
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'Patrol details' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolEntity> {
    return this.patrolsService.findOneForActor(id, actor);
  }

  @Post(':id/events')
  @Roles('admin')
  @ApiCreatedResponse({ description: 'Patrol NFC event recorded' })
  recordEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePatrolEventDto,
    @Ip() ipAddress: string,
  ): Promise<PatrolEventEntity> {
    return this.patrolsService.recordEvent(id, dto, ipAddress);
  }

  @Post(':id/complete')
  @HttpCode(200)
  @Roles('admin')
  @ApiOkResponse({ description: 'Patrol completed' })
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompletePatrolDto,
  ): Promise<PatrolEntity> {
    return this.patrolsService.complete(id, dto);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @Roles('admin')
  @ApiOkResponse({ description: 'Patrol cancelled' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelPatrolDto,
  ): Promise<PatrolEntity> {
    return this.patrolsService.cancel(id, dto);
  }
}
