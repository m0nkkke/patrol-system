import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateNfcTagDto, CreatePatrolPointDto, ReplaceNfcTagDto } from '@patrol/shared';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
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
  @Roles('admin')
  @ApiCreatedResponse({ description: 'NFC tag registered' })
  createNfcTag(@Body() dto: CreateNfcTagDto): Promise<NfcTagEntity> {
    return this.patrolPointsService.createNfcTag(dto);
  }

  @Post()
  @Roles('admin')
  @ApiCreatedResponse({ description: 'Patrol point created' })
  createPatrolPoint(@Body() dto: CreatePatrolPointDto): Promise<PatrolPointEntity> {
    return this.patrolPointsService.createPatrolPoint(dto);
  }

  @Get('shop/:shopId')
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'Active patrol points by shop' })
  findByShop(@Param('shopId', ParseUUIDPipe) shopId: string): Promise<PatrolPointEntity[]> {
    return this.patrolPointsService.findByShop(shopId);
  }

  @Get(':id')
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'Patrol point details' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PatrolPointEntity> {
    return this.patrolPointsService.findOne(id);
  }

  @Post(':id/replace-nfc')
  @Roles('admin')
  @ApiCreatedResponse({ description: 'NFC tag replaced for patrol point' })
  replaceNfcTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceNfcTagDto,
  ): Promise<NfcTagReplacementEntity> {
    return this.patrolPointsService.replaceNfcTag(id, dto);
  }
}
