import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { PatrolPointEntity } from '../../patrol-points/entities/patrol-point.entity';
import { PatrolRouteEntity } from './patrol-route.entity';

@Entity({ name: 'patrol_route_points' })
@Index('idx_patrol_route_points_route_sort', ['routeId', 'sortOrder'], { unique: true })
@Index('idx_patrol_route_points_route_point', ['routeId', 'patrolPointId'], { unique: true })
export class PatrolRoutePointEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'route_id', type: 'uuid' })
  routeId: string = '';

  @ManyToOne(() => PatrolRouteEntity, (route) => route.points, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'route_id' })
  route?: PatrolRouteEntity;

  @Column({ name: 'patrol_point_id', type: 'uuid' })
  patrolPointId: string = '';

  @ManyToOne(() => PatrolPointEntity, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'patrol_point_id' })
  patrolPoint?: PatrolPointEntity;

  @Column({ name: 'sort_order', type: 'smallint' })
  sortOrder: number = 0;

  @Column({ default: 90, name: 'dwell_seconds', type: 'smallint' })
  dwellSeconds: number = 90;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date = new Date();
}
