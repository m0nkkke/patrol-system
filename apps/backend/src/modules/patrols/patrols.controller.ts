import { Body, Controller, Get, HttpCode, Ip, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CreatePatrolEventDto,
  FindPatrolIncidentsDto,
  PaginationDto,
  StartPatrolDto,
} from '@patrol/shared';

import { PatrolEventEntity } from './entities/patrol-event.entity';
import { PatrolEntity } from './entities/patrol.entity';
import { PatrolsService } from './patrols.service';

@ApiTags('patrols')
@Controller('patrols')
export class PatrolsController {
  constructor(private readonly patrolsService: PatrolsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Patrol started' })
  start(@Body() dto: StartPatrolDto): Promise<PatrolEntity> {
    return this.patrolsService.start(dto);
  }

  @Get('shop/:shopId')
  @ApiOkResponse({ description: 'Patrols by shop' })
  findByShop(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @Query() pagination: PaginationDto,
  ): ReturnType<PatrolsService['findByShop']> {
    return this.patrolsService.findByShop(shopId, pagination);
  }

  @Get('incidents')
  @ApiOkResponse({ description: 'Patrol incidents list' })
  findIncidents(
    @Query() query: FindPatrolIncidentsDto,
  ): ReturnType<PatrolsService['findIncidents']> {
    return this.patrolsService.findIncidents(query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Patrol details' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PatrolEntity> {
    return this.patrolsService.findOne(id);
  }

  @Post(':id/events')
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
  @ApiOkResponse({ description: 'Patrol completed' })
  complete(@Param('id', ParseUUIDPipe) id: string): Promise<PatrolEntity> {
    return this.patrolsService.complete(id);
  }
}
