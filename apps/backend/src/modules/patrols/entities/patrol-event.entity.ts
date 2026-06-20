import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { NfcTagEntity } from '../../patrol-points/entities/nfc-tag.entity';
import { PatrolPointEntity } from '../../patrol-points/entities/patrol-point.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { PatrolEntity } from './patrol.entity';

@Entity({ name: 'patrol_events' })
@Unique('uq_patrol_event_point', ['patrolId', 'patrolPointId'])
export class PatrolEventEntity {
  @PrimaryGeneratedColumn('uuid')
  // TypeORM assigns generated UUID when entity is loaded or saved.
  id!: string;

  @Index('idx_patrol_events_patrol_id')
  @Column({ name: 'patrol_id', type: 'uuid' })
  patrolId: string = '';

  @ManyToOne(() => PatrolEntity, (patrol) => patrol.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patrol_id' })
  patrol?: PatrolEntity;

  @Index('idx_patrol_events_patrol_point_id')
  @Column({ name: 'patrol_point_id', type: 'uuid' })
  patrolPointId: string = '';

  @ManyToOne(() => PatrolPointEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patrol_point_id' })
  patrolPoint?: PatrolPointEntity;

  @Column({ name: 'nfc_tag_id', type: 'uuid' })
  nfcTagId: string = '';

  @ManyToOne(() => NfcTagEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'nfc_tag_id' })
  nfcTag?: NfcTagEntity;

  @Index('idx_patrol_events_employee_id')
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string = '';

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee?: UserEntity;

  @Index('idx_patrol_events_scanned_at')
  @Column({ name: 'scanned_at', type: 'timestamptz' })
  scannedAt: Date = new Date();

  @Column({ default: () => 'NOW()', name: 'received_at', type: 'timestamptz' })
  receivedAt: Date = new Date();

  @Index('idx_patrol_events_nfc_uid')
  @Column({ length: 32, name: 'nfc_uid' })
  nfcUid: string = '';

  @Column({ length: 200, name: 'device_id' })
  deviceId: string = '';

  @Column({ name: 'ip_address', nullable: true, type: 'inet' })
  ipAddress?: string;

  @Column({ name: 'lat', nullable: true, precision: 9, scale: 6, type: 'decimal' })
  lat?: string;

  @Column({ name: 'lng', nullable: true, precision: 9, scale: 6, type: 'decimal' })
  lng?: string;

  @Column({ name: 'gps_accuracy', nullable: true, type: 'real' })
  gpsAccuracy?: number;

  @Index('idx_patrol_events_is_suspicious')
  @Column({ default: false, name: 'is_suspicious' })
  isSuspicious: boolean = false;

  @Column({ name: 'suspicion_reason', nullable: true, type: 'text' })
  suspicionReason?: string;

  @Column({ name: 'client_local_id', nullable: true, type: 'uuid' })
  clientLocalId?: string;

  @Column({ default: false, name: 'point_deactivated_after_scan' })
  pointDeactivatedAfterScan: boolean = false;

  @Column({ default: false, name: 'late_sync' })
  lateSync: boolean = false;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();
}
