import { Injectable } from '@nestjs/common';
import {
  CreateNfcTagDto,
  CreatePatrolPointDto,
  ReplaceNfcTagDto,
  UpdatePatrolPointDto,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { FilesService, UploadedImageFile } from '../files/files.service';
import { NfcTagEntity } from './entities/nfc-tag.entity';
import { NfcTagReplacementEntity } from './entities/nfc-tag-replacement.entity';
import { PatrolPointEntity } from './entities/patrol-point.entity';
import { PatrolPointsRepository } from './patrol-points.repository';

@Injectable()
export class PatrolPointsService {
  constructor(
    private readonly patrolPointsRepository: PatrolPointsRepository,
    private readonly filesService: FilesService,
  ) {}

  createNfcTag(dto: CreateNfcTagDto): Promise<NfcTagEntity> {
    return this.patrolPointsRepository.createNfcTag({
      isActive: dto.isActive ?? true,
      notes: dto.notes,
      payload: dto.payload,
      registeredBy: dto.registeredBy,
      uid: normalizeNfcUid(dto.uid),
    });
  }

  async createPatrolPoint(
    dto: CreatePatrolPointDto,
    actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity> {
    assertCanManagePoint(actor, dto.shopId);

    if (dto.nfcTagId !== undefined) {
      await this.assertNfcTagCanBeAssigned(dto.nfcTagId);
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

  findByShopForActor(
    shopId: string,
    actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity[]> {
    assertCanAccessPoint(actor, shopId);

    return this.findByShop(shopId);
  }

  findArchivedByShop(
    shopId: string,
    actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity[]> {
    assertCanManagePoint(actor, shopId);

    return this.patrolPointsRepository.findArchivedByShop(shopId);
  }

  findRouteSetupPointsByShop(shopId: string): Promise<PatrolPointEntity[]> {
    return this.patrolPointsRepository.findRouteSetupPointsByShop(shopId);
  }

  async findOne(id: string): Promise<PatrolPointEntity> {
    const point = await this.patrolPointsRepository.findPatrolPointById(id);

    if (point === null) {
      throw new EntityNotFoundError('PatrolPoint', id, 'PATROL_POINT_NOT_FOUND');
    }

    return point;
  }

  async findOneForActor(id: string, actor: AuthenticatedUser): Promise<PatrolPointEntity> {
    const point = await this.findOne(id);
    assertCanAccessPoint(actor, point.shopId);

    return point;
  }

  async update(
    id: string,
    dto: UpdatePatrolPointDto,
    actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity> {
    const point = await this.findOne(id);
    assertCanManagePoint(actor, point.shopId);

    point.name = dto.name ?? point.name;
    point.description = dto.description === undefined ? point.description : dto.description;

    await this.patrolPointsRepository.savePatrolPoint(point);

    return this.findOne(id);
  }

  async archive(id: string, actor: AuthenticatedUser): Promise<PatrolPointEntity> {
    const point = await this.findPointIncludingArchived(id);
    assertCanManagePoint(actor, point.shopId);

    if (isArchived(point)) {
      throw new DomainValidationError(
        'PATROL_POINT_ALREADY_ARCHIVED',
        'Patrol point is already archived',
      );
    }

    const activeRouteCount = await this.patrolPointsRepository.countActiveRoutesByPointId(id);
    if (activeRouteCount > 0) {
      throw new DomainValidationError(
        'PATROL_POINT_IN_ACTIVE_ROUTE',
        'Patrol point must be removed from active routes before archiving',
      );
    }

    await this.patrolPointsRepository.archivePatrolPoint(id);

    return this.findArchivedPoint(id);
  }

  async restore(id: string, actor: AuthenticatedUser): Promise<PatrolPointEntity> {
    const point = await this.findPointIncludingArchived(id);
    assertCanManagePoint(actor, point.shopId);

    if (!isArchived(point)) {
      throw new DomainValidationError(
        'PATROL_POINT_NOT_ARCHIVED',
        'Patrol point is not archived',
      );
    }

    let unbindNfcTag = false;
    if (point.nfcTagId !== undefined && point.nfcTagId !== null) {
      const assignedPoint = await this.patrolPointsRepository.findPatrolPointByNfcTagId(
        point.nfcTagId,
      );
      unbindNfcTag = assignedPoint !== null && assignedPoint.id !== point.id;
    }

    try {
      await this.patrolPointsRepository.restorePatrolPoint(id, unbindNfcTag);
    } catch (error) {
      if (!unbindNfcTag && isUniqueConstraintViolation(error)) {
        await this.patrolPointsRepository.restorePatrolPoint(id, true);
      } else {
        throw error;
      }
    }

    return this.findOne(id);
  }

  async uploadPhoto(
    pointId: string,
    file: UploadedImageFile | undefined,
    actor: AuthenticatedUser,
  ): Promise<PatrolPointEntity> {
    if (file === undefined) {
      throw new DomainValidationError('FILE_REQUIRED', 'Photo file is required');
    }

    const point = await this.findOne(pointId);
    assertCanManagePoint(actor, point.shopId);

    const asset = await this.filesService.createImageAsset({
      file,
      kind: 'patrol_point_photo',
      ownerId: point.id,
      ownerType: 'patrol_point',
      uploadedBy: actor.id,
    });

    point.photoFileId = asset.id;
    point.photoFile = asset;

    return this.patrolPointsRepository.savePatrolPoint(point);
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

  async replaceNfcTag(
    pointId: string,
    dto: ReplaceNfcTagDto,
    actor?: AuthenticatedUser,
  ): Promise<NfcTagReplacementEntity> {
    const point = await this.findOne(pointId);
    if (actor !== undefined) {
      assertCanManagePoint(actor, point.shopId);
    }
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

    if (oldTag !== null && oldTag !== undefined) {
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
      replacedBy: actor?.authorizationId ?? actor?.id ?? dto.replacedBy,
    });
  }

  countRegisteredRoutePoints(shopId: string, expectedPoints: number): Promise<number> {
    return this.patrolPointsRepository.countRegisteredRoutePoints(shopId, expectedPoints);
  }

  resetRouteSetupPoints(shopId: string): Promise<void> {
    return this.patrolPointsRepository.resetRouteSetupPoints(shopId);
  }

  private async assertNfcTagCanBeAssigned(nfcTagId: string, pointId?: string): Promise<void> {
    const tag = await this.patrolPointsRepository.findNfcTagById(nfcTagId);

    if (tag === null) {
      throw new EntityNotFoundError('NfcTag', nfcTagId);
    }

    if (!tag.isActive) {
      throw new DomainValidationError('NFC_TAG_NOT_ACTIVE', 'NFC tag is inactive');
    }

    const assignedPoint = await this.patrolPointsRepository.findPatrolPointByNfcTagId(nfcTagId);
    if (assignedPoint !== null && assignedPoint.id !== pointId) {
      throw new DomainValidationError(
        'NFC_TAG_ALREADY_ASSIGNED',
        'NFC tag is already assigned to another active patrol point',
      );
    }
  }

  private async findArchivedPoint(id: string): Promise<PatrolPointEntity> {
    const point = await this.patrolPointsRepository.findPatrolPointById(id, true);

    if (point === null || point.deletedAt === undefined || point.deletedAt === null) {
      throw new EntityNotFoundError('PatrolPoint', id, 'PATROL_POINT_NOT_FOUND');
    }

    return point;
  }

  private async findPointIncludingArchived(id: string): Promise<PatrolPointEntity> {
    const point = await this.patrolPointsRepository.findPatrolPointById(id, true);

    if (point === null) {
      throw new EntityNotFoundError('PatrolPoint', id, 'PATROL_POINT_NOT_FOUND');
    }

    return point;
  }
}

function assertCanManagePoint(actor: AuthenticatedUser, shopId: string): void {
  if (actor.role === 'admin' || actor.role === 'route_setter') {
    return;
  }

  if (actor.role !== 'local_route_setter' || !actorHasShop(actor, shopId)) {
    throw new DomainValidationError(
      'PATROL_POINT_FORBIDDEN',
      'User cannot manage patrol points for this shop',
    );
  }
}

function assertCanAccessPoint(actor: AuthenticatedUser, shopId: string): void {
  if (actor.role === 'admin' || actor.role === 'route_setter') {
    return;
  }

  if (
    (actor.role !== 'local_route_setter' && actor.role !== 'inspector') ||
    !actorHasShop(actor, shopId)
  ) {
    throw new DomainValidationError(
      'PATROL_POINT_FORBIDDEN',
      'User cannot access patrol points for this shop',
    );
  }
}

function actorHasShop(actor: AuthenticatedUser, shopId: string): boolean {
  return actor.shopId === shopId || (actor.shopIds?.includes(shopId) ?? false);
}

function isArchived(point: PatrolPointEntity): boolean {
  return point.deletedAt !== undefined && point.deletedAt !== null;
}

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}

export function normalizeNfcUid(uid: string): string {
  return uid.trim().toLowerCase();
}

function appendArchiveNote(existingNote: string | null | undefined, pointId: string): string {
  const archiveNote = `Архивирована при замене метки контрольной точки ${pointId}`;

  if (existingNote === null || existingNote === undefined || existingNote.length === 0) {
    return archiveNote;
  }

  return `${existingNote}\n${archiveNote}`;
}
