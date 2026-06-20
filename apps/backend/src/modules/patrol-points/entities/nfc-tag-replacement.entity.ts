import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { UserEntity } from '../../users/entities/user.entity';
import { NfcTagEntity } from './nfc-tag.entity';
import { PatrolPointEntity } from './patrol-point.entity';

@Entity({ name: 'nfc_tag_replacements' })
export class NfcTagReplacementEntity {
  @PrimaryGeneratedColumn('uuid')
  // TypeORM assigns generated UUID when entity is loaded or saved.
  id!: string;

  @Index('idx_nfc_tag_replacements_patrol_point_id')
  @Column({ name: 'patrol_point_id', type: 'uuid' })
  patrolPointId: string = '';

  @ManyToOne(() => PatrolPointEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patrol_point_id' })
  patrolPoint?: PatrolPointEntity;

  @Column({ name: 'old_nfc_tag_id', nullable: true, type: 'uuid' })
  oldNfcTagId?: string;

  @ManyToOne(() => NfcTagEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'old_nfc_tag_id' })
  oldNfcTag?: NfcTagEntity;

  @Column({ length: 32, name: 'old_nfc_uid', nullable: true })
  oldNfcUid?: string;

  @Column({ name: 'new_nfc_tag_id', type: 'uuid' })
  newNfcTagId: string = '';

  @ManyToOne(() => NfcTagEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'new_nfc_tag_id' })
  newNfcTag?: NfcTagEntity;

  @Column({ length: 32, name: 'new_nfc_uid' })
  newNfcUid: string = '';

  @Column({ name: 'replaced_by', nullable: true, type: 'uuid' })
  replacedBy?: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'replaced_by' })
  replacedByUser?: UserEntity;

  @Column({ nullable: true, type: 'text' })
  reason?: string;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();
}
