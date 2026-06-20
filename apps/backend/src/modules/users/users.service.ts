import { Injectable } from '@nestjs/common';
import { CreateUserDto, PaginationDto } from '@patrol/shared';
import { randomUUID } from 'crypto';

import { formatAccessKey, generateAccessKey, hashAccessKey } from '../../common/auth/access-key';
import { EntityNotFoundError } from '../../common/errors/not-found.error';
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
  shop: UserEntity['shop'];
  shopId?: string;
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
    private readonly usersRepository: UsersRepository,
  ) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    if (dto.shopId !== undefined) {
      await this.shopsService.findOne(dto.shopId);
    }

    const accessKey = generateAccessKey();
    const accessKeyHash = hashAccessKey(accessKey);
    const user = await this.usersRepository.create({
      accessKey,
      accessKeyHash,
      fullName: dto.fullName,
      isActive: dto.isActive ?? true,
      passwordHash: accessKeyHash,
      role: dto.role,
      shopId: dto.shopId,
      username: dto.username ?? generateUsername(),
    });

    return toPublicUser(user);
  }

  async findAll(pagination: PaginationDto): Promise<PaginatedUsers> {
    const [items, total] = await this.usersRepository.findActive(pagination.page, pagination.limit);

    return {
      items: items.map(toPublicUser),
      limit: pagination.limit,
      page: pagination.page,
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
    shop: user.shop,
    shopId: user.shopId,
    updatedAt: user.updatedAt,
    username: user.username,
  };
}

function generateUsername(): string {
  return `user-${randomUUID().slice(0, 8)}`;
}
