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
import {
  CreatePatrolScheduleDto,
  PatrolScheduleDto,
  UpdatePatrolScheduleDto,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PatrolScheduleEntity } from './entities/patrol-schedule.entity';
import { PatrolSchedulesService } from './patrol-schedules.service';

@ApiBearerAuth()
@ApiTags('patrol-schedules')
@Controller('patrol-schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatrolSchedulesController {
  constructor(private readonly schedulesService: PatrolSchedulesService) {}

  @Post()
  @Roles('admin', 'manager')
  @ApiCreatedResponse({ description: 'Patrol schedule created', type: PatrolScheduleDto })
  create(
    @Body() dto: CreatePatrolScheduleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolScheduleEntity> {
    return this.schedulesService.create(dto, actor);
  }

  @Get('shop/:shopId')
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'Patrol schedules by shop', type: [PatrolScheduleDto] })
  findByShop(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolScheduleEntity[]> {
    return this.schedulesService.findByShop(shopId, actor);
  }

  @Get(':id')
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'Patrol schedule details', type: PatrolScheduleDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolScheduleEntity> {
    return this.schedulesService.findOneForActor(id, actor);
  }

  @Patch(':id')
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'Patrol schedule updated', type: PatrolScheduleDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatrolScheduleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolScheduleEntity> {
    return this.schedulesService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('admin', 'manager')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Patrol schedule deactivated', type: PatrolScheduleDto })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolScheduleEntity> {
    return this.schedulesService.deactivate(id, actor);
  }
}
