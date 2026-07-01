import { Injectable } from '@nestjs/common';
import { AssignUserShopsDto, CreateUserDto, ListUsersQueryDto, UpdateUserDto } from '@patrol/shared';
import { randomUUID } from 'crypto';

import { formatAccessKey, generateAccessKey, hashAccessKey } from '../../common/auth/access-key';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
import { DomainValidationError } from '../../common/errors/domain-validation.error';
import { SessionRevocationService } from '../auth/session-revocation.service';
import { ShopEntity } from '../shops/entities/shop.entity';
import { ShopsService } from '../shops/shops.service';
import { UserEntity } from './entities/user.entity';
import { UsersRepository } from './users.repository';

type PublicUser = {
  accessKey?: string;
  createdAt: Date;
  deletedAt?: Date;
  fullName: string;
  id: string;
  isActive: boolean;
  lastLoginAt?: Date;
  role: UserEntity['role'];
  sessionVersion: number;
  shop: UserEntity['shop'];
  shopId?: string;
  shopIds: string[];
  shops: ShopEntity[];
  updatedAt: Date;
  username: string;
};

type PaginatedUsers = {
  items: PublicUser[];
  limit: number;
  page: number;
  total: number;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly shopsService: ShopsService,
    private readonly sessionRevocationService: SessionRevocationService,
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    const shopIds = normalizeShopIds(dto.shopId, dto.shopIds);
    const shops = await this.findShops(shopIds);
    const primaryShopId = dto.shopId ?? shopIds[0];

    const accessKey = generateAccessKey();
    const accessKeyHash = hashAccessKey(accessKey);
    const user = await this.usersRepository.create({
      accessKey,
      accessKeyHash,
      fullName: dto.fullName,
      isActive: dto.isActive ?? true,
      passwordHash: accessKeyHash,
      role: dto.role,
      shopId: primaryShopId,
      shops,
      username: dto.username ?? generateUsername(),
    });

    return toPublicUser(user);
  }

  async findAll(query: ListUsersQueryDto): Promise<PaginatedUsers> {
    const [items, total] = await this.usersRepository.findMany(query);

    return {
      items: items.map(toPublicUser),
      limit: query.limit,
      page: query.page,
      total,
    };
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.usersRepository.findById(id);

    if (user === null) {
      throw new EntityNotFoundError('User', id);
    }

    return toPublicUser(user);
  }

  async assignShops(id: string, dto: AssignUserShopsDto): Promise<PublicUser> {
    const user = await this.requireEntity(id);

    if (dto.primaryShopId !== undefined && !dto.shopIds.includes(dto.primaryShopId)) {
      throw new DomainValidationError(
        'USER_PRIMARY_SHOP_NOT_ASSIGNED',
        'Primary shop must be included in shopIds',
      );
    }

    const shops = await this.findShops(dto.shopIds);
    const primaryShopId = dto.primaryShopId ?? dto.shopIds[0];
    await this.usersRepository.assignShops(user.id, shops, primaryShopId);

    return toPublicUser(await this.requireEntity(id));
  }

  async update(id: string, dto: UpdateUserDto): Promise<PublicUser> {
    const user = await this.requireEntity(id);
    const shouldRevokeSessions = dto.isActive !== undefined && dto.isActive !== user.isActive;

    const shopIds =
      dto.shopId === undefined && dto.shopIds === undefined
        ? undefined
        : normalizeShopIds(dto.shopId, dto.shopIds);
    const shops = shopIds === undefined ? undefined : await this.findShops(shopIds);
    const primaryShopId = dto.shopId ?? shopIds?.[0];

    await this.usersRepository.update(id, {
      fullName: dto.fullName,
      isActive: dto.isActive,
      role: dto.role,
      sessionVersion: shouldRevokeSessions ? user.sessionVersion + 1 : undefined,
      shopId: shopIds === undefined ? undefined : primaryShopId ?? null,
      shops,
      username: dto.username,
    });
    if (shouldRevokeSessions) {
      await this.sessionRevocationService.revokeUserSessions(id);
    }

    return toPublicUser(await this.requireEntity(id));
  }

  async rotateAccessKey(id: string): Promise<PublicUser> {
    const user = await this.requireEntity(id);

    const accessKey = generateAccessKey();
    const accessKeyHash = hashAccessKey(accessKey);
    await this.usersRepository.update(id, {
      accessKey,
      accessKeyHash,
      passwordHash: accessKeyHash,
      sessionVersion: user.sessionVersion + 1,
    });
    await this.sessionRevocationService.revokeUserSessions(id);

    return toPublicUser(await this.requireEntity(id));
  }

  async assertAssignedToShop(userId: string, shopId: string): Promise<void> {
    const user = await this.requireEntity(userId);
    const assigned = user.shopId === shopId || user.shops?.some((shop) => shop.id === shopId);

    if (!assigned) {
      throw new DomainValidationError(
        'USER_SHOP_NOT_ASSIGNED',
        'User is not assigned to the selected shop',
      );
    }
  }

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.usersRepository.findByUsername(username);
  }

  findByAccessKey(accessKey: string): Promise<UserEntity | null> {
    return this.usersRepository.findByAccessKeyHash(hashAccessKey(formatAccessKey(accessKey)));
  }

  findEntityById(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findById(id);
  }

  updateLastLogin(id: string, date: Date): Promise<void> {
    return this.usersRepository.updateLastLogin(id, date);
  }

  private async findShops(shopIds: string[]): Promise<ShopEntity[]> {
    return Promise.all(shopIds.map((shopId) => this.shopsService.findOne(shopId)));
  }

  private async requireEntity(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id);

    if (user === null) {
      throw new EntityNotFoundError('User', id);
    }

    return user;
  }
}

function toPublicUser(user: UserEntity): PublicUser {
  return {
    accessKey: user.accessKey,
    createdAt: user.createdAt,
    deletedAt: user.deletedAt,
    fullName: user.fullName,
    id: user.id,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    role: user.role,
    sessionVersion: user.sessionVersion ?? 0,
    shop: user.shop,
    shopId: user.shopId ?? undefined,
    shopIds: user.shops?.map((shop) => shop.id) ?? (user.shopId == null ? [] : [user.shopId]),
    shops: user.shops ?? (user.shop === undefined ? [] : [user.shop]),
    updatedAt: user.updatedAt,
    username: user.username,
  };
}

function normalizeShopIds(primaryShopId: string | undefined, shopIds: string[] | undefined): string[] {
  return [...new Set([...(shopIds ?? []), ...(primaryShopId === undefined ? [] : [primaryShopId])])];
}

function generateUsername(): string {
  return `user-${randomUUID().slice(0, 8)}`;
}
