import { PatrolPointVisitStatus } from '@patrol/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { PatrolPointEntity } from '../../patrol-points/entities/patrol-point.entity';
import { PatrolEventEntity } from './patrol-event.entity';
import { PatrolEntity } from './patrol.entity';

@Entity({ name: 'patrol_point_visits' })
@Index('uq_patrol_point_visits_patrol_point', ['patrolId', 'patrolPointId'], { unique: true })
export class PatrolPointVisitEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_patrol_point_visits_patrol_id')
  @Column({ name: 'patrol_id', type: 'uuid' })
  patrolId: string = '';

  @ManyToOne(() => PatrolEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patrol_id' })
  patrol?: PatrolEntity;

  @Index('idx_patrol_point_visits_patrol_point_id')
  @Column({ name: 'patrol_point_id', type: 'uuid' })
  patrolPointId: string = '';

  @ManyToOne(() => PatrolPointEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patrol_point_id' })
  patrolPoint?: PatrolPointEntity;

  @Column({ length: 50 })
  status: PatrolPointVisitStatus = PatrolPointVisitStatus.ARRIVED;

  @Column({ name: 'arrived_at', type: 'timestamptz' })
  arrivedAt: Date = new Date();

  @Column({ name: 'locked_until', type: 'timestamptz' })
  lockedUntil: Date = new Date();

  @Column({ name: 'departed_at', nullable: true, type: 'timestamptz' })
  departedAt?: Date;

  @Column({ name: 'dwell_seconds', nullable: true, type: 'integer' })
  dwellSeconds?: number;

  @Column({ name: 'arrival_event_id', nullable: true, type: 'uuid' })
  arrivalEventId?: string;

  @OneToOne(() => PatrolEventEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'arrival_event_id' })
  arrivalEvent?: PatrolEventEntity | null;

  @Column({ name: 'departure_event_id', nullable: true, type: 'uuid' })
  departureEventId?: string;

  @OneToOne(() => PatrolEventEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'departure_event_id' })
  departureEvent?: PatrolEventEntity | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();
}
