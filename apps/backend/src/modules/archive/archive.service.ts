import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ArchiveResourceType, ListArchiveQueryDto } from '@patrol/shared';
import { ObjectLiteral, Repository, SelectQueryBuilder } from 'typeorm';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { FileAssetEntity } from '../files/entities/file-asset.entity';
import { NfcTagEntity } from '../patrol-points/entities/nfc-tag.entity';
import { PatrolPointEntity } from '../patrol-points/entities/patrol-point.entity';
import { PatrolPointsService } from '../patrol-points/patrol-points.service';
import { PatrolRouteEntity } from '../patrols/entities/patrol-route.entity';
import { PatrolRoutesService } from '../patrols/routes/patrol-routes.service';
import { ShopEntity } from '../shops/entities/shop.entity';
import { UserEntity } from '../users/entities/user.entity';

type ArchiveItem = {
  archived: boolean;
  archivedAt?: Date | null;
  archiveReason: 'soft_deleted' | 'inactive' | null;
  data: unknown;
  displayName: string;
  id: string;
  resourceType: ArchiveResourceType;
};

type PaginatedArchiveItems = {
  items: ArchiveItem[];
  limit: number;
  page: number;
  total: number;
};

type ArchiveConfig<Entity extends { id: string }> = {
  displayName: (entity: Entity) => string;
  inactiveColumn?: keyof Entity & string;
  repo: Repository<Entity>;
  searchColumns: string[];
  softDelete: boolean;
  updatedAtColumn?: string;
};

@Injectable()
export class ArchiveService {
  constructor(
    @InjectRepository(FileAssetEntity)
    private readonly fileAssets: Repository<FileAssetEntity>,
    @InjectRepository(NfcTagEntity)
    private readonly nfcTags: Repository<NfcTagEntity>,
    @InjectRepository(PatrolPointEntity)
    private readonly patrolPoints: Repository<PatrolPointEntity>,
    @InjectRepository(PatrolRouteEntity)
    private readonly patrolRoutes: Repository<PatrolRouteEntity>,
    @InjectRepository(ShopEntity)
    private readonly shops: Repository<ShopEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly patrolPointsService: PatrolPointsService,
    private readonly patrolRoutesService: PatrolRoutesService,
  ) {}

  async findArchived(
    resourceType: ArchiveResourceType,
    query: ListArchiveQueryDto,
  ): Promise<PaginatedArchiveItems> {
    const config = this.getConfig(resourceType);
    const builder = config.repo.createQueryBuilder('entity');

    if (config.softDelete) {
      builder.withDeleted().andWhere('entity.deleted_at IS NOT NULL');
    } else if (config.inactiveColumn !== undefined) {
      builder.andWhere(`entity.${toDatabaseColumn(config.inactiveColumn)} = FALSE`);
    }

    applySearch(builder, query.search, config.searchColumns);

    const [sortField, sortDirection] = parseSort(query.sort, config.updatedAtColumn);
    builder
      .orderBy(`entity.${sortField}`, sortDirection)
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [items, total] = await builder.getManyAndCount();

    return {
      items: items.map((item) => toArchiveItem(resourceType, item, config)),
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  async archive(
    resourceType: ArchiveResourceType,
    id: string,
    actor: AuthenticatedUser,
  ): Promise<ArchiveItem> {
    const config = this.getConfig(resourceType);

    if (resourceType === 'patrol-points') {
      const point = await this.patrolPointsService.archive(id, actor);
      return toArchiveItem(resourceType, point, config);
    }
    if (resourceType === 'patrol-routes') {
      return toArchiveItem(
        resourceType,
        await this.patrolRoutesService.archive(id, actor),
        config,
      );
    }

    const entity = await this.findEntity(config.repo, id, config.softDelete);

    if (entity === null) {
      throw new EntityNotFoundError(resourceType, id);
    }

    if (config.softDelete) {
      await config.repo.softDelete(id);
    }

    if (config.inactiveColumn !== undefined) {
      await config.repo.update(id, { [config.inactiveColumn]: false } as never);
    }

    const archived = await this.findEntity(config.repo, id, config.softDelete);

    return toArchiveItem(resourceType, archived ?? entity, config);
  }

  async restore(
    resourceType: ArchiveResourceType,
    id: string,
    actor: AuthenticatedUser,
  ): Promise<ArchiveItem> {
    const config = this.getConfig(resourceType);

    if (resourceType === 'patrol-points') {
      const point = await this.patrolPointsService.restore(id, actor);
      return toArchiveItem(resourceType, point, config);
    }
    if (resourceType === 'patrol-routes') {
      return toArchiveItem(
        resourceType,
        await this.patrolRoutesService.restore(id, actor),
        config,
      );
    }

    const entity = await this.findEntity(config.repo, id, true);

    if (entity === null) {
      throw new EntityNotFoundError(resourceType, id);
    }

    if (config.softDelete) {
      await config.repo.restore(id);
    }

    if (config.inactiveColumn !== undefined) {
      await config.repo.update(id, { [config.inactiveColumn]: true } as never);
    }

    const restored = await this.findEntity(config.repo, id, false);

    return toArchiveItem(resourceType, restored ?? entity, config);
  }

  private findEntity<Entity extends { id: string }>(
    repo: Repository<Entity>,
    id: string,
    withDeleted: boolean,
  ): Promise<Entity | null> {
    return repo.findOne({ where: { id } as never, withDeleted });
  }

  private getConfig(resourceType: ArchiveResourceType): ArchiveConfig<any> {
    switch (resourceType) {
      case 'file-assets':
        return {
          displayName: (entity: FileAssetEntity) => entity.originalName ?? entity.storageKey,
          repo: this.fileAssets,
          searchColumns: ['owner_type', 'kind', 'original_name', 'storage_key'],
          softDelete: true,
        };
      case 'nfc-tags':
        return {
          displayName: (entity: NfcTagEntity) => entity.uid,
          inactiveColumn: 'isActive',
          repo: this.nfcTags,
          searchColumns: ['uid', 'payload', 'notes'],
          softDelete: false,
          updatedAtColumn: 'updated_at',
        };
      case 'patrol-points':
        return {
          displayName: (entity: PatrolPointEntity) => entity.name,
          inactiveColumn: 'isActive',
          repo: this.patrolPoints,
          searchColumns: ['name', 'description'],
          softDelete: true,
          updatedAtColumn: 'updated_at',
        };
      case 'patrol-routes':
        return {
          displayName: (entity: PatrolRouteEntity) => entity.name,
          inactiveColumn: 'isActive',
          repo: this.patrolRoutes,
          searchColumns: ['name'],
          softDelete: true,
          updatedAtColumn: 'updated_at',
        };
      case 'shops':
        return {
          displayName: (entity: ShopEntity) => entity.name,
          inactiveColumn: 'isActive',
          repo: this.shops,
          searchColumns: ['name', 'address', 'external_id'],
          softDelete: true,
          updatedAtColumn: 'updated_at',
        };
      case 'users':
        return {
          displayName: (entity: UserEntity) => entity.fullName,
          inactiveColumn: 'isActive',
          repo: this.users,
          searchColumns: ['full_name', 'username'],
          softDelete: true,
          updatedAtColumn: 'updated_at',
        };
      default:
        throw new EntityNotFoundError('ArchiveResourceType', resourceType);
    }
  }
}

function applySearch<Entity extends ObjectLiteral>(
  builder: SelectQueryBuilder<Entity>,
  search: string | undefined,
  columns: string[],
): void {
  const value = search?.trim();

  if (value === undefined || value.length === 0) {
    return;
  }

  const predicates = columns.map((column) => `entity.${column} ILIKE :search`).join(' OR ');
  builder.andWhere(`(${predicates})`, { search: `%${value}%` });
}

function parseSort(
  sort: ListArchiveQueryDto['sort'],
  updatedAtColumn = 'created_at',
): [string, 'ASC' | 'DESC'] {
  const [field, direction] = (sort ?? 'createdAt:desc').split(':');
  const column = field === 'updatedAt' ? updatedAtColumn : 'created_at';

  return [column, direction === 'asc' ? 'ASC' : 'DESC'];
}

function toArchiveItem<Entity extends { id: string }>(
  resourceType: ArchiveResourceType,
  entity: Entity,
  config: ArchiveConfig<Entity>,
): ArchiveItem {
  const deletedAt = 'deletedAt' in entity ? (entity.deletedAt as Date | undefined) : undefined;
  const inactive =
    config.inactiveColumn === undefined
      ? false
      : (entity[config.inactiveColumn] as boolean) === false;
  const archived = (deletedAt !== undefined && deletedAt !== null) || inactive;

  return {
    archived,
    archivedAt: deletedAt ?? null,
    archiveReason:
      deletedAt !== undefined && deletedAt !== null ? 'soft_deleted' : inactive ? 'inactive' : null,
    data: entity,
    displayName: config.displayName(entity),
    id: entity.id,
    resourceType,
  };
}

function toDatabaseColumn(property: string): string {
  return property.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
