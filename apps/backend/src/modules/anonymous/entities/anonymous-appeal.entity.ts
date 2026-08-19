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
import {
  ANONYMOUS_APPEAL_CATEGORIES,
  ANONYMOUS_APPEAL_STATUSES,
  AnonymousAppealCategory,
  AnonymousAppealStatus,
} from '@patrol/shared';

import { ShopEntity } from '../../shops/entities/shop.entity';

@Entity({ name: 'anonymous_appeals' })
export class AnonymousAppealEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_anonymous_appeals_shop_id')
  @Column({ name: 'shop_id', type: 'uuid' })
  shopId: string = '';

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop?: ShopEntity;

  @Index('idx_anonymous_appeals_category')
  @Column({
    default: 'message',
    enum: ANONYMOUS_APPEAL_CATEGORIES,
    enumName: 'anonymous_appeal_category',
    type: 'enum',
  })
  category: AnonymousAppealCategory = 'message';

  @Index('idx_anonymous_appeals_status')
  @Column({
    default: 'new',
    enum: ANONYMOUS_APPEAL_STATUSES,
    enumName: 'anonymous_appeal_status',
    type: 'enum',
  })
  status: AnonymousAppealStatus = 'new';

  @Column({ type: 'text' })
  message: string = '';

  @Column({ length: 200, name: 'device_id', nullable: true, type: 'varchar' })
  deviceId?: string | null;

  @Column({ name: 'ip_address', nullable: true, type: 'inet' })
  ipAddress?: string | null;

  @Index('idx_anonymous_appeals_created_at')
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();
}
