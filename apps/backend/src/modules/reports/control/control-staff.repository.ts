import { Injectable } from '@nestjs/common';
import { FindControlStaffDto } from '@patrol/shared';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';

@Injectable()
export class ControlStaffRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  findMany(
    query: FindControlStaffDto,
    allowedShopIds?: string[],
  ): Promise<[UserEntity[], number]> {
    const builder = this.users
      .createQueryBuilder('user')
      .distinct(true)
      .leftJoinAndSelect('user.shop', 'primaryShop')
      .leftJoinAndSelect('user.shops', 'assignedShop')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    applyShopScope(builder, allowedShopIds);

    if (query.shopId !== undefined) {
      builder.andWhere(
        new Brackets((shop) => {
          shop
            .where('user.shop_id = :requestedShopId', { requestedShopId: query.shopId })
            .orWhere('assignedShop.id = :requestedShopId', { requestedShopId: query.shopId });
        }),
      );
    }

    if (query.role !== undefined) {
      builder.andWhere('user.role = :role', { role: query.role });
    }

    if (query.isActive !== undefined) {
      builder.andWhere('user.is_active = :isActive', { isActive: query.isActive });
    }

    if (query.search !== undefined && query.search.trim().length > 0) {
      builder.andWhere('user.full_name ILIKE :search', { search: `%${query.search.trim()}%` });
    }

    const [field, direction] = parseSort(query.sort);
    builder.orderBy(`user.${field}`, direction).addOrderBy('user.id', 'ASC');

    return builder.getManyAndCount();
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.users.findOne({ relations: { shop: true, shops: true }, where: { id } });
  }
}

function applyShopScope(
  builder: ReturnType<Repository<UserEntity>['createQueryBuilder']>,
  allowedShopIds?: string[],
): void {
  if (allowedShopIds === undefined) {
    return;
  }

  if (allowedShopIds.length === 0) {
    builder.andWhere('1 = 0');
    return;
  }

  builder.andWhere(
    new Brackets((scope) => {
      scope
        .where('user.shop_id IN (:...allowedShopIds)', { allowedShopIds })
        .orWhere('assignedShop.id IN (:...allowedShopIds)', { allowedShopIds });
    }),
  );
}

function parseSort(
  sort: FindControlStaffDto['sort'],
): ['fullName' | 'isActive' | 'role', 'ASC' | 'DESC'] {
  if (sort === undefined) {
    return ['fullName', 'ASC'];
  }

  const [field, direction] = sort.split(':');
  return [field as 'fullName' | 'isActive' | 'role', direction === 'desc' ? 'DESC' : 'ASC'];
}
