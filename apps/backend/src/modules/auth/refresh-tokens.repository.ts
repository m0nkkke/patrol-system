import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RefreshTokenEntity } from './entities/refresh-token.entity';

type CreateRefreshTokenAudit = {
  deviceId: string;
  expiresAt: Date;
  ipAddress?: string;
  tokenHash: string;
  userId: string;
};

@Injectable()
export class RefreshTokensRepository {
  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repo: Repository<RefreshTokenEntity>,
  ) {}

  createAudit(data: CreateRefreshTokenAudit): Promise<RefreshTokenEntity> {
    return this.repo.save(this.repo.create(data));
  }

  findValidByHash(tokenHash: string, now: Date): Promise<RefreshTokenEntity | null> {
    return this.repo
      .createQueryBuilder('refreshToken')
      .where('refreshToken.tokenHash = :tokenHash', { tokenHash })
      .andWhere('refreshToken.revokedAt IS NULL')
      .andWhere('refreshToken.expiresAt > :now', { now })
      .getOne();
  }

  async revokeByHash(tokenHash: string, revokedAt: Date): Promise<void> {
    await this.repo.update({ tokenHash }, { revokedAt });
  }
}
