import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DEFAULT_PATROL_POINT_DWELL_SECONDS, PatrolRouteCategory } from '@patrol/shared';
import { EntityManager, Repository } from 'typeorm';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { PatrolRouteVersionEntity } from '../entities/patrol-route-version.entity';

import { PatrolRoutePointEntity } from '../entities/patrol-route-point.entity';
import { PatrolRouteEntity } from '../entities/patrol-route.entity';

type CreatePatrolRouteRecord = {
  category: PatrolRouteCategory;
  isActive: boolean;
  name: string;
  pointIds: string[];
  pointSettings?: Array<{ dwellSeconds: number; patrolPointId: string }>;
  shopId: string;
};

type UpdatePatrolRouteRecord = {
  category?: PatrolRouteCategory;
  isActive?: boolean;
  name?: string;
  pointIds?: string[];
  pointSettings?: Array<{ dwellSeconds: number; patrolPointId: string }>;
};

@Injectable()
export class PatrolRoutesRepository {
  constructor(
    @InjectRepository(PatrolRouteEntity)
    private readonly routes: Repository<PatrolRouteEntity>,
    @InjectRepository(PatrolRoutePointEntity)
    private readonly routePoints: Repository<PatrolRoutePointEntity>,
  ) {}

  async create(
    data: CreatePatrolRouteRecord,
    actor: AuthenticatedUser,
  ): Promise<PatrolRouteEntity> {
    return this.routes.manager.transaction(async (manager) => {
      const repository = this.inTransaction(manager);
      const route = await repository.routes.save(
        repository.routes.create({
          category: data.category,
          isActive: data.isActive,
          name: data.name,
          shopId: data.shopId,
        }),
      );
      await repository.replacePoints(route.id, data.pointIds, data.pointSettings);
      const result = (await repository.findById(route.id))!;
      await this.saveVersion(manager, result, actor);
      return result;
    });
  }

  findById(id: string): Promise<PatrolRouteEntity | null> {
    return this.routes.findOne({
      relations: { points: { patrolPoint: { nfcTag: true } }, shop: true },
      where: { id },
    });
  }

  findByShop(shopId: string): Promise<PatrolRouteEntity[]> {
    return this.routes.find({
      order: { isActive: 'DESC', name: 'ASC' },
      relations: { points: { patrolPoint: { nfcTag: true } } },
      where: { shopId },
    });
  }

  async update(id: string, data: UpdatePatrolRouteRecord, actor: AuthenticatedUser): Promise<void> {
    await this.routes.manager.transaction(async (manager) => {
      const repository = this.inTransaction(manager);
      const route = await repository.routes.findOneOrFail({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      const existing = await repository.routePoints.find({ where: { routeId: id } });
      const pointIds = data.pointIds ?? existing.map((point) => point.patrolPointId);
      if (data.pointSettings?.some((setting) => !pointIds.includes(setting.patrolPointId))) {
        throw new DomainValidationError(
          'PATROL_ROUTE_POINT_SETTING_NOT_IN_ROUTE',
          'Point dwell setting refers to a point outside the route',
        );
      }
      route.category = data.category ?? route.category;
      route.isActive = data.isActive ?? route.isActive;
      route.name = data.name ?? route.name;
      await repository.routes.save(route);
      if (data.pointIds !== undefined) {
        const dwell = new Map(existing.map((point) => [point.patrolPointId, point.dwellSeconds]));
        for (const setting of data.pointSettings ?? [])
          dwell.set(setting.patrolPointId, setting.dwellSeconds);
        await repository.replacePoints(
          id,
          data.pointIds,
          data.pointIds.map((patrolPointId) => ({
            patrolPointId,
            dwellSeconds: dwell.get(patrolPointId) ?? DEFAULT_PATROL_POINT_DWELL_SECONDS,
          })),
        );
      } else if (data.pointSettings !== undefined) {
        await repository.updatePointSettings(id, data.pointSettings);
      }
      await this.saveVersion(manager, (await repository.findById(id))!, actor);
    });
  }

  findVersions(routeId: string): Promise<PatrolRouteVersionEntity[]> {
    return this.routes.manager.getRepository(PatrolRouteVersionEntity).find({
      where: { routeId },
      order: { version: 'DESC' },
    });
  }

  private inTransaction(manager: EntityManager): PatrolRoutesRepository {
    return new PatrolRoutesRepository(
      manager.getRepository(PatrolRouteEntity),
      manager.getRepository(PatrolRoutePointEntity),
    );
  }

  private async saveVersion(
    manager: EntityManager,
    route: PatrolRouteEntity,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const versions = manager.getRepository(PatrolRouteVersionEntity);
    const previous = await versions.findOne({
      where: { routeId: route.id },
      order: { version: 'DESC' },
    });
    await versions.save(
      versions.create({
        routeId: route.id,
        version: (previous?.version ?? 0) + 1,
        actorId: actor.id,
        actorFullName: actor.authorizationFullName ?? actor.fullName,
        authorizationId: actor.authorizationId,
        snapshot: {
          name: route.name,
          category: route.category,
          isActive: route.isActive,
          points: [...(route.points ?? [])]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((point) => ({
              patrolPointId: point.patrolPointId,
              sortOrder: point.sortOrder,
              dwellSeconds: point.dwellSeconds,
            })),
        },
      }),
    );
  }

  countActivePoints(routeId: string): Promise<number> {
    return this.routePoints
      .createQueryBuilder('routePoint')
      .innerJoin('routePoint.patrolPoint', 'point')
      .where('routePoint.route_id = :routeId', { routeId })
      .andWhere('point.is_active = TRUE')
      .getCount();
  }

  findPoint(routeId: string, patrolPointId: string): Promise<PatrolRoutePointEntity | null> {
    return this.routePoints.findOne({ where: { patrolPointId, routeId } });
  }

  private async replacePoints(
    routeId: string,
    pointIds: string[],
    pointSettings: Array<{ dwellSeconds: number; patrolPointId: string }> = [],
  ): Promise<void> {
    const dwellByPointId = new Map(
      pointSettings.map((setting) => [setting.patrolPointId, setting.dwellSeconds]),
    );
    await this.routePoints.delete({ routeId });
    await this.routePoints.save(
      pointIds.map((patrolPointId, index) =>
        this.routePoints.create({
          patrolPointId,
          routeId,
          sortOrder: index + 1,
          dwellSeconds: dwellByPointId.get(patrolPointId) ?? DEFAULT_PATROL_POINT_DWELL_SECONDS,
        }),
      ),
    );
  }

  private async updatePointSettings(
    routeId: string,
    pointSettings: Array<{ dwellSeconds: number; patrolPointId: string }>,
  ): Promise<void> {
    for (const setting of pointSettings) {
      await this.routePoints.update(
        { patrolPointId: setting.patrolPointId, routeId },
        { dwellSeconds: setting.dwellSeconds },
      );
    }
  }
}
