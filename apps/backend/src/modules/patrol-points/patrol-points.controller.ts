import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { CreateNfcTagDto, CreatePatrolPointDto, ReplaceNfcTagDto } from '@patrol/shared';

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
  @Roles('admin', 'route_setter', 'local_route_setter', 'inspector')
  @ApiCreatedResponse({ description: 'Patrol point created' })
  createPatrolPoint(@Body() dto: CreatePatrolPointDto): Promise<PatrolPointEntity> {
    return this.patrolPointsService.createPatrolPoint(dto);
  }

  @Get('shop/:shopId')
  @Roles('admin', 'route_setter', 'local_route_setter', 'inspector')
  @ApiOkResponse({ description: 'Active patrol points by shop' })
  findByShop(@Param('shopId', ParseUUIDPipe) shopId: string): Promise<PatrolPointEntity[]> {
    return this.patrolPointsService.findByShop(shopId);
  }

  @Get(':id')
  @Roles('admin', 'route_setter', 'local_route_setter', 'inspector')
  @ApiOkResponse({ description: 'Patrol point details' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PatrolPointEntity> {
    return this.patrolPointsService.findOne(id);
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
  ): Promise<NfcTagReplacementEntity> {
    return this.patrolPointsService.replaceNfcTag(id, dto);
  }
}
