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

import { UserEntity } from '../../users/entities/user.entity';

@Entity({ name: 'nfc_tags' })
export class NfcTagEntity {
  @PrimaryGeneratedColumn('uuid')
  // TypeORM assigns generated UUID when entity is loaded or saved.
  id!: string;

  @Index('idx_nfc_tags_uid')
  @Column({ length: 32, unique: true })
  uid: string = '';

  @Column({ length: 100, nullable: true })
  payload?: string;

  @Index('idx_nfc_tags_is_active')
  @Column({ default: true, name: 'is_active' })
  isActive: boolean = true;

  @CreateDateColumn({ name: 'registered_at', type: 'timestamptz' })
  registeredAt: Date = new Date();

  @Column({ name: 'registered_by', nullable: true, type: 'uuid' })
  registeredBy?: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'registered_by' })
  registeredByUser?: UserEntity;

  @Column({ nullable: true, type: 'text' })
  notes?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();
}
