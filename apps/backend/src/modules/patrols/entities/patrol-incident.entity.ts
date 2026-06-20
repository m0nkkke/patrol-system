import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PatrolIncidentType } from '@patrol/shared';

import { PatrolPointEntity } from '../../patrol-points/entities/patrol-point.entity';
import { ShopEntity } from '../../shops/entities/shop.entity';
import { PatrolEventEntity } from './patrol-event.entity';
import { PatrolEntity } from './patrol.entity';

@Entity({ name: 'patrol_incidents' })
export class PatrolIncidentEntity {
  @PrimaryGeneratedColumn('uuid')
  // TypeORM assigns generated UUID when entity is loaded or saved.
  id!: string;

  @Index('idx_patrol_incidents_shop_id')
  @Column({ name: 'shop_id', type: 'uuid' })
  shopId: string = '';

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop?: ShopEntity;

  @Index('idx_patrol_incidents_patrol_id')
  @Column({ name: 'patrol_id', type: 'uuid' })
  patrolId: string = '';

  @ManyToOne(() => PatrolEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patrol_id' })
  patrol?: PatrolEntity;

  @Column({ name: 'patrol_event_id', nullable: true, type: 'uuid' })
  patrolEventId?: string;

  @ManyToOne(() => PatrolEventEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'patrol_event_id' })
  patrolEvent?: PatrolEventEntity;

  @Column({ length: 50 })
  type: PatrolIncidentType = PatrolIncidentType.SHORT_INTERVAL;

  @Column({ nullable: true, name: 'from_patrol_point_id', type: 'uuid' })
  fromPatrolPointId?: string;

  @ManyToOne(() => PatrolPointEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'from_patrol_point_id' })
  fromPatrolPoint?: PatrolPointEntity;

  @Column({ nullable: true, name: 'to_patrol_point_id', type: 'uuid' })
  toPatrolPointId?: string;

  @ManyToOne(() => PatrolPointEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'to_patrol_point_id' })
  toPatrolPoint?: PatrolPointEntity;

  @Column({ nullable: true, name: 'expected_seconds', type: 'integer' })
  expectedSeconds?: number;

  @Column({ nullable: true, name: 'actual_seconds', type: 'integer' })
  actualSeconds?: number;

  @Column({ name: 'message', type: 'text' })
  message: string = '';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();
}
