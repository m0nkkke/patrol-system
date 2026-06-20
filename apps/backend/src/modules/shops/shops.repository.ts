import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RouteStatus } from '@patrol/shared';

import { ShopEntity } from './entities/shop.entity';

type CreateShopRecord = {
  address?: string;
  externalId?: string;
  isActive: boolean;
  name: string;
  regionId?: string;
  timezone: string;
};

type UpdateRouteSetupRecord = {
  expectedPoints: number;
  registeredPoints: number;
  status: RouteStatus;
};

@Injectable()
export class ShopsRepository {
  constructor(
    @InjectRepository(ShopEntity)
    private readonly repo: Repository<ShopEntity>,
  ) {}

  create(data: CreateShopRecord): Promise<ShopEntity> {
    return this.repo.save(this.repo.create(data));
  }

  findActive(page: number, limit: number): Promise<[ShopEntity[], number]> {
    return this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      where: { isActive: true },
    });
  }

  findById(id: string): Promise<ShopEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  async updateRouteSetup(id: string, data: UpdateRouteSetupRecord): Promise<void> {
    await this.repo.update(id, {
      routeExpectedPoints: data.expectedPoints,
      routeRegisteredPoints: data.registeredPoints,
      routeStatus: data.status,
    });
  }
}
