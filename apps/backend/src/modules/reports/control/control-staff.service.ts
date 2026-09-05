import {
  ControlStaffResponseDto,
  FindControlStaffDto,
  PaginatedControlStaffResponseDto,
} from '@patrol/shared';
import { Injectable } from '@nestjs/common';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { EntityNotFoundError } from '../../../common/errors/not-found.error';
import { UserEntity } from '../../users/entities/user.entity';
import { ControlStaffRepository } from './control-staff.repository';

@Injectable()
export class ControlStaffService {
  constructor(private readonly repository: ControlStaffRepository) {}

  async findMany(
    query: FindControlStaffDto,
    actor: AuthenticatedUser,
  ): Promise<PaginatedControlStaffResponseDto> {
    assertControlRole(actor);
    const allowedShopIds = actor.role === 'inspector' ? getActorShopIds(actor) : undefined;
    const [users, total] = await this.repository.findMany(query, allowedShopIds);

    return {
      items: users.map((user) => toResponseDto(user, allowedShopIds)),
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  async findOne(id: string, actor: AuthenticatedUser): Promise<ControlStaffResponseDto> {
    assertControlRole(actor);
    const user = await this.repository.findById(id);

    if (user === null) {
      throw new EntityNotFoundError('ControlStaff', id);
    }

    const allowedShopIds = actor.role === 'inspector' ? getActorShopIds(actor) : undefined;
    if (allowedShopIds !== undefined && !hasShopIntersection(user, allowedShopIds)) {
      throw new DomainValidationError(
        'CONTROL_STAFF_FORBIDDEN',
        'User cannot access staff outside assigned shops',
      );
    }

    return toResponseDto(user, allowedShopIds);
  }
}

function toResponseDto(
  user: UserEntity,
  allowedShopIds?: string[],
): ControlStaffResponseDto {
  const shops = new Map<string, ControlStaffResponseDto['shops'][number]>();

  if (user.shop !== undefined && canExposeShop(user.shop.id, allowedShopIds)) {
    shops.set(user.shop.id, toShopDto(user.shop));
  }
  for (const shop of user.shops ?? []) {
    if (canExposeShop(shop.id, allowedShopIds)) {
      shops.set(shop.id, toShopDto(shop));
    }
  }

  const primaryShopId = user.shopId ?? null;

  return {
    fullName: user.fullName,
    id: user.id,
    isActive: user.isActive,
    primaryShopId:
      primaryShopId !== null && canExposeShop(primaryShopId, allowedShopIds)
        ? primaryShopId
        : null,
    role: user.role,
    shops: [...shops.values()],
  };
}

function canExposeShop(shopId: string, allowedShopIds?: string[]): boolean {
  return allowedShopIds === undefined || allowedShopIds.includes(shopId);
}

function toShopDto(shop: NonNullable<UserEntity['shop']>): ControlStaffResponseDto['shops'][number] {
  return {
    address: shop.address ?? null,
    id: shop.id,
    name: shop.name,
  };
}

function assertControlRole(actor: AuthenticatedUser): void {
  if (actor.role !== 'admin' && actor.role !== 'inspector') {
    throw new DomainValidationError('CONTROL_STAFF_FORBIDDEN', 'User cannot access control staff');
  }
}

function getActorShopIds(actor: AuthenticatedUser): string[] {
  return [...new Set([...(actor.shopIds ?? []), ...(actor.shopId === undefined ? [] : [actor.shopId])])];
}

function hasShopIntersection(user: UserEntity, allowedShopIds: string[]): boolean {
  if (user.shopId !== undefined && user.shopId !== null && allowedShopIds.includes(user.shopId)) {
    return true;
  }

  return user.shops?.some((shop) => allowedShopIds.includes(shop.id)) === true;
}
