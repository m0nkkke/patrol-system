import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { MobilePlatform } from '@patrol/shared';

import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'device_push_tokens' })
@Index('idx_device_push_tokens_user_id', ['userId'])
@Index('idx_device_push_tokens_device_id', ['deviceId'])
@Index('uq_device_push_tokens_token', ['pushToken'], { unique: true })
export class DevicePushTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  // TypeORM assigns generated UUID when entity is loaded or saved.
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string = '';

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: UserEntity;

  @Column({ length: 200, name: 'device_id' })
  deviceId: string = '';

  @Column({ length: 200, name: 'push_token' })
  pushToken: string = '';

  @Column({ length: 20, nullable: true })
  platform?: MobilePlatform;

  @Column({ length: 50, name: 'app_version', nullable: true })
  appVersion?: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean = true;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();
}
