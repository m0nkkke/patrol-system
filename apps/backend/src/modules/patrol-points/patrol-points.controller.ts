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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  CreateNfcTagDto,
  CreatePatrolPointDto,
  CreatePatrolPointWithNfcDto,
  ReplaceNfcTagDto,
  UpdatePatrolPointDto,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UploadedImageFile } from '../files/files.service';
import { NfcTagReplacementEntity } from './entities/nfc-tag-replacement.entity';
import { NfcTagEntity } from './entities/nfc-tag.entity';
import { PatrolPointEntity } from './entities/patrol-point.entity';
import { PatrolPointsService } from './patrol-points.service';

@ApiTags('patrol-points')
@ApiBearerAuth()
@Controller('patrol-points')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PatrolPointsController {
  constructor(private readonly patrolPointsService: PatrolPointsService) {}

  @Post('nfc-tags')
  @Roles('admin', 'route_setter', 'local_route_setter')
  @ApiCreatedResponse({ description: 'NFC tag registered' })
  createNfcTag(@Body() dto: CreateNfcTagDto): Promise<NfcTagEntity> {
    return this.patrolPointsService.createNfcTag(dto);
  }

  @Post()
  @Roles('admin', 'route_setter', 'local_route_setter')
  @ApiCreatedResponse({ description: 'Patrol point created' })
  createPatrolPoint(
    @Body() dto: CreatePatrolPointDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity> {
    return this.patrolPointsService.createPatrolPoint(dto, actor);
  }

  @Post('with-nfc')
  @Roles('admin', 'route_setter', 'local_route_setter')
  @ApiCreatedResponse({ description: 'Patrol point and NFC tag created atomically' })
  createWithNfc(
    @Body() dto: CreatePatrolPointWithNfcDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity> {
    return this.patrolPointsService.createPatrolPointWithNfc(dto, actor);
  }

  @Get('shop/:shopId/archived')
  @Roles('admin', 'route_setter', 'local_route_setter')
  @ApiOkResponse({ description: 'Archived patrol points by shop' })
  findArchivedByShop(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity[]> {
    return this.patrolPointsService.findArchivedByShop(shopId, actor);
  }

  @Get('shop/:shopId')
  @Roles('admin', 'route_setter', 'local_route_setter', 'inspector')
  @ApiOkResponse({ description: 'Active patrol points by shop' })
  findByShop(
    @Param('shopId', ParseUUIDPipe) shopId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity[]> {
    return this.patrolPointsService.findByShopForActor(shopId, actor);
  }

  @Get(':id')
  @Roles('admin', 'route_setter', 'local_route_setter', 'inspector')
  @ApiOkResponse({ description: 'Patrol point details' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity> {
    return this.patrolPointsService.findOneForActor(id, actor);
  }

  @Patch(':id')
  @Roles('admin', 'route_setter', 'local_route_setter')
  @ApiOkResponse({ description: 'Patrol point updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatrolPointDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity> {
    return this.patrolPointsService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('admin', 'route_setter', 'local_route_setter')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Patrol point archived' })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity> {
    return this.patrolPointsService.archive(id, actor);
  }

  @Post(':id/restore')
  @Roles('admin', 'route_setter', 'local_route_setter')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Patrol point restored' })
  restore(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity> {
    return this.patrolPointsService.restore(id, actor);
  }

  @Post(':id/photo')
  @Roles('admin', 'route_setter', 'local_route_setter')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      properties: {
        file: {
          format: 'binary',
          type: 'string',
        },
      },
      required: ['file'],
      type: 'object',
    },
  })
  @ApiCreatedResponse({ description: 'Patrol point photo uploaded' })
  uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedImageFile,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity> {
    return this.patrolPointsService.uploadPhoto(id, file, actor);
  }

  @Post(':id/replace-nfc')
  @Roles('admin', 'route_setter', 'local_route_setter')
  @ApiCreatedResponse({ description: 'NFC tag replaced for patrol point' })
  replaceNfcTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceNfcTagDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<NfcTagReplacementEntity> {
    return this.patrolPointsService.replaceNfcTag(id, dto, actor);
  }
}
