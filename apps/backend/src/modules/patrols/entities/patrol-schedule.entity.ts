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

import { PatrolPeriod } from '@patrol/shared';

import { ShopEntity } from '../../shops/entities/shop.entity';
import { PatrolRouteEntity } from './patrol-route.entity';

@Entity({ name: 'patrol_schedules' })
export class PatrolScheduleEntity {
  @PrimaryGeneratedColumn('uuid')
  // TypeORM assigns generated UUID when entity is loaded or saved.
  id!: string;

  @Index('idx_patrol_schedules_shop_id')
  @Column({ name: 'shop_id', type: 'uuid' })
  shopId: string = '';

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop?: ShopEntity;

  @Index('idx_patrol_schedules_route_id')
  @Column({ name: 'route_id', nullable: true, type: 'uuid' })
  routeId?: string;

  @ManyToOne(() => PatrolRouteEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'route_id' })
  route?: PatrolRouteEntity;

  @Index('idx_patrol_schedules_period')
  @Column({
    default: 'morning',
    enum: ['morning', 'noon', 'evening'],
    enumName: 'patrol_period',
    type: 'enum',
  })
  period: PatrolPeriod = 'morning';

  @Column({ default: 0, name: 'early_start_minutes', type: 'smallint' })
  earlyStartMinutes: number = 0;

  @Column({ length: 200 })
  name: string = '';

  @Column({ array: true, type: 'smallint' })
  weekdays: number[] = [];

  @Column({ name: 'start_time', type: 'time' })
  startTime: string = '';

  @Column({ name: 'end_time', type: 'time' })
  endTime: string = '';

  @Index('idx_patrol_schedules_is_active')
  @Column({ default: true, name: 'is_active' })
  isActive: boolean = true;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();
}
