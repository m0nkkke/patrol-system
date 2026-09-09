import { Injectable } from '@nestjs/common';
import { CreatePatrolRouteDto, UpdatePatrolRouteDto } from '@patrol/shared';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../../common/errors/not-found.error';
import { PatrolPointsService } from '../../patrol-points/patrol-points.service';
import { ShopsService } from '../../shops/shops.service';
import { PatrolRoutePointEntity } from '../entities/patrol-route-point.entity';
import { PatrolRouteEntity } from '../entities/patrol-route.entity';
import { PatrolRoutesRepository } from './patrol-routes.repository';

@Injectable()
export class PatrolRoutesService {
  constructor(
    private readonly patrolPointsService: PatrolPointsService,
    private readonly patrolRoutesRepository: PatrolRoutesRepository,
    private readonly shopsService: ShopsService,
  ) {}

  async create(dto: CreatePatrolRouteDto, actor: AuthenticatedUser): Promise<PatrolRouteEntity> {
    assertCanManageRoute(actor, dto.shopId);
    await this.shopsService.findOne(dto.shopId);
    await this.assertPointsBelongToShop(dto.patrolPointIds, dto.shopId);
    assertPointSettingsBelongToRoute(dto.pointSettings, dto.patrolPointIds);

    const route = await this.patrolRoutesRepository.create(
      {
        category: dto.category,
        isActive: dto.isActive ?? true,
        name: dto.name,
        pointIds: dto.patrolPointIds,
        pointSettings: dto.pointSettings,
        shopId: dto.shopId,
      },
      actor,
    );
    await this.shopsService.recalculateRouteStatus(dto.shopId);

    return route;
  }

  async findByShop(shopId: string): Promise<PatrolRouteEntity[]> {
    await this.shopsService.findOne(shopId);

    return (await this.patrolRoutesRepository.findByShop(shopId)).map(sortRoutePoints);
  }

  findByShopForActor(shopId: string, actor: AuthenticatedUser): Promise<PatrolRouteEntity[]> {
    assertCanAccessRoute(actor, shopId);
    return this.findByShop(shopId);
  }

  async findOne(id: string): Promise<PatrolRouteEntity> {
    const route = await this.patrolRoutesRepository.findById(id);

    if (route === null) {
      throw new EntityNotFoundError('PatrolRoute', id);
    }

    return sortRoutePoints(route);
  }

  async findOneForActor(id: string, actor: AuthenticatedUser): Promise<PatrolRouteEntity> {
    const route = await this.findOne(id);
    assertCanAccessRoute(actor, route.shopId);
    return route;
  }

  async update(
    id: string,
    dto: UpdatePatrolRouteDto,
    actor: AuthenticatedUser,
  ): Promise<PatrolRouteEntity> {
    const route = await this.findOne(id);
    assertCanManageRoute(actor, route.shopId);

    if (dto.patrolPointIds !== undefined) {
      await this.assertPointsBelongToShop(dto.patrolPointIds, route.shopId);
    }
    const routePointIds =
      dto.patrolPointIds ?? (route.points ?? []).map((point) => point.patrolPointId);
    assertPointSettingsBelongToRoute(dto.pointSettings, routePointIds);

    await this.patrolRoutesRepository.update(
      id,
      {
        category: dto.category,
        isActive: dto.isActive,
        name: dto.name,
        pointIds: dto.patrolPointIds,
        pointSettings: dto.pointSettings,
      },
      actor,
    );
    await this.shopsService.recalculateRouteStatus(route.shopId);

    return this.findOne(id);
  }

  deactivate(id: string, actor: AuthenticatedUser): Promise<PatrolRouteEntity> {
    return this.update(id, { isActive: false }, actor);
  }

  async findVersions(
    id: string,
    actor: AuthenticatedUser,
  ): ReturnType<PatrolRoutesRepository['findVersions']> {
    await this.findOneForActor(id, actor);
    return this.patrolRoutesRepository.findVersions(id);
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

  async assertPointInRoute(
    routeId: string,
    patrolPointId: string,
  ): Promise<PatrolRoutePointEntity> {
    const routePoint = await this.patrolRoutesRepository.findPoint(routeId, patrolPointId);

    if (routePoint === null) {
      throw new DomainValidationError(
        'PATROL_POINT_NOT_IN_ROUTE',
        'Patrol point is not included into current route',
      );
    }

    return routePoint;
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

function assertPointSettingsBelongToRoute(
  pointSettings: CreatePatrolRouteDto['pointSettings'],
  routePointIds: string[],
): void {
  const routePointIdSet = new Set(routePointIds);
  const unknownPoint = pointSettings?.find(
    (setting) => !routePointIdSet.has(setting.patrolPointId),
  );
  if (unknownPoint !== undefined) {
    throw new DomainValidationError(
      'PATROL_ROUTE_POINT_SETTING_NOT_IN_ROUTE',
      'Point dwell setting refers to a point outside the route',
    );
  }
}

function assertCanManageRoute(actor: AuthenticatedUser, shopId: string): void {
  if (actor.role === 'admin' || actor.role === 'route_setter') return;
  if (actor.role !== 'local_route_setter' || !actorHasShop(actor, shopId)) {
    throw new DomainValidationError(
      'PATROL_ROUTE_FORBIDDEN',
      'User cannot manage patrol routes for this shop',
    );
  }
}

function assertCanAccessRoute(actor: AuthenticatedUser, shopId: string): void {
  if (actor.role === 'admin' || actor.role === 'route_setter') return;
  if (
    (actor.role !== 'local_route_setter' && actor.role !== 'inspector') ||
    !actorHasShop(actor, shopId)
  ) {
    throw new DomainValidationError(
      'PATROL_ROUTE_FORBIDDEN',
      'User cannot access patrol routes for this shop',
    );
  }
}

function actorHasShop(actor: AuthenticatedUser, shopId: string): boolean {
  return actor.shopId === shopId || actor.shopIds?.includes(shopId) === true;
}

function sortRoutePoints(route: PatrolRouteEntity): PatrolRouteEntity {
  route.points = [...(route.points ?? [])].sort((left, right) => left.sortOrder - right.sortOrder);

  return route;
}
