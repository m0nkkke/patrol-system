import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListShopsQueryDto, RouteStatus } from '@patrol/shared';

import { ShopEntity } from './entities/shop.entity';

type CreateShopRecord = {
  address?: string;
  externalId?: string;
  isActive: boolean;
  name: string;
  regionId?: string;
  timezone: string;
};

type UpdateShopRecord = {
  address?: string;
  externalId?: string;
  isActive?: boolean;
  name?: string;
  regionId?: string;
  timezone?: string;
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

  findMany(query: ListShopsQueryDto): Promise<[ShopEntity[], number]> {
    const builder = this.repo
      .createQueryBuilder('shop')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    builder.andWhere('shop.is_active = :isActive', { isActive: query.isActive ?? true });

    if (query.search !== undefined && query.search.trim().length > 0) {
      builder.andWhere(
        '(shop.name ILIKE :search OR shop.address ILIKE :search OR shop.external_id ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    if (query.routeStatus !== undefined) {
      builder.andWhere('shop.route_status = :routeStatus', { routeStatus: query.routeStatus });
    }

    const [field, direction] = parseShopSort(query.sort);
    builder.orderBy(`shop.${field}`, direction);

    return builder.getManyAndCount();
  }

  findById(id: string): Promise<ShopEntity | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByExternalId(externalId: string): Promise<ShopEntity | null> {
    return this.repo.findOne({ where: { externalId } });
  }

  async update(id: string, data: UpdateShopRecord): Promise<ShopEntity> {
    return this.repo.save({ id, ...data });
  }

  async updateRouteSetup(id: string, data: UpdateRouteSetupRecord): Promise<void> {
    await this.repo.update(id, {
      routeExpectedPoints: data.expectedPoints,
      routeRegisteredPoints: data.registeredPoints,
      routeStatus: data.status,
    });
  }
}

function parseShopSort(sort: ListShopsQueryDto['sort']): ['createdAt' | 'name' | 'routeStatus', 'ASC' | 'DESC'] {
  if (sort === undefined) {
    return ['createdAt', 'DESC'];
  }

  const [field, direction] = sort.split(':');
  return [field as 'createdAt' | 'name' | 'routeStatus', direction === 'asc' ? 'ASC' : 'DESC'];
}
