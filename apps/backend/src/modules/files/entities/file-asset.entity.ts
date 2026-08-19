import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'file_assets' })
export class FileAssetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('idx_file_assets_owner')
  @Column({ name: 'owner_type', length: 64 })
  ownerType: string = '';

  @Column({ name: 'owner_id', nullable: true, type: 'uuid' })
  ownerId?: string | null;

  @Index('idx_file_assets_kind')
  @Column({ length: 64 })
  kind: string = '';

  @Column({ length: 32 })
  storage: string = '';

  @Column({ name: 'storage_key', type: 'text' })
  storageKey: string = '';

  @Column({ name: 'mime_type', length: 100 })
  mimeType: string = '';

  @Column({ name: 'original_name', nullable: true, type: 'text' })
  originalName?: string | null;

  @Column({ name: 'size_bytes', type: 'integer' })
  sizeBytes: number = 0;

  @Column({ name: 'checksum_sha256', length: 64 })
  checksumSha256: string = '';

  @Column({ nullable: true, type: 'integer' })
  width?: number | null;

  @Column({ nullable: true, type: 'integer' })
  height?: number | null;

  @Column({ name: 'uploaded_by', nullable: true, type: 'uuid' })
  uploadedBy?: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();

  @DeleteDateColumn({ name: 'deleted_at', nullable: true, type: 'timestamptz' })
  deletedAt?: Date;
}
