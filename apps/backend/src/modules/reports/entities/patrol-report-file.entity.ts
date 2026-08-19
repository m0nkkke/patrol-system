import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { FileAssetEntity } from '../../files/entities/file-asset.entity';
import { PatrolReportEntity } from './patrol-report.entity';

@Entity({ name: 'patrol_report_files' })
export class PatrolReportFileEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_patrol_report_files_report_id')
  @Column({ name: 'report_id', type: 'uuid' })
  reportId: string = '';

  @ManyToOne(() => PatrolReportEntity, (report) => report.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'report_id' })
  report?: PatrolReportEntity;

  @Index('idx_patrol_report_files_file_id')
  @Column({ name: 'file_id', type: 'uuid' })
  fileId: string = '';

  @ManyToOne(() => FileAssetEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'file_id' })
  file?: FileAssetEntity;

  @Column({ default: 'report_photo', length: 64 })
  kind: string = 'report_photo';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();
}
