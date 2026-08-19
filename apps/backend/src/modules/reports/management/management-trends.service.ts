import { Injectable } from '@nestjs/common';
import { ManagementTrendsQueryDto } from '@patrol/shared';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import {
  ManagementTrendBucket,
  ManagementTrendRaw,
  ManagementTrendsRepository,
} from './management-trends.repository';

type ManagementTrendPoint = {
  bucketStart: string;
  metrics: {
    attentionPatrols: number;
    attentionRate: number;
    averageCompletionSeconds: number | null;
    cleanPatrolRate: number;
    cleanPatrols: number;
    completedPatrols: number;
    completionRate: number;
    onTimePatrols: number;
    onTimeRate: number;
    plannedPatrols: number;
    submittedReports: number;
  };
};

type ManagementTrendsResponse = {
  bucket: ManagementTrendBucket;
  items: ManagementTrendPoint[];
  period: {
    from: string | null;
    to: string | null;
  };
  schemaVersion: '1.0';
  scope: {
    regionId: string | null;
    shopId: string | null;
  };
  sourceService: 'patrol';
};

@Injectable()
export class ManagementTrendsService {
  constructor(private readonly trendsRepository: ManagementTrendsRepository) {}

  async getTrends(
    query: ManagementTrendsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ManagementTrendsResponse> {
    if (actor.role !== 'admin') {
      throw new DomainValidationError(
        'MANAGEMENT_TRENDS_FORBIDDEN',
        'User cannot access management trends',
      );
    }

    const bucket = query.bucket ?? 'day';
    const rows = await this.trendsRepository.findTrends(query, bucket);

    return {
      bucket,
      items: rows.map(toTrendPoint),
      period: {
        from: query.from ?? null,
        to: query.to ?? null,
      },
      schemaVersion: '1.0',
      scope: {
        regionId: query.regionId ?? null,
        shopId: query.shopId ?? null,
      },
      sourceService: 'patrol',
    };
  }
}

function toTrendPoint(raw: ManagementTrendRaw): ManagementTrendPoint {
  const plannedPatrols = toNumber(raw.planned_patrols);
  const completedPatrols = toNumber(raw.completed_patrols);
  const onTimePatrols = toNumber(raw.on_time_patrols);
  const cleanPatrols = toNumber(raw.clean_patrols);
  const attentionPatrols = toNumber(raw.attention_patrols);

  return {
    bucketStart: toDate(raw.bucket_start).toISOString(),
    metrics: {
      attentionPatrols,
      attentionRate: ratio(attentionPatrols, plannedPatrols),
      averageCompletionSeconds:
        raw.average_completion_seconds === null
          ? null
          : Math.round(Number(raw.average_completion_seconds)),
      cleanPatrolRate: ratio(cleanPatrols, completedPatrols),
      cleanPatrols,
      completedPatrols,
      completionRate: ratio(completedPatrols, plannedPatrols),
      onTimePatrols,
      onTimeRate: ratio(onTimePatrols, completedPatrols),
      plannedPatrols,
      submittedReports: toNumber(raw.submitted_reports),
    },
  };
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toNumber(value: string | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));
}
