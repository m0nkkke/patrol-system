import { PatrolStatus } from '@patrol/shared';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { ShopEntity } from '../../shops/entities/shop.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { PatrolEventEntity } from './patrol-event.entity';
import { PatrolScheduleEntity } from './patrol-schedule.entity';

@Entity({ name: 'patrols' })
export class PatrolEntity {
  @PrimaryGeneratedColumn('uuid')
  // TypeORM assigns generated UUID when entity is loaded or saved.
  id!: string;

  @Index('idx_patrols_shop_id')
  @Column({ name: 'shop_id', type: 'uuid' })
  shopId: string = '';

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop?: ShopEntity;

  @Index('idx_patrols_employee_id')
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string = '';

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee?: UserEntity;

  @Column({ name: 'schedule_id', nullable: true, type: 'uuid' })
  scheduleId?: string;

  @ManyToOne(() => PatrolScheduleEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schedule_id' })
  schedule?: PatrolScheduleEntity;

  @Index('idx_patrols_status')
  @Column({
    default: 'pending',
    enum: ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'],
    enumName: 'patrol_status',
    type: 'enum',
  })
  status: PatrolStatus = 'pending';

  @Index('idx_patrols_started_at')
  @Column({ name: 'started_at', nullable: true, type: 'timestamptz' })
  startedAt?: Date;

  @Column({ name: 'completed_at', nullable: true, type: 'timestamptz' })
  completedAt?: Date;

  @Column({ name: 'cancelled_at', nullable: true, type: 'timestamptz' })
  cancelledAt?: Date;

  @Index('idx_patrols_due_at')
  @Column({ name: 'due_at', nullable: true, type: 'timestamptz' })
  dueAt?: Date;

  @Column({ default: 0, name: 'total_points', type: 'smallint' })
  totalPoints: number = 0;

  @Column({ default: 0, name: 'scanned_points', type: 'smallint' })
  scannedPoints: number = 0;

  @Column({ nullable: true, type: 'text' })
  notes?: string;

  @Column({ name: 'completion_report', nullable: true, type: 'text' })
  completionReport?: string;

  @Column({ name: 'cancellation_reason', nullable: true, type: 'text' })
  cancellationReason?: string;

  @OneToMany(() => PatrolEventEntity, (event) => event.patrol)
  events?: PatrolEventEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();
}
