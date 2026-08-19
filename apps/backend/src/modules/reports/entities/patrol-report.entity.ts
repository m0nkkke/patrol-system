import { PatrolPeriod, PatrolReportStatus, PatrolReportType } from '@patrol/shared';
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

import { PatrolEntity } from '../../patrols/entities/patrol.entity';
import { PatrolRouteEntity } from '../../patrols/entities/patrol-route.entity';
import { PatrolScheduleEntity } from '../../patrols/entities/patrol-schedule.entity';
import { ShopEntity } from '../../shops/entities/shop.entity';
import { UserEntity } from '../../users/entities/user.entity';
import { PatrolReportFileEntity } from './patrol-report-file.entity';

@Entity({ name: 'patrol_reports' })
export class PatrolReportEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_patrol_reports_report_type')
  @Column({
    enum: ['photo_report', 'morning', 'closing', 'sunday', 'heating', 'evacuation'],
    enumName: 'patrol_report_type',
    name: 'report_type',
    type: 'enum',
  })
  reportType: PatrolReportType = 'photo_report';

  @Index('idx_patrol_reports_status')
  @Column({
    default: 'draft',
    enum: ['draft', 'submitted', 'cancelled'],
    enumName: 'patrol_report_status',
    type: 'enum',
  })
  status: PatrolReportStatus = 'draft';

  @Index('idx_patrol_reports_shop_id')
  @Column({ name: 'shop_id', type: 'uuid' })
  shopId: string = '';

  @ManyToOne(() => ShopEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shop_id' })
  shop?: ShopEntity;

  @Index('idx_patrol_reports_employee_id')
  @Column({ name: 'employee_id', type: 'uuid' })
  employeeId: string = '';

  @ManyToOne(() => UserEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'employee_id' })
  employee?: UserEntity;

  @Index('idx_patrol_reports_patrol_id')
  @Column({ name: 'patrol_id', nullable: true, type: 'uuid' })
  patrolId?: string | null;

  @ManyToOne(() => PatrolEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'patrol_id' })
  patrol?: PatrolEntity | null;

  @Column({ name: 'route_id', nullable: true, type: 'uuid' })
  routeId?: string | null;

  @ManyToOne(() => PatrolRouteEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'route_id' })
  route?: PatrolRouteEntity | null;

  @Column({ name: 'schedule_id', nullable: true, type: 'uuid' })
  scheduleId?: string | null;

  @ManyToOne(() => PatrolScheduleEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schedule_id' })
  schedule?: PatrolScheduleEntity | null;

  @Index('idx_patrol_reports_period')
  @Column({
    enum: ['morning', 'noon', 'evening'],
    enumName: 'patrol_period',
    nullable: true,
    type: 'enum',
  })
  period?: PatrolPeriod | null;

  @Column({ default: 'patrol', name: 'source_service', length: 64 })
  sourceService: string = 'patrol';

  @Column({ default: '1.0', name: 'schema_version', length: 16 })
  schemaVersion: string = '1.0';

  @Column({ default: {}, type: 'jsonb' })
  fields: Record<string, unknown> = {};

  @Column({ nullable: true, type: 'text' })
  comment?: string | null;

  @Column({ name: 'cancellation_reason', nullable: true, type: 'text' })
  cancellationReason?: string | null;

  @Index('idx_patrol_reports_submitted_at')
  @Column({ name: 'submitted_at', nullable: true, type: 'timestamptz' })
  submittedAt?: Date | null;

  @Column({ name: 'cancelled_at', nullable: true, type: 'timestamptz' })
  cancelledAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();

  @OneToMany(() => PatrolReportFileEntity, (file) => file.report)
  files?: PatrolReportFileEntity[];
}
