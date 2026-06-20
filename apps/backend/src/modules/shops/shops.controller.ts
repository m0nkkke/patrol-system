import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  BindRoutePointNfcDto,
  CreateShopDto,
  PaginationDto,
  StartRouteSetupDto,
} from '@patrol/shared';

import { ShopEntity } from './entities/shop.entity';
import { ShopsService } from './shops.service';

@ApiTags('shops')
@Controller('shops')
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  @ApiCreatedResponse({ description: 'Shop created' })
  create(@Body() dto: CreateShopDto): Promise<ShopEntity> {
    return this.shopsService.create(dto);
  }

  @Get()
  @ApiOkResponse({ description: 'Active shops list' })
  findAll(@Query() pagination: PaginationDto): ReturnType<ShopsService['findAll']> {
    return this.shopsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Shop details' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ShopEntity> {
    return this.shopsService.findOne(id);
  }

  @Post(':id/route-setup/start')
  @HttpCode(200)
  @ApiOkResponse({ description: 'Route setup started for shop' })
  startRouteSetup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StartRouteSetupDto,
  ): ReturnType<ShopsService['startRouteSetup']> {
    return this.shopsService.startRouteSetup(id, dto);
  }

  @Get(':id/route-setup')
  @ApiOkResponse({ description: 'Route setup state for shop' })
  getRouteSetup(@Param('id', ParseUUIDPipe) id: string): ReturnType<ShopsService['getRouteSetup']> {
    return this.shopsService.getRouteSetup(id);
  }

  @Post(':id/route-setup/points/:sortOrder/bind-nfc')
  @HttpCode(200)
  @ApiOkResponse({ description: 'NFC UID bound to route point' })
  bindRoutePointNfc(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sortOrder', ParseIntPipe) sortOrder: number,
    @Body() dto: BindRoutePointNfcDto,
  ): ReturnType<ShopsService['bindRoutePointNfc']> {
    return this.shopsService.bindRoutePointNfc(id, sortOrder, dto);
  }
}
