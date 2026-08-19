import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateAnonymousAppealDto,
  FindAnonymousAppealsDto,
  UpdateAnonymousAppealDto,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AnonymousAppealsService } from './anonymous-appeals.service';
import { AnonymousAppealEntity } from './entities/anonymous-appeal.entity';

@ApiBearerAuth()
@ApiTags('anonymous')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class AnonymousAppealsController {
  constructor(private readonly anonymousAppealsService: AnonymousAppealsService) {}

  @Post('mobile/anonymous')
  @HttpCode(201)
  @Roles('security_guard')
  @ApiCreatedResponse({ description: 'Anonymous appeal submitted' })
  createMobileAnonymousAppeal(
    @Body() dto: CreateAnonymousAppealDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Headers('x-device-id') deviceId: string | undefined,
    @Ip() ipAddress: string,
  ): Promise<AnonymousAppealEntity> {
    return this.anonymousAppealsService.create(dto, actor, {
      deviceId,
      ipAddress,
    });
  }

  @Get('anonymous')
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Anonymous appeals list' })
  findMany(
    @Query() query: FindAnonymousAppealsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): ReturnType<AnonymousAppealsService['findMany']> {
    return this.anonymousAppealsService.findMany(query, actor);
  }

  @Get('anonymous/:id')
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Anonymous appeal details' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AnonymousAppealEntity> {
    return this.anonymousAppealsService.findOne(id, actor);
  }

  @Patch('anonymous/:id')
  @Roles('admin', 'inspector')
  @ApiOkResponse({ description: 'Anonymous appeal status updated' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAnonymousAppealDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<AnonymousAppealEntity> {
    return this.anonymousAppealsService.updateStatus(id, dto, actor);
  }
}
