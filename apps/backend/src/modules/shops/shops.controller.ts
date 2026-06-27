import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import {
  BindRoutePointNfcDto,
  CreateShopDto,
  ListShopsQueryDto,
  StartRouteSetupDto,
  UpdateShopDto,
} from '@patrol/shared';

import { ShopEntity } from './entities/shop.entity';
import { ShopsService } from './shops.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

@ApiTags('shops')
@ApiBearerAuth()
@Controller('shops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShopsController {
  constructor(private readonly shopsService: ShopsService) {}

  @Post()
  @Roles('admin')
  @ApiCreatedResponse({ description: 'Shop created' })
  create(@Body() dto: CreateShopDto): Promise<ShopEntity> {
    return this.shopsService.create(dto);
  }

  @Get()
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'Active shops list' })
  findAll(@Query() query: ListShopsQueryDto): ReturnType<ShopsService['findAll']> {
    return this.shopsService.findAll(query);
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Shop details' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ShopEntity> {
    return this.shopsService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin')
  @ApiOkResponse({ description: 'Shop updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateShopDto,
  ): Promise<ShopEntity> {
    return this.shopsService.update(id, dto);
  }

  @Post(':id/route-setup/start')
  @HttpCode(200)
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'Route setup started for shop' })
  startRouteSetup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: StartRouteSetupDto,
  ): ReturnType<ShopsService['startRouteSetup']> {
    return this.shopsService.startRouteSetup(id, dto);
  }

  @Get(':id/route-setup')
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'Route setup state for shop' })
  getRouteSetup(@Param('id', ParseUUIDPipe) id: string): ReturnType<ShopsService['getRouteSetup']> {
    return this.shopsService.getRouteSetup(id);
  }

  @Post(':id/route-setup/points/:sortOrder/bind-nfc')
  @HttpCode(200)
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'NFC UID bound to route point' })
  bindRoutePointNfc(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('sortOrder', ParseIntPipe) sortOrder: number,
    @Body() dto: BindRoutePointNfcDto,
  ): ReturnType<ShopsService['bindRoutePointNfc']> {
    return this.shopsService.bindRoutePointNfc(id, sortOrder, dto);
  }

  @Post(':id/route-setup/reset')
  @HttpCode(200)
  @Roles('admin', 'manager')
  @ApiOkResponse({ description: 'Route setup cancelled and reset for shop' })
  resetRouteSetup(
    @Param('id', ParseUUIDPipe) id: string,
  ): ReturnType<ShopsService['resetRouteSetup']> {
    return this.shopsService.resetRouteSetup(id);
  }
}
