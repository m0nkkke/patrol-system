import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NfcTagEntity } from './entities/nfc-tag.entity';
import { NfcTagReplacementEntity } from './entities/nfc-tag-replacement.entity';
import { PatrolPointEntity } from './entities/patrol-point.entity';

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
      relations: { nfcTag: true },
      where: { isActive: true, shopId },
    });
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

  findPatrolPointById(id: string): Promise<PatrolPointEntity | null> {
    return this.patrolPoints.findOne({ relations: { nfcTag: true }, where: { id } });
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

  countRegisteredRoutePoints(shopId: string, expectedPoints: number): Promise<number> {
    return this.patrolPoints
      .createQueryBuilder('point')
      .where('point.shop_id = :shopId', { shopId })
      .andWhere('point.sort_order BETWEEN 1 AND :expectedPoints', { expectedPoints })
      .andWhere('point.is_active = TRUE')
      .andWhere('point.nfc_tag_id IS NOT NULL')
      .getCount();
  }
}
