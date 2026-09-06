import { PatrolRouteVersionSnapshot } from '@patrol/shared';
import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'patrol_route_versions' })
@Index('uq_patrol_route_versions_route_version', ['routeId', 'version'], { unique: true })
export class PatrolRouteVersionEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'route_id', type: 'uuid' })
  routeId: string = '';

  @Column({ type: 'integer' })
  version: number = 1;

  @Column({ name: 'actor_id', nullable: true, type: 'uuid' })
  actorId?: string;

  @Column({ name: 'actor_full_name', nullable: true, type: 'text' })
  actorFullName?: string;

  @Column({ name: 'authorization_id', nullable: true, type: 'uuid' })
  authorizationId?: string;

  @Column({ type: 'jsonb' })
  snapshot!: PatrolRouteVersionSnapshot;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();
}
