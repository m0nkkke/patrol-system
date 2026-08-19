import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PatrolRouteCategory } from '@patrol/shared';
import { Repository } from 'typeorm';

import { PatrolRoutePointEntity } from '../entities/patrol-route-point.entity';
import { PatrolRouteEntity } from '../entities/patrol-route.entity';

type CreatePatrolRouteRecord = {
  category: PatrolRouteCategory;
  isActive: boolean;
  name: string;
  pointIds: string[];
  shopId: string;
};

type UpdatePatrolRouteRecord = {
  category?: PatrolRouteCategory;
  isActive?: boolean;
  name?: string;
  pointIds?: string[];
};

@Injectable()
export class PatrolRoutesRepository {
  constructor(
    @InjectRepository(PatrolRouteEntity)
    private readonly routes: Repository<PatrolRouteEntity>,
    @InjectRepository(PatrolRoutePointEntity)
    private readonly routePoints: Repository<PatrolRoutePointEntity>,
  ) {}

  async create(data: CreatePatrolRouteRecord): Promise<PatrolRouteEntity> {
    const route = await this.routes.save(
      this.routes.create({
        category: data.category,
        isActive: data.isActive,
        name: data.name,
        shopId: data.shopId,
      }),
    );
    await this.replacePoints(route.id, data.pointIds);

    return this.findById(route.id) as Promise<PatrolRouteEntity>;
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

  async update(id: string, data: UpdatePatrolRouteRecord): Promise<void> {
    await this.routes.update(id, {
      category: data.category,
      isActive: data.isActive,
      name: data.name,
    });

    if (data.pointIds !== undefined) {
      await this.replacePoints(id, data.pointIds);
    }
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

  private async replacePoints(routeId: string, pointIds: string[]): Promise<void> {
    await this.routePoints.delete({ routeId });
    await this.routePoints.save(
      pointIds.map((patrolPointId, index) =>
        this.routePoints.create({
          patrolPointId,
          routeId,
          sortOrder: index + 1,
        }),
      ),
    );
  }
}
