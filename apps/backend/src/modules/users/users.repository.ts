import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ListUsersQueryDto, UserRole } from '@patrol/shared';

import { ShopEntity } from '../shops/entities/shop.entity';
import { UserEntity } from './entities/user.entity';

type CreateUserRecord = {
  accessKey: string;
  accessKeyHash: string;
  fullName: string;
  isActive: boolean;
  passwordHash: string;
  role: UserRole;
  shopId?: string;
  shops: ShopEntity[];
  username: string;
};

type UpdateUserRecord = {
  accessKey?: string;
  accessKeyHash?: string;
  fullName?: string;
  isActive?: boolean;
  passwordHash?: string;
  role?: UserRole;
  sessionVersion?: number;
  shopId?: string | null;
  shops?: ShopEntity[];
  username?: string;
};

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  create(data: CreateUserRecord): Promise<UserEntity> {
    return this.repo.save(this.repo.create(data));
  }

  findMany(query: ListUsersQueryDto): Promise<[UserEntity[], number]> {
    const builder = this.repo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.shop', 'shop')
      .leftJoinAndSelect('user.shops', 'shops')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (query.isActive !== undefined) {
      builder.andWhere('user.is_active = :isActive', { isActive: query.isActive });
    }

    if (query.search !== undefined && query.search.trim().length > 0) {
      builder.andWhere('(user.full_name ILIKE :search OR user.username ILIKE :search)', {
        search: `%${query.search.trim()}%`,
      });
    }

    if (query.role !== undefined) {
      builder.andWhere('user.role = :role', { role: query.role });
    }

    const [field, direction] = parseUserSort(query.sort);
    builder.orderBy(`user.${field}`, direction);

    return builder.getManyAndCount();
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ relations: { shop: true, shops: true }, where: { id } });
  }

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.repo.findOne({ relations: { shop: true, shops: true }, where: { username } });
  }

  findByAccessKeyHash(accessKeyHash: string): Promise<UserEntity | null> {
    return this.repo.findOne({ relations: { shop: true, shops: true }, where: { accessKeyHash } });
  }

  async updateLastLogin(id: string, date: Date): Promise<void> {
    await this.repo.update(id, { lastLoginAt: date });
  }

  async assignShops(userId: string, shops: ShopEntity[], primaryShopId?: string): Promise<void> {
    await this.repo.save({ id: userId, shopId: primaryShopId ?? null, shops });
  }

  async update(id: string, data: UpdateUserRecord): Promise<UserEntity> {
    return this.repo.save({ id, ...data });
  }
}

function parseUserSort(sort: ListUsersQueryDto['sort']): ['createdAt' | 'fullName' | 'role', 'ASC' | 'DESC'] {
  if (sort === undefined) {
    return ['createdAt', 'DESC'];
  }

  const [field, direction] = sort.split(':');
  return [field as 'createdAt' | 'fullName' | 'role', direction === 'asc' ? 'ASC' : 'DESC'];
}
