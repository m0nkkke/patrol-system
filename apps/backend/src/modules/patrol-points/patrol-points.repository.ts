import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NfcTagEntity } from './entities/nfc-tag.entity';
import { NfcTagReplacementEntity } from './entities/nfc-tag-replacement.entity';
import { PatrolPointEntity } from './entities/patrol-point.entity';
import { PatrolRoutePointEntity } from '../patrols/entities/patrol-route-point.entity';
import { DomainValidationError } from '../../common/errors/domain-validation.error';

type CreateNfcTagRecord = {
  isActive: boolean;
  notes?: string;
  payload?: string;
  registeredBy?: string;
  uid: string;
};

type CreatePatrolPointRecord = {
  description?: string;
  isActive: boolean;
  name: string;
  nfcTagId?: string;
  shopId: string;
  sortOrder: number;
};

type CreateNfcTagReplacementRecord = {
  newNfcTagId: string;
  newNfcUid: string;
  notes?: string;
  oldNfcTagId?: string;
  oldNfcUid?: string;
  patrolPointId: string;
  reason?: string;
  replacedBy?: string;
};

@Injectable()
export class PatrolPointsRepository {
  constructor(
    @InjectRepository(NfcTagEntity)
    private readonly nfcTags: Repository<NfcTagEntity>,
    @InjectRepository(NfcTagReplacementEntity)
    private readonly nfcTagReplacements: Repository<NfcTagReplacementEntity>,
    @InjectRepository(PatrolPointEntity)
    private readonly patrolPoints: Repository<PatrolPointEntity>,
  ) {}

  createNfcTag(data: CreateNfcTagRecord): Promise<NfcTagEntity> {
    return this.nfcTags.save(this.nfcTags.create(data));
  }

  createPatrolPoint(data: CreatePatrolPointRecord): Promise<PatrolPointEntity> {
    return this.patrolPoints.save(this.patrolPoints.create(data));
  }

  async createPatrolPointWithNfc(
    data: CreatePatrolPointRecord,
    tag: CreateNfcTagRecord,
  ): Promise<PatrolPointEntity> {
    return this.patrolPoints.manager.transaction(async (manager) => {
      const tags = manager.getRepository(NfcTagEntity);
      const points = manager.getRepository(PatrolPointEntity);
      let savedTag: NfcTagEntity;
      try {
        savedTag = await tags.save(tags.create(tag));
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === '23505'
        ) {
          throw new DomainValidationError(
            'NFC_UID_ALREADY_REGISTERED',
            'NFC UID is already registered',
          );
        }
        throw error;
      }
      const point = await points.save(points.create({ ...data, nfcTagId: savedTag.id }));
      point.nfcTag = savedTag;
      return point;
    });
  }

  createNfcTagReplacement(data: CreateNfcTagReplacementRecord): Promise<NfcTagReplacementEntity> {
    return this.nfcTagReplacements.save(this.nfcTagReplacements.create(data));
  }

  saveNfcTag(tag: NfcTagEntity): Promise<NfcTagEntity> {
    return this.nfcTags.save(tag);
  }

  savePatrolPoint(point: PatrolPointEntity): Promise<PatrolPointEntity> {
    return this.patrolPoints.save(point);
  }

  findActiveByShop(shopId: string): Promise<PatrolPointEntity[]> {
    return this.patrolPoints.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
      relations: { nfcTag: true, photoFile: true },
      where: { isActive: true, shopId },
    });
  }

  findArchivedByShop(shopId: string): Promise<PatrolPointEntity[]> {
    return this.patrolPoints
      .createQueryBuilder('point')
      .withDeleted()
      .leftJoinAndSelect('point.nfcTag', 'nfcTag')
      .leftJoinAndSelect('point.photoFile', 'photoFile')
      .where('point.shop_id = :shopId', { shopId })
      .andWhere('point.deleted_at IS NOT NULL')
      .orderBy('point.sort_order', 'ASC')
      .addOrderBy('point.created_at', 'ASC')
      .getMany();
  }

  findRouteSetupPointsByShop(shopId: string): Promise<PatrolPointEntity[]> {
    return this.patrolPoints.find({
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
      relations: { nfcTag: true },
      where: { shopId },
      withDeleted: false,
    });
  }

  findNfcTagById(id: string): Promise<NfcTagEntity | null> {
    return this.nfcTags.findOne({ where: { id } });
  }

  findNfcTagByUid(uid: string): Promise<NfcTagEntity | null> {
    return this.nfcTags.findOne({ where: { uid } });
  }

  findPatrolPointById(id: string, withDeleted = false): Promise<PatrolPointEntity | null> {
    return this.patrolPoints.findOne({
      relations: { nfcTag: true, photoFile: true },
      where: { id },
      withDeleted,
    });
  }

  findPatrolPointByNfcTagId(nfcTagId: string): Promise<PatrolPointEntity | null> {
    return this.patrolPoints.findOne({
      relations: { nfcTag: true },
      where: { isActive: true, nfcTagId },
    });
  }

  findPatrolPointByShopAndSortOrder(
    shopId: string,
    sortOrder: number,
  ): Promise<PatrolPointEntity | null> {
    return this.patrolPoints.findOne({
      relations: { nfcTag: true },
      where: { shopId, sortOrder },
    });
  }

  countActiveByShop(shopId: string): Promise<number> {
    return this.patrolPoints.count({ where: { isActive: true, shopId } });
  }

  countActiveRoutesByPointId(patrolPointId: string): Promise<number> {
    return this.patrolPoints.manager
      .getRepository(PatrolRoutePointEntity)
      .createQueryBuilder('routePoint')
      .innerJoin('routePoint.route', 'route')
      .where('routePoint.patrol_point_id = :patrolPointId', { patrolPointId })
      .andWhere('route.is_active = TRUE')
      .andWhere('route.deleted_at IS NULL')
      .getCount();
  }

  async archivePatrolPoint(id: string): Promise<void> {
    await this.patrolPoints.manager.transaction(async (manager) => {
      const points = manager.getRepository(PatrolPointEntity);
      await points.update(id, { isActive: false });
      await points.softDelete(id);
    });
  }

  async restorePatrolPoint(id: string, unbindNfcTag = false): Promise<void> {
    await this.patrolPoints.manager.transaction(async (manager) => {
      const points = manager.getRepository(PatrolPointEntity);
      if (unbindNfcTag) {
        await points.update(id, { nfcTagId: null });
      }
      await points.restore(id);
      await points.update(id, { isActive: true });
    });
  }

  countRegisteredRoutePoints(shopId: string, expectedPoints: number): Promise<number> {
    return this.patrolPoints
      .createQueryBuilder('point')
      .where('point.shop_id = :shopId', { shopId })
      .andWhere('point.sort_order BETWEEN 1 AND :expectedPoints', { expectedPoints })
      .andWhere('point.is_active = TRUE')
      .andWhere('point.nfc_tag_id IS NOT NULL')
      .getCount();
  }

  async resetRouteSetupPoints(shopId: string): Promise<void> {
    await this.nfcTags
      .createQueryBuilder()
      .update(NfcTagEntity)
      .set({ isActive: false })
      .where(
        `id IN (
          SELECT point.nfc_tag_id
          FROM patrol_points point
          WHERE point.shop_id = :shopId
            AND point.sort_order > 0
            AND point.nfc_tag_id IS NOT NULL
        )`,
        { shopId },
      )
      .execute();

    await this.patrolPoints
      .createQueryBuilder()
      .update(PatrolPointEntity)
      .set({ isActive: false, nfcTagId: null })
      .where('shop_id = :shopId', { shopId })
      .andWhere('sort_order > 0')
      .execute();
  }
}
