import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import {
  PATROL_POINT_VISIT_STATUSES,
  PatrolPointVisitStatus,
} from '../enums/patrol-point-visit-status';
import { PATROL_SCAN_ACTIONS, PatrolScanAction } from '../enums/patrol-scan-action';
import { PatrolStatus } from '../enums/patrol-status';

export const NFC_WAIT_MODES = [
  'waiting_for_nfc',
  'waiting_for_departure',
  'completed',
  'inactive',
] as const;

export type NfcWaitMode = (typeof NFC_WAIT_MODES)[number];

export class NfcWaitExpectedPointDto {
  @ApiProperty({ format: 'uuid' })
  id: string = '';

  @ApiProperty()
  name: string = '';

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  sortOrder: number = 0;

  @ApiPropertyOptional({ format: 'uuid' })
  photoFileId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  nfcTagId?: string;
}

export class NfcWaitStateDto {
  @ApiProperty({ enum: NFC_WAIT_MODES })
  mode: NfcWaitMode = 'inactive';

  @ApiProperty({ format: 'uuid' })
  patrolId: string = '';

  @ApiProperty({ format: 'uuid' })
  shopId: string = '';

  @ApiPropertyOptional({ format: 'uuid' })
  routeId?: string;

  @ApiProperty({ enum: ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'] })
  status: PatrolStatus = 'pending';

  @ApiProperty()
  scannedPoints: number = 0;

  @ApiProperty()
  totalPoints: number = 0;

  @ApiProperty()
  canAcceptNfc: boolean = false;

  @ApiProperty()
  requiresForegroundNfcListening: boolean = true;

  @ApiProperty({
    description: 'Minimum required dwell time configured for this point in the route',
    maximum: 120,
    minimum: 0,
  })
  pointDwellSeconds: number = 0;

  @ApiPropertyOptional({ type: NfcWaitExpectedPointDto })
  expectedPoint?: NfcWaitExpectedPointDto;

  @ApiPropertyOptional({ enum: PATROL_SCAN_ACTIONS })
  expectedScanAction?: PatrolScanAction;

  @ApiPropertyOptional({ enum: PATROL_POINT_VISIT_STATUSES })
  pointVisitStatus?: PatrolPointVisitStatus;

  @ApiPropertyOptional({ format: 'date-time' })
  lockedUntil?: Date;

  @ApiPropertyOptional({ minimum: 0 })
  remainingLockSeconds?: number;

  @ApiProperty({
    example: {
      endpoint: '/api/v1/mobile/patrols/{patrolId}/point-visits/scan',
      method: 'POST',
      requiredFields: ['patrolPointId', 'nfcUid', 'scannedAt', 'deviceId', 'scanAction'],
    },
  })
  scanContract: {
    endpoint: string;
    method: 'POST';
    requiredFields: string[];
  } = {
    endpoint: '/api/v1/mobile/patrols/{patrolId}/point-visits/scan',
    method: 'POST',
    requiredFields: ['patrolPointId', 'nfcUid', 'scannedAt', 'deviceId', 'scanAction'],
  };
}
