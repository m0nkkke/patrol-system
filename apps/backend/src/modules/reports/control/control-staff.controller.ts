import { Body, Controller, Get, Post, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  ControlStaffResponseDto,
  CreateControlGuardDto,
  FindControlStaffDto,
  PaginatedControlStaffResponseDto,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ControlStaffService } from './control-staff.service';

@ApiTags('control-staff')
@ApiBearerAuth()
@Controller('control/staff')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ControlStaffController {
  constructor(private readonly service: ControlStaffService) {}

  @Post()
  @Roles('admin', 'inspector')
  @ApiCreatedResponse({ description: 'Security guard created in assigned shops; response contains the initial access key' })
  createGuard(@Body() dto: CreateControlGuardDto, @CurrentUser() actor: AuthenticatedUser): ReturnType<ControlStaffService['createGuard']> {
    return this.service.createGuard(dto, actor);
  }

  @Get()
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Control staff list', type: PaginatedControlStaffResponseDto })
  findMany(
    @Query() query: FindControlStaffDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PaginatedControlStaffResponseDto> {
    return this.service.findMany(query, actor);
  }

  @Get(':id')
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Control staff details', type: ControlStaffResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ControlStaffResponseDto> {
    return this.service.findOne(id, actor);
  }
}
