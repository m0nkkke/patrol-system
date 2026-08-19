import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'report_outbox_events' })
export class ReportOutboxEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_report_outbox_events_event_id')
  @Column({ name: 'event_id', type: 'uuid', unique: true })
  eventId: string = '';

  @Index('idx_report_outbox_events_event_type')
  @Column({ name: 'event_type', length: 100 })
  eventType: string = '';

  @Column({ default: 'patrol', name: 'source_service', length: 64 })
  sourceService: string = 'patrol';

  @Column({ default: '1.0', name: 'schema_version', length: 16 })
  schemaVersion: string = '1.0';

  @Column({ type: 'jsonb' })
  payload: Record<string, unknown> = {};

  @Index('idx_report_outbox_events_status')
  @Column({
    default: 'pending',
    enum: ['pending', 'sent', 'failed'],
    enumName: 'report_outbox_status',
    type: 'enum',
  })
  status: 'pending' | 'sent' | 'failed' = 'pending';

  @Column({ default: 0, name: 'attempt_count', type: 'integer' })
  attemptCount: number = 0;

  @Index('idx_report_outbox_events_next_attempt_at')
  @Column({ name: 'next_attempt_at', nullable: true, type: 'timestamptz' })
  nextAttemptAt?: Date | null;

  @Column({ name: 'sent_at', nullable: true, type: 'timestamptz' })
  sentAt?: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date = new Date();
}
