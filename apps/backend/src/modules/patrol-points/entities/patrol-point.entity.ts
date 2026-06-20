import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ShopEntity } from '../../shops/entities/shop.entity';
import { NfcTagEntity } from './nfc-tag.entity';

@Entity({ name: 'patrol_points' })
export class PatrolPointEntity {
  @PrimaryGeneratedColumn('uuid')
  // TypeORM assigns generated UUID when entity is loaded or saved.
  id!: string;

  @Index('idx_patrol_points_shop_id')
  @Column({ name: 'shop_id', type: 'uuid' })
  shopId: string = '';

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop?: ShopEntity;

  @Index('idx_patrol_points_nfc_tag_id')
  @Column({ name: 'nfc_tag_id', nullable: true, type: 'uuid' })
  nfcTagId?: string;

  @ManyToOne(() => NfcTagEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'nfc_tag_id' })
  nfcTag?: NfcTagEntity;

  @Column({ length: 200 })
  name: string = '';

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ default: 0, name: 'sort_order', type: 'smallint' })
  sortOrder: number = 0;

  @Index('idx_patrol_points_is_active')
  @Column({ default: true, name: 'is_active' })
  isActive: boolean = true;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, type: 'timestamptz' })
  deletedAt?: Date;
}
