import { PatrolRouteCategory } from '@patrol/shared';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ShopEntity } from '../../shops/entities/shop.entity';
import { PatrolRoutePointEntity } from './patrol-route-point.entity';

@Entity({ name: 'patrol_routes' })
export class PatrolRouteEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_patrol_routes_shop_id')
  @Column({ name: 'shop_id', type: 'uuid' })
  shopId: string = '';

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop?: ShopEntity;

  @Column({ length: 200 })
  name: string = '';

  @Index('idx_patrol_routes_category')
  @Column({
    enum: ['internal', 'external'],
    enumName: 'patrol_route_category',
    type: 'enum',
  })
  category: PatrolRouteCategory = 'internal';

  @Index('idx_patrol_routes_is_active')
  @Column({ default: true, name: 'is_active' })
  isActive: boolean = true;

  @OneToMany(() => PatrolRoutePointEntity, (point) => point.route)
  points?: PatrolRoutePointEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, type: 'timestamptz' })
  deletedAt?: Date;
}
