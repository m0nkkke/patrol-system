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

export type ShopRouteState = {
  hasActiveSchedule: boolean;
  hasActiveRoute: boolean;
  hasUsableRoute: boolean;
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

  findMany(query: ListShopsQueryDto, allowedShopIds?: string[]): Promise<[ShopEntity[], number]> {
    if (allowedShopIds !== undefined && allowedShopIds.length === 0) {
      return Promise.resolve([[], 0]);
    }

    const builder = this.repo
      .createQueryBuilder('shop')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (allowedShopIds !== undefined) {
      builder.andWhere('shop.id IN (:...allowedShopIds)', { allowedShopIds });
    }

    if (query.isActive !== undefined) {
      builder.andWhere('shop.is_active = :isActive', { isActive: query.isActive });
    }

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

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  async updateRouteSetup(id: string, data: UpdateRouteSetupRecord): Promise<void> {
    await this.repo.update(id, {
      routeExpectedPoints: data.expectedPoints,
      routeRegisteredPoints: data.registeredPoints,
      routeStatus: data.status,
    });
  }

  async findRouteState(id: string): Promise<ShopRouteState> {
    const states = await this.repo.query<
      Array<{ hasActiveRoute: boolean; hasActiveSchedule: boolean; hasUsableRoute: boolean }>
    >(
      `
        SELECT
          EXISTS (
            SELECT 1
            FROM patrol_schedules schedule
            WHERE schedule.shop_id = $1
              AND schedule.is_active = TRUE
              AND schedule.deleted_at IS NULL
          ) AS "hasActiveSchedule",
          EXISTS (
            SELECT 1
            FROM patrol_routes route
            WHERE route.shop_id = $1
              AND route.is_active = TRUE
              AND route.deleted_at IS NULL
          ) AS "hasActiveRoute",
          EXISTS (
            SELECT 1
            FROM patrol_routes route
            WHERE route.shop_id = $1
              AND route.is_active = TRUE
              AND route.deleted_at IS NULL
              AND EXISTS (
                SELECT 1
                FROM patrol_route_points route_point
                WHERE route_point.route_id = route.id
              )
              AND NOT EXISTS (
                SELECT 1
                FROM patrol_route_points route_point
                INNER JOIN patrol_points point ON point.id = route_point.patrol_point_id
                WHERE route_point.route_id = route.id
                  AND (
                    point.is_active = FALSE
                    OR point.deleted_at IS NOT NULL
                    OR point.nfc_tag_id IS NULL
                  )
              )
          ) AS "hasUsableRoute"
      `,
      [id],
    );
    const [state] = states;

    return {
      hasActiveSchedule: state?.hasActiveSchedule === true,
      hasActiveRoute: state?.hasActiveRoute === true,
      hasUsableRoute: state?.hasUsableRoute === true,
    };
  }

  async updateRouteStatus(id: string, status: RouteStatus): Promise<void> {
    await this.repo.update(id, { routeStatus: status });
  }
}

function parseShopSort(
  sort: ListShopsQueryDto['sort'],
): ['createdAt' | 'isActive' | 'name' | 'routeStatus', 'ASC' | 'DESC'] {
  if (sort === undefined) {
    return ['createdAt', 'DESC'];
  }

  const [field, direction] = sort.split(':');
  return [
    field as 'createdAt' | 'isActive' | 'name' | 'routeStatus',
    direction === 'asc' ? 'ASC' : 'DESC',
  ];
}
