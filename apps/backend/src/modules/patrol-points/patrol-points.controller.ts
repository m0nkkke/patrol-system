import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CreateNfcTagDto, CreatePatrolPointDto, ReplaceNfcTagDto } from '@patrol/shared';

import { NfcTagReplacementEntity } from './entities/nfc-tag-replacement.entity';
import { NfcTagEntity } from './entities/nfc-tag.entity';
import { PatrolPointEntity } from './entities/patrol-point.entity';
import { PatrolPointsService } from './patrol-points.service';

@ApiTags('patrol-points')
@Controller('patrol-points')
export class PatrolPointsController {
  constructor(private readonly patrolPointsService: PatrolPointsService) {}

  @Post('nfc-tags')
  @ApiCreatedResponse({ description: 'NFC tag registered' })
  createNfcTag(@Body() dto: CreateNfcTagDto): Promise<NfcTagEntity> {
    return this.patrolPointsService.createNfcTag(dto);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Patrol point created' })
  createPatrolPoint(@Body() dto: CreatePatrolPointDto): Promise<PatrolPointEntity> {
    return this.patrolPointsService.createPatrolPoint(dto);
  }

  @Get('shop/:shopId')
  @ApiOkResponse({ description: 'Active patrol points by shop' })
  findByShop(@Param('shopId', ParseUUIDPipe) shopId: string): Promise<PatrolPointEntity[]> {
    return this.patrolPointsService.findByShop(shopId);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Patrol point details' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PatrolPointEntity> {
    return this.patrolPointsService.findOne(id);
  }

  @Post(':id/replace-nfc')
  @ApiCreatedResponse({ description: 'NFC tag replaced for patrol point' })
  replaceNfcTag(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceNfcTagDto,
  ): Promise<NfcTagReplacementEntity> {
    return this.patrolPointsService.replaceNfcTag(id, dto);
  }
}
