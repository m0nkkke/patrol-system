import { UserRole } from '@patrol/shared';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinTable,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ShopEntity } from '../../shops/entities/shop.entity';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  // TypeORM assigns generated UUID when entity is loaded or saved.
  id!: string;

  @Index('idx_users_shop_id')
  @Column({ name: 'shop_id', nullable: true, type: 'uuid' })
  shopId?: string | null;

  @ManyToOne(() => ShopEntity, (shop) => shop.users, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'shop_id' })
  shop?: ShopEntity;

  @ManyToMany(() => ShopEntity, (shop) => shop.assignedUsers)
  @JoinTable({
    inverseJoinColumn: { name: 'shop_id', referencedColumnName: 'id' },
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    name: 'user_shop_assignments',
  })
  shops?: ShopEntity[];

  @Index('idx_users_role')
  @Column({ default: 'employee', enum: ['employee', 'manager', 'admin'], type: 'enum', enumName: 'user_role' })
  role: UserRole = 'employee';

  @Column({ length: 200, name: 'full_name' })
  fullName: string = '';

  @Column({ length: 100, unique: true })
  username: string = '';

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash: string = '';

  @Column({ length: 32, name: 'access_key', nullable: true })
  accessKey?: string;

  @Column({ length: 64, name: 'access_key_hash', nullable: true })
  accessKeyHash?: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean = true;

  @Column({ name: 'last_login_at', nullable: true, type: 'timestamptz' })
  lastLoginAt?: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, type: 'timestamptz' })
  deletedAt?: Date;
}
