import { Injectable } from '@nestjs/common';
import {
  AnonymousAppealResponseDto,
  CreateAnonymousAppealDto,
  FindAnonymousAppealsDto,
  PaginatedAnonymousAppealsResponseDto,
  UpdateAnonymousAppealDto,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { ShopsService } from '../shops/shops.service';
import { ShopEntity } from '../shops/entities/shop.entity';
import { AnonymousAppealsRepository } from './anonymous-appeals.repository';
import { AnonymousAppealEntity } from './entities/anonymous-appeal.entity';

@Injectable()
export class AnonymousAppealsService {
  constructor(
    private readonly repository: AnonymousAppealsRepository,
    private readonly shopsService: ShopsService,
  ) {}

  async create(
    dto: CreateAnonymousAppealDto,
    actor: AuthenticatedUser,
    meta: { deviceId?: string | null; ipAddress?: string | null } = {},
  ): Promise<AnonymousAppealResponseDto> {
    if (actor.role !== 'security_guard' || !actorHasShop(actor, dto.shopId)) {
      throw new DomainValidationError(
        'ANONYMOUS_APPEAL_FORBIDDEN',
        'User cannot create anonymous appeal for this shop',
      );
    }

    const shop = await this.shopsService.findOne(dto.shopId);

    const appeal = await this.repository.create({
      category: dto.category ?? 'message',
      deviceId: meta.deviceId,
      ipAddress: meta.ipAddress,
      message: dto.message.trim(),
      shopId: dto.shopId,
    });

    return toResponseDto(appeal, shop);
  }

  async findMany(
    query: FindAnonymousAppealsDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedAnonymousAppealsResponseDto> {
    assertCanInspect(actor);
    const allowedShopIds = actor.role === 'inspector' ? actor.shopIds ?? [] : undefined;
    const [items, total] = await this.repository.findMany(query, allowedShopIds);

    return {
      items: items.map((appeal) => toResponseDto(appeal)),
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  async findOne(id: string, actor: AuthenticatedUser): Promise<AnonymousAppealResponseDto> {
    return toResponseDto(await this.findAccessibleEntity(id, actor));
  }

  async updateStatus(
    id: string,
    dto: UpdateAnonymousAppealDto,
    actor: AuthenticatedUser,
  ): Promise<AnonymousAppealResponseDto> {
    const appeal = await this.findAccessibleEntity(id, actor);

    if (dto.status !== undefined && dto.status !== appeal.status) {
      await this.repository.updateStatus(id, dto.status);
    }

    return this.findOne(id, actor);
  }

  private async findAccessibleEntity(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<AnonymousAppealEntity> {
    assertCanInspect(actor);
    const appeal = await this.repository.findById(id);

    if (appeal === null) {
      throw new EntityNotFoundError('AnonymousAppeal', id);
    }

    if (actor.role === 'inspector' && !actorHasShop(actor, appeal.shopId)) {
      throw new DomainValidationError(
        'ANONYMOUS_APPEAL_FORBIDDEN',
        'User cannot access anonymous appeal for this shop',
      );
    }

    return appeal;
  }
}

function toResponseDto(
  appeal: AnonymousAppealEntity,
  explicitShop?: ShopEntity,
): AnonymousAppealResponseDto {
  const shop = explicitShop ?? appeal.shop;

  return {
    category: appeal.category,
    createdAt: appeal.createdAt.toISOString(),
    id: appeal.id,
    message: appeal.message,
    shop: {
      address: shop?.address ?? null,
      id: appeal.shopId,
      name: shop?.name ?? '',
    },
    shopId: appeal.shopId,
    status: appeal.status,
    updatedAt: appeal.updatedAt.toISOString(),
  };
}

function assertCanInspect(actor: AuthenticatedUser): void {
  if (actor.role !== 'admin' && actor.role !== 'inspector') {
    throw new DomainValidationError(
      'ANONYMOUS_APPEAL_FORBIDDEN',
      'User cannot access anonymous appeals',
    );
  }
}

function actorHasShop(actor: AuthenticatedUser, shopId: string): boolean {
  return actor.shopId === shopId || actor.shopIds?.includes(shopId) === true;
}
