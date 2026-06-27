import { Injectable } from '@nestjs/common';
import {
  BindRoutePointNfcDto,
  CreateShopDto,
  ListShopsQueryDto,
  RouteStatus,
  StartRouteSetupDto,
  UpdateShopDto,
} from '@patrol/shared';

import { DomainConflictError } from '../../common/errors/domain-conflict.error';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { PatrolPointsService } from '../patrol-points/patrol-points.service';
import { PatrolPointEntity } from '../patrol-points/entities/patrol-point.entity';
import { ShopEntity } from './entities/shop.entity';
import { ShopsRepository } from './shops.repository';

type PaginatedShops = {
  items: ShopEntity[];
  limit: number;
  page: number;
  total: number;
};

type RouteSetupState = {
  expectedPoints: number;
  nextSortOrder?: number;
  points: PatrolPointEntity[];
  registeredPoints: number;
  routeStatus: RouteStatus;
  shopId: string;
};

@Injectable()
export class ShopsService {
  constructor(
    private readonly patrolPointsService: PatrolPointsService,
    private readonly shopsRepository: ShopsRepository,
  ) {}

  async create(dto: CreateShopDto): Promise<ShopEntity> {
    await this.assertExternalIdAvailable(dto.externalId);

    return this.shopsRepository.create({
      address: dto.address,
      externalId: dto.externalId,
      isActive: dto.isActive ?? true,
      name: dto.name,
      regionId: dto.regionId,
      timezone: dto.timezone ?? 'Europe/Moscow',
    });
  }

  async findAll(query: ListShopsQueryDto): Promise<PaginatedShops> {
    const [items, total] = await this.shopsRepository.findMany(query);

    return {
      items,
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  async findOne(id: string): Promise<ShopEntity> {
    const shop = await this.shopsRepository.findById(id);

    if (shop === null) {
      throw new EntityNotFoundError('Shop', id);
    }

    return shop;
  }

  async update(id: string, dto: UpdateShopDto): Promise<ShopEntity> {
    await this.findOne(id);
    await this.assertExternalIdAvailable(dto.externalId, id);
    await this.shopsRepository.update(id, {
      address: dto.address,
      externalId: dto.externalId,
      isActive: dto.isActive,
      name: dto.name,
      regionId: dto.regionId,
      timezone: dto.timezone,
    });

    return this.findOne(id);
  }

  async startRouteSetup(shopId: string, dto: StartRouteSetupDto): Promise<RouteSetupState> {
    await this.findOne(shopId);

    const pointNamePrefix = dto.pointNamePrefix ?? 'Контрольная точка';

    for (let sortOrder = 1; sortOrder <= dto.expectedPoints; sortOrder += 1) {
      await this.patrolPointsService.ensureRoutePoint(
        shopId,
        sortOrder,
        `${pointNamePrefix} ${sortOrder}`,
      );
    }

    const registeredPoints = await this.patrolPointsService.countRegisteredRoutePoints(
      shopId,
      dto.expectedPoints,
    );
    const status =
      registeredPoints >= dto.expectedPoints ? RouteStatus.READY : RouteStatus.SETUP_IN_PROGRESS;

    await this.shopsRepository.updateRouteSetup(shopId, {
      expectedPoints: dto.expectedPoints,
      registeredPoints,
      status,
    });

    return this.getRouteSetup(shopId);
  }

  async getRouteSetup(shopId: string): Promise<RouteSetupState> {
    const shop = await this.findOne(shopId);
    const routePoints = await this.patrolPointsService.findRouteSetupPointsByShop(shopId);
    const points = routePoints.filter(
      (point) =>
        point.sortOrder >= 1 &&
        (shop.routeExpectedPoints === 0 || point.sortOrder <= shop.routeExpectedPoints),
    );
    const nextPoint = points.find(
      (point) => point.nfcTagId === null || point.nfcTagId === undefined,
    );

    return {
      expectedPoints: shop.routeExpectedPoints,
      nextSortOrder: nextPoint?.sortOrder,
      points,
      registeredPoints: shop.routeRegisteredPoints,
      routeStatus: shop.routeStatus,
      shopId,
    };
  }

  async bindRoutePointNfc(
    shopId: string,
    sortOrder: number,
    dto: BindRoutePointNfcDto,
  ): Promise<RouteSetupState> {
    const shop = await this.findOne(shopId);

    if (shop.routeExpectedPoints === 0 || shop.routeStatus === RouteStatus.NOT_CONFIGURED) {
      throw new DomainValidationError(
        'ROUTE_SETUP_NOT_STARTED',
        'Route setup must be started before binding NFC tags',
      );
    }

    if (sortOrder < 1 || sortOrder > shop.routeExpectedPoints) {
      throw new DomainValidationError(
        'ROUTE_POINT_OUT_OF_RANGE',
        'Route point number is outside expected route length',
      );
    }

    await this.patrolPointsService.bindRoutePointNfc({
      description: dto.description,
      name: dto.name,
      notes: dto.notes,
      shopId,
      sortOrder,
      uid: dto.uid,
    });

    const registeredPoints = await this.patrolPointsService.countRegisteredRoutePoints(
      shopId,
      shop.routeExpectedPoints,
    );
    const status =
      registeredPoints >= shop.routeExpectedPoints
        ? RouteStatus.READY
        : RouteStatus.SETUP_IN_PROGRESS;

    await this.shopsRepository.updateRouteSetup(shopId, {
      expectedPoints: shop.routeExpectedPoints,
      registeredPoints,
      status,
    });

    return this.getRouteSetup(shopId);
  }

  async resetRouteSetup(shopId: string): Promise<RouteSetupState> {
    await this.findOne(shopId);
    await this.patrolPointsService.resetRouteSetupPoints(shopId);
    await this.shopsRepository.updateRouteSetup(shopId, {
      expectedPoints: 0,
      registeredPoints: 0,
      status: RouteStatus.NOT_CONFIGURED,
    });

    return this.getRouteSetup(shopId);
  }

  private async assertExternalIdAvailable(externalId: string | undefined, currentShopId?: string): Promise<void> {
    if (externalId === undefined) {
      return;
    }

    const existing = await this.shopsRepository.findByExternalId(externalId);

    if (existing !== null && existing.id !== currentShopId) {
      throw new DomainConflictError(
        'SHOP_EXTERNAL_ID_TAKEN',
        'Shop external ID is already taken',
      );
    }
  }
}
