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
}
