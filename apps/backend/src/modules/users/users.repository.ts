import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { UserRole } from '@patrol/shared';

import { UserEntity } from './entities/user.entity';

type CreateUserRecord = {
  accessKey: string;
  accessKeyHash: string;
  fullName: string;
  isActive: boolean;
  passwordHash: string;
  role: UserRole;
  shopId?: string;
  username: string;
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

  findActive(page: number, limit: number): Promise<[UserEntity[], number]> {
    return this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      relations: { shop: true },
      skip: (page - 1) * limit,
      take: limit,
      where: { isActive: true },
    });
  }

  findById(id: string): Promise<UserEntity | null> {
    return this.repo.findOne({ relations: { shop: true }, where: { id } });
  }

  findByUsername(username: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { username } });
  }

  findByAccessKeyHash(accessKeyHash: string): Promise<UserEntity | null> {
    return this.repo.findOne({ where: { accessKeyHash } });
  }

  async updateLastLogin(id: string, date: Date): Promise<void> {
    await this.repo.update(id, { lastLoginAt: date });
  }
}
