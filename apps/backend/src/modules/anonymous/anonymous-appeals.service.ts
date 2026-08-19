import { Injectable } from '@nestjs/common';
import {
  CreateAnonymousAppealDto,
  FindAnonymousAppealsDto,
  UpdateAnonymousAppealDto,
} from '@patrol/shared';

import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { ShopsService } from '../shops/shops.service';
import { AnonymousAppealsRepository } from './anonymous-appeals.repository';
import { AnonymousAppealEntity } from './entities/anonymous-appeal.entity';

type PaginatedAnonymousAppeals = {
  items: AnonymousAppealEntity[];
  limit: number;
  page: number;
  total: number;
};

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
  ): Promise<AnonymousAppealEntity> {
    if (actor.role !== 'security_guard' || !actorHasShop(actor, dto.shopId)) {
      throw new DomainValidationError(
        'ANONYMOUS_APPEAL_FORBIDDEN',
        'User cannot create anonymous appeal for this shop',
      );
    }

    await this.shopsService.findOne(dto.shopId);

    return this.repository.create({
      category: dto.category ?? 'message',
      deviceId: meta.deviceId,
      ipAddress: meta.ipAddress,
      message: dto.message.trim(),
      shopId: dto.shopId,
    });
  }

  async findMany(
    query: FindAnonymousAppealsDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedAnonymousAppeals> {
    assertCanInspect(actor);
    const allowedShopIds = actor.role === 'inspector' ? actor.shopIds ?? [] : undefined;
    const [items, total] = await this.repository.findMany(query, allowedShopIds);

    return {
      items,
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  async findOne(id: string, actor: AuthenticatedUser): Promise<AnonymousAppealEntity> {
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

  async updateStatus(
    id: string,
    dto: UpdateAnonymousAppealDto,
    actor: AuthenticatedUser,
  ): Promise<AnonymousAppealEntity> {
    const appeal = await this.findOne(id, actor);

    if (dto.status !== undefined && dto.status !== appeal.status) {
      await this.repository.updateStatus(id, dto.status);
    }

    return this.findOne(id, actor);
  }
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
