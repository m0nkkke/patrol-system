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

@Entity({ name: 'audit_log' })
export class AuditLogEntity {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Index('idx_audit_log_user_id')
  @Column({ name: 'user_id', nullable: true, type: 'uuid' })
  userId?: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity | null;

  @Index('idx_audit_log_action')
  @Column({ length: 100 })
  action: string = '';

  @Column({ length: 100, name: 'entity_type', nullable: true, type: 'varchar' })
  entityType?: string | null;

  @Column({ name: 'entity_id', nullable: true, type: 'uuid' })
  entityId?: string | null;

  @Column({ name: 'ip_address', nullable: true, type: 'inet' })
  ipAddress?: string | null;

  @Column({ length: 200, name: 'device_id', nullable: true, type: 'varchar' })
  deviceId?: string | null;

  @Column({ nullable: true, type: 'jsonb' })
  meta?: Record<string, unknown> | null;

  @Index('idx_audit_log_created_at')
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();
}
