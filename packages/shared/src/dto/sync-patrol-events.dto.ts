import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsUUID, ValidateNested } from 'class-validator';

import { CreatePatrolEventDto } from './create-patrol-event.dto';

export const SYNC_PATROL_EVENT_STATUSES = [
  'created',
  'duplicate',
  'late_sync',
  'point_deactivated',
] as const;

export type SyncPatrolEventStatus = (typeof SYNC_PATROL_EVENT_STATUSES)[number];

export class SyncPatrolEventDto extends CreatePatrolEventDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  localId: string = '';
}

export class SyncPatrolEventsDto {
  @ApiProperty({ type: [SyncPatrolEventDto] })
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SyncPatrolEventDto)
  events: SyncPatrolEventDto[] = [];
}

export class SyncPatrolEventResultDto {
  @ApiProperty({ format: 'uuid' })
  localId: string = '';

  @ApiProperty({ format: 'uuid' })
  serverId: string = '';

  @ApiProperty({ enum: SYNC_PATROL_EVENT_STATUSES })
  status: SyncPatrolEventStatus = 'created';
}

export class SyncPatrolEventsResultDto {
  @ApiProperty({ type: [SyncPatrolEventResultDto] })
  items: SyncPatrolEventResultDto[] = [];
}
