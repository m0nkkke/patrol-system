import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { RouteStatus } from '@patrol/shared';

import { UserEntity } from '../../users/entities/user.entity';
import { RegionEntity } from './region.entity';

@Entity({ name: 'shops' })
export class ShopEntity {
  @PrimaryGeneratedColumn('uuid')
  // TypeORM assigns generated UUID when entity is loaded or saved.
  id!: string;

  @Index('idx_shops_region_id')
  @Column({ name: 'region_id', nullable: true, type: 'uuid' })
  regionId?: string;

  @ManyToOne(() => RegionEntity, (region) => region.shops, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'region_id' })
  region?: RegionEntity;

  @Column({ length: 200 })
  name: string = '';

  @Index('idx_shops_external_id')
  @Column({ length: 50, name: 'external_id', nullable: true, unique: true })
  externalId?: string;

  @Column({ nullable: true, type: 'text' })
  address?: string;

  @Column({ default: 'Europe/Moscow', length: 50 })
  timezone: string = 'Europe/Moscow';

  @Column({ default: true, name: 'is_active' })
  isActive: boolean = true;

  @Index('idx_shops_route_status')
  @Column({ default: RouteStatus.NOT_CONFIGURED, length: 32, name: 'route_status' })
  routeStatus: RouteStatus = RouteStatus.NOT_CONFIGURED;

  @Column({ default: 0, name: 'route_expected_points', type: 'smallint' })
  routeExpectedPoints: number = 0;

  @Column({ default: 0, name: 'route_registered_points', type: 'smallint' })
  routeRegisteredPoints: number = 0;

  @OneToMany(() => UserEntity, (user) => user.shop)
  users?: UserEntity[];

  @ManyToMany(() => UserEntity, (user) => user.shops)
  assignedUsers?: UserEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, type: 'timestamptz' })
  deletedAt?: Date;
}
