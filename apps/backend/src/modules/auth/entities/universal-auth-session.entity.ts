import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'universal_auth_sessions' })
export class UniversalAuthSessionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_universal_auth_sessions_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string = '';

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ length: 200, name: 'actor_full_name' })
  actorFullName: string = '';

  @Column({ length: 200, name: 'device_id' })
  deviceId: string = '';

  @Column({ name: 'ip_address', nullable: true, type: 'inet' })
  ipAddress?: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date = new Date();

  @Column({ name: 'revoked_at', nullable: true, type: 'timestamptz' })
  revokedAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();
}
