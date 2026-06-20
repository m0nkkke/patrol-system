import { Injectable } from '@nestjs/common';
import { CreateNfcTagDto, CreatePatrolPointDto, ReplaceNfcTagDto } from '@patrol/shared';

import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { NfcTagEntity } from './entities/nfc-tag.entity';
import { NfcTagReplacementEntity } from './entities/nfc-tag-replacement.entity';
import { PatrolPointEntity } from './entities/patrol-point.entity';
import { PatrolPointsRepository } from './patrol-points.repository';

@Injectable()
export class PatrolPointsService {
  constructor(private readonly patrolPointsRepository: PatrolPointsRepository) {}

  createNfcTag(dto: CreateNfcTagDto): Promise<NfcTagEntity> {
    return this.patrolPointsRepository.createNfcTag({
      isActive: dto.isActive ?? true,
      notes: dto.notes,
      payload: dto.payload,
      registeredBy: dto.registeredBy,
      uid: normalizeNfcUid(dto.uid),
    });
  }

  async createPatrolPoint(dto: CreatePatrolPointDto): Promise<PatrolPointEntity> {
    if (dto.nfcTagId !== undefined) {
      const tag = await this.patrolPointsRepository.findNfcTagById(dto.nfcTagId);

      if (tag === null) {
        throw new EntityNotFoundError('NfcTag', dto.nfcTagId);
      }
    }

    return this.patrolPointsRepository.createPatrolPoint({
      description: dto.description,
      isActive: dto.isActive ?? true,
      name: dto.name,
      nfcTagId: dto.nfcTagId,
      shopId: dto.shopId,
      sortOrder: dto.sortOrder ?? 0,
    });
  }

  findByShop(shopId: string): Promise<PatrolPointEntity[]> {
    return this.patrolPointsRepository.findActiveByShop(shopId);
  }

  findRouteSetupPointsByShop(shopId: string): Promise<PatrolPointEntity[]> {
    return this.patrolPointsRepository.findRouteSetupPointsByShop(shopId);
  }

  async findOne(id: string): Promise<PatrolPointEntity> {
    const point = await this.patrolPointsRepository.findPatrolPointById(id);

    if (point === null) {
      throw new EntityNotFoundError('PatrolPoint', id);
    }

    return point;
  }

  countActiveByShop(shopId: string): Promise<number> {
    return this.patrolPointsRepository.countActiveByShop(shopId);
  }

  async findActiveTagByUid(uid: string): Promise<NfcTagEntity> {
    const normalizedUid = normalizeNfcUid(uid);
    const tag = await this.patrolPointsRepository.findNfcTagByUid(normalizedUid);

    if (tag === null || !tag.isActive) {
      throw new DomainValidationError('NFC_TAG_NOT_ACTIVE', 'NFC tag is not registered or inactive');
    }

    return tag;
  }

  async findRegisteredTagByUid(uid: string): Promise<NfcTagEntity> {
    const normalizedUid = normalizeNfcUid(uid);
    const tag = await this.patrolPointsRepository.findNfcTagByUid(normalizedUid);

    if (tag === null) {
      throw new DomainValidationError('NFC_TAG_NOT_REGISTERED', 'NFC tag is not registered');
    }

    return tag;
  }

  async ensureRoutePoint(
    shopId: string,
    sortOrder: number,
    name: string,
  ): Promise<PatrolPointEntity> {
    const existing = await this.patrolPointsRepository.findPatrolPointByShopAndSortOrder(
      shopId,
      sortOrder,
    );

    if (existing !== null) {
      return existing;
    }

    return this.patrolPointsRepository.createPatrolPoint({
      isActive: false,
      name,
      shopId,
      sortOrder,
    });
  }

  async bindRoutePointNfc(data: {
    description?: string;
    name?: string;
    notes?: string;
    shopId: string;
    sortOrder: number;
    uid: string;
  }): Promise<PatrolPointEntity> {
    const normalizedUid = normalizeNfcUid(data.uid);
    let tag = await this.patrolPointsRepository.findNfcTagByUid(normalizedUid);

    if (tag === null) {
      tag = await this.patrolPointsRepository.createNfcTag({
        isActive: true,
        notes: data.notes,
        uid: normalizedUid,
      });
    } else if (!tag.isActive) {
      tag.isActive = true;
      tag.notes = data.notes ?? tag.notes;
      tag = await this.patrolPointsRepository.saveNfcTag(tag);
    }

    const assignedPoint = await this.patrolPointsRepository.findPatrolPointByNfcTagId(tag.id);

    if (
      assignedPoint !== null &&
      (assignedPoint.shopId !== data.shopId || assignedPoint.sortOrder !== data.sortOrder)
    ) {
      throw new DomainValidationError(
        'NFC_TAG_ALREADY_ASSIGNED',
        'NFC tag is already assigned to another patrol point',
      );
    }

    const point = await this.ensureRoutePoint(
      data.shopId,
      data.sortOrder,
      data.name ?? `Контрольная точка ${data.sortOrder}`,
    );

    point.description = data.description ?? point.description;
    point.isActive = true;
    point.name = data.name ?? point.name;
    point.nfcTagId = tag.id;

    return this.patrolPointsRepository.savePatrolPoint(point);
  }

  async replaceNfcTag(pointId: string, dto: ReplaceNfcTagDto): Promise<NfcTagReplacementEntity> {
    const point = await this.findOne(pointId);
    const normalizedUid = normalizeNfcUid(dto.uid);
    const oldTag = point.nfcTag;

    if (oldTag?.uid === normalizedUid) {
      throw new DomainValidationError(
        'NFC_REPLACEMENT_SAME_UID',
        'New NFC tag UID must differ from the current tag UID',
      );
    }

    let newTag = await this.patrolPointsRepository.findNfcTagByUid(normalizedUid);

    if (newTag === null) {
      newTag = await this.patrolPointsRepository.createNfcTag({
        isActive: true,
        notes: dto.notes,
        registeredBy: dto.replacedBy,
        uid: normalizedUid,
      });
    } else {
      const assignedPoint = await this.patrolPointsRepository.findPatrolPointByNfcTagId(newTag.id);

      if (assignedPoint !== null && assignedPoint.id !== point.id) {
        throw new DomainValidationError(
          'NFC_TAG_ALREADY_ASSIGNED',
          'NFC tag is already assigned to another patrol point',
        );
      }

      if (!newTag.isActive) {
        newTag.isActive = true;
      }

      newTag.notes = dto.notes ?? newTag.notes;
      newTag = await this.patrolPointsRepository.saveNfcTag(newTag);
    }

    if (oldTag !== undefined) {
      oldTag.isActive = false;
      oldTag.notes = appendArchiveNote(oldTag.notes, point.id);
      await this.patrolPointsRepository.saveNfcTag(oldTag);
    }

    point.nfcTagId = newTag.id;
    point.isActive = true;
    await this.patrolPointsRepository.savePatrolPoint(point);

    return this.patrolPointsRepository.createNfcTagReplacement({
      newNfcTagId: newTag.id,
      newNfcUid: newTag.uid,
      notes: dto.notes,
      oldNfcTagId: oldTag?.id,
      oldNfcUid: oldTag?.uid,
      patrolPointId: point.id,
      reason: dto.reason,
      replacedBy: dto.replacedBy,
    });
  }

  countRegisteredRoutePoints(shopId: string, expectedPoints: number): Promise<number> {
    return this.patrolPointsRepository.countRegisteredRoutePoints(shopId, expectedPoints);
  }
}

export function normalizeNfcUid(uid: string): string {
  return uid.trim().toLowerCase();
}

function appendArchiveNote(existingNote: string | undefined, pointId: string): string {
  const archiveNote = `Архивирована при замене метки контрольной точки ${pointId}`;

  if (existingNote === undefined || existingNote.length === 0) {
    return archiveNote;
  }

  return `${existingNote}\n${archiveNote}`;
}
