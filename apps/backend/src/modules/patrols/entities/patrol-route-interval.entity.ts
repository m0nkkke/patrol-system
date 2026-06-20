import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

import { PatrolPointEntity } from '../../patrol-points/entities/patrol-point.entity';
import { ShopEntity } from '../../shops/entities/shop.entity';
import { PatrolEntity } from './patrol.entity';

@Entity({ name: 'patrol_route_intervals' })
@Unique('uq_patrol_route_interval_points', ['shopId', 'fromPatrolPointId', 'toPatrolPointId'])
export class PatrolRouteIntervalEntity {
  @PrimaryGeneratedColumn('uuid')
  // TypeORM assigns generated UUID when entity is loaded or saved.
  id!: string;

  @Index('idx_patrol_route_intervals_shop_id')
  @Column({ name: 'shop_id', type: 'uuid' })
  shopId: string = '';

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop?: ShopEntity;

  @Column({ name: 'from_patrol_point_id', type: 'uuid' })
  fromPatrolPointId: string = '';

  @ManyToOne(() => PatrolPointEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'from_patrol_point_id' })
  fromPatrolPoint?: PatrolPointEntity;

  @Column({ name: 'to_patrol_point_id', type: 'uuid' })
  toPatrolPointId: string = '';

  @ManyToOne(() => PatrolPointEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'to_patrol_point_id' })
  toPatrolPoint?: PatrolPointEntity;

  @Column({ name: 'from_sort_order', type: 'smallint' })
  fromSortOrder: number = 0;

  @Column({ name: 'to_sort_order', type: 'smallint' })
  toSortOrder: number = 0;

  @Column({ name: 'baseline_seconds', type: 'integer' })
  baselineSeconds: number = 0;

  @Column({ name: 'min_seconds', type: 'integer' })
  minSeconds: number = 0;

  @Column({ name: 'max_seconds', type: 'integer' })
  maxSeconds: number = 0;

  @Column({ name: 'source_patrol_id', type: 'uuid' })
  sourcePatrolId: string = '';

  @ManyToOne(() => PatrolEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'source_patrol_id' })
  sourcePatrol?: PatrolEntity;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();
}
