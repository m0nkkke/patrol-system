import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AnonymousAppealCategory, AnonymousAppealStatus, FindAnonymousAppealsDto } from '@patrol/shared';
import { Repository } from 'typeorm';

import { AnonymousAppealEntity } from './entities/anonymous-appeal.entity';

type CreateAnonymousAppealRecord = {
  category: AnonymousAppealCategory;
  deviceId?: string | null;
  ipAddress?: string | null;
  message: string;
  shopId: string;
};

@Injectable()
export class AnonymousAppealsRepository {
  constructor(
    @InjectRepository(AnonymousAppealEntity)
    private readonly repo: Repository<AnonymousAppealEntity>,
  ) {}

  create(data: CreateAnonymousAppealRecord): Promise<AnonymousAppealEntity> {
    return this.repo.save(this.repo.create(data));
  }

  findById(id: string): Promise<AnonymousAppealEntity | null> {
    return this.repo.findOne({ relations: { shop: true }, where: { id } });
  }

  findMany(
    query: FindAnonymousAppealsDto,
    allowedShopIds?: string[],
  ): Promise<[AnonymousAppealEntity[], number]> {
    const builder = this.repo
      .createQueryBuilder('appeal')
      .leftJoinAndSelect('appeal.shop', 'shop')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (allowedShopIds !== undefined) {
      if (allowedShopIds.length === 0) {
        builder.andWhere('1 = 0');
      } else {
        builder.andWhere('appeal.shop_id IN (:...allowedShopIds)', { allowedShopIds });
      }
    }

    if (query.shopId !== undefined) {
      builder.andWhere('appeal.shop_id = :shopId', { shopId: query.shopId });
    }

    if (query.category !== undefined) {
      builder.andWhere('appeal.category = :category', { category: query.category });
    }

    if (query.status !== undefined) {
      builder.andWhere('appeal.status = :status', { status: query.status });
    }

    if (query.from !== undefined) {
      builder.andWhere('appeal.created_at >= :from', { from: new Date(query.from) });
    }

    if (query.to !== undefined) {
      builder.andWhere('appeal.created_at <= :to', { to: new Date(query.to) });
    }

    if (query.search !== undefined && query.search.trim().length > 0) {
      builder.andWhere('(appeal.message ILIKE :search OR shop.name ILIKE :search)', {
        search: `%${query.search.trim()}%`,
      });
    }

    const [field, direction] = parseSort(query.sort);
    builder.orderBy(`appeal.${field}`, direction);

    return builder.getManyAndCount();
  }

  async updateStatus(id: string, status: AnonymousAppealStatus): Promise<void> {
    await this.repo.update(id, { status });
  }
}

function parseSort(sort: FindAnonymousAppealsDto['sort']): ['createdAt', 'ASC' | 'DESC'] {
  if (sort === undefined) {
    return ['createdAt', 'DESC'];
  }

  const [, direction] = sort.split(':');
  return ['createdAt', direction === 'asc' ? 'ASC' : 'DESC'];
}
