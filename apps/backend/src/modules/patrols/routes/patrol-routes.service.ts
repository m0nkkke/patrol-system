import { Injectable } from '@nestjs/common';
import { CreatePatrolRouteDto, UpdatePatrolRouteDto } from '@patrol/shared';

import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../../common/errors/not-found.error';
import { PatrolPointsService } from '../../patrol-points/patrol-points.service';
import { ShopsService } from '../../shops/shops.service';
import { PatrolRouteEntity } from '../entities/patrol-route.entity';
import { PatrolRoutesRepository } from './patrol-routes.repository';

@Injectable()
export class PatrolRoutesService {
  constructor(
    private readonly patrolPointsService: PatrolPointsService,
    private readonly patrolRoutesRepository: PatrolRoutesRepository,
    private readonly shopsService: ShopsService,
  ) {}

  async create(dto: CreatePatrolRouteDto): Promise<PatrolRouteEntity> {
    await this.shopsService.findOne(dto.shopId);
    await this.assertPointsBelongToShop(dto.patrolPointIds, dto.shopId);

    return this.patrolRoutesRepository.create({
      category: dto.category,
      isActive: dto.isActive ?? true,
      name: dto.name,
      pointIds: dto.patrolPointIds,
      shopId: dto.shopId,
    });
  }

  async findByShop(shopId: string): Promise<PatrolRouteEntity[]> {
    await this.shopsService.findOne(shopId);

    return (await this.patrolRoutesRepository.findByShop(shopId)).map(sortRoutePoints);
  }

  async findOne(id: string): Promise<PatrolRouteEntity> {
    const route = await this.patrolRoutesRepository.findById(id);

    if (route === null) {
      throw new EntityNotFoundError('PatrolRoute', id);
    }

    return sortRoutePoints(route);
  }

  async update(id: string, dto: UpdatePatrolRouteDto): Promise<PatrolRouteEntity> {
    const route = await this.findOne(id);

    if (dto.patrolPointIds !== undefined) {
      await this.assertPointsBelongToShop(dto.patrolPointIds, route.shopId);
    }

    await this.patrolRoutesRepository.update(id, {
      category: dto.category,
      isActive: dto.isActive,
      name: dto.name,
      pointIds: dto.patrolPointIds,
    });

    return this.findOne(id);
  }

  deactivate(id: string): Promise<PatrolRouteEntity> {
    return this.update(id, { isActive: false });
  }

  async assertRouteUsable(routeId: string, shopId: string): Promise<void> {
    const route = await this.findOne(routeId);

    if (route.shopId !== shopId) {
      throw new DomainValidationError(
        'PATROL_ROUTE_WRONG_SHOP',
        'Patrol route belongs to another shop',
      );
    }

    if (!route.isActive) {
      throw new DomainValidationError('PATROL_ROUTE_INACTIVE', 'Patrol route is inactive');
    }
  }

  countActivePoints(routeId: string): Promise<number> {
    return this.patrolRoutesRepository.countActivePoints(routeId);
  }

  async assertPointInRoute(routeId: string, patrolPointId: string): Promise<number> {
    const routePoint = await this.patrolRoutesRepository.findPoint(routeId, patrolPointId);

    if (routePoint === null) {
      throw new DomainValidationError(
        'PATROL_POINT_NOT_IN_ROUTE',
        'Patrol point is not included into current route',
      );
    }

    return routePoint.sortOrder;
  }

  private async assertPointsBelongToShop(pointIds: string[], shopId: string): Promise<void> {
    for (const pointId of pointIds) {
      const point = await this.patrolPointsService.findOne(pointId);

      if (point.shopId !== shopId) {
        throw new DomainValidationError(
          'PATROL_ROUTE_POINT_WRONG_SHOP',
          'Patrol route point belongs to another shop',
        );
      }
    }
  }
}

function sortRoutePoints(route: PatrolRouteEntity): PatrolRouteEntity {
  route.points = [...(route.points ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);

  return route;
}
