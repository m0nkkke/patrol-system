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

import { ShopEntity } from '../../shops/entities/shop.entity';
import { PatrolRouteEntity } from './patrol-route.entity';

@Entity({ name: 'route_timing_profiles' })
@Index('uq_route_timing_profiles_route_id', ['routeId'], { unique: true })
export class RouteTimingProfileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_route_timing_profiles_route_id')
  @Column({ name: 'route_id', type: 'uuid' })
  routeId: string = '';

  @ManyToOne(() => PatrolRouteEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route?: PatrolRouteEntity;

  @Index('idx_route_timing_profiles_shop_id')
  @Column({ name: 'shop_id', type: 'uuid' })
  shopId: string = '';

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop?: ShopEntity;

  @Column({ name: 'sample_count', type: 'integer' })
  sampleCount: number = 0;

  @Column({ name: 'average_total_seconds', type: 'integer' })
  averageTotalSeconds: number = 0;

  @Column({ name: 'suspicious_fast_seconds', type: 'integer' })
  suspiciousFastSeconds: number = 0;

  @Column({ name: 'fast_seconds', type: 'integer' })
  fastSeconds: number = 0;

  @Column({ name: 'slow_seconds', type: 'integer' })
  slowSeconds: number = 0;

  @Column({ name: 'calculated_from', type: 'timestamptz' })
  calculatedFrom: Date = new Date();

  @Column({ name: 'calculated_to', type: 'timestamptz' })
  calculatedTo: Date = new Date();

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();
}
