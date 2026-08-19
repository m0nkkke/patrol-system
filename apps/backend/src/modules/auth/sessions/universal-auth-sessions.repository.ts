import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';

import { UniversalAuthSessionEntity } from '../entities/universal-auth-session.entity';

type CreateUniversalAuthSessionRecord = {
  actorFullName: string;
  deviceId: string;
  expiresAt: Date;
  ipAddress?: string | null;
  userId: string;
};

@Injectable()
export class UniversalAuthSessionsRepository {
  constructor(
    @InjectRepository(UniversalAuthSessionEntity)
    private readonly repo: Repository<UniversalAuthSessionEntity>,
  ) {}

  create(data: CreateUniversalAuthSessionRecord): Promise<UniversalAuthSessionEntity> {
    return this.repo.save(this.repo.create(data));
  }

  findActiveById(id: string, now = new Date()): Promise<UniversalAuthSessionEntity | null> {
    return this.repo.findOne({
      where: {
        expiresAt: MoreThan(now),
        id,
        revokedAt: IsNull(),
      },
    });
  }

  async revoke(id: string): Promise<void> {
    await this.repo.update(id, { revokedAt: new Date() });
  }
}
