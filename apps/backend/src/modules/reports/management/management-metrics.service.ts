import { Injectable } from '@nestjs/common';
import { ManagementMetricsQueryDto } from '@patrol/shared';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import { ManagementMetricsRepository } from './management-metrics.repository';

type ManagementMetricsResponse = {
  metrics: {
    attentionPatrols: number;
    attentionRate: number;
    attentionShopCount: number;
    averageCompletionSeconds: number | null;
    cleanPatrolRate: number;
    cleanPatrols: number;
    completedPatrols: number;
    completionRate: number;
    greenShopCount: number;
    onTimePatrols: number;
    onTimeRate: number;
    plannedPatrols: number;
    submittedReports: number;
  };
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
export class ManagementMetricsService {
  constructor(private readonly metricsRepository: ManagementMetricsRepository) {}

  async getMetrics(
    query: ManagementMetricsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ManagementMetricsResponse> {
    if (actor.role !== 'admin') {
      throw new DomainValidationError(
        'MANAGEMENT_METRICS_FORBIDDEN',
        'User cannot access management metrics',
      );
    }

    const raw = await this.metricsRepository.getMetrics(query);
    const plannedPatrols = toNumber(raw.planned_patrols);
    const completedPatrols = toNumber(raw.completed_patrols);
    const onTimePatrols = toNumber(raw.on_time_patrols);
    const cleanPatrols = toNumber(raw.clean_patrols);
    const attentionPatrols = toNumber(raw.attention_patrols);

    return {
      metrics: {
        attentionPatrols,
        attentionRate: ratio(attentionPatrols, plannedPatrols),
        attentionShopCount: toNumber(raw.attention_shop_count),
        averageCompletionSeconds:
          raw.average_completion_seconds === null
            ? null
            : Math.round(Number(raw.average_completion_seconds)),
        cleanPatrolRate: ratio(cleanPatrols, completedPatrols),
        cleanPatrols,
        completedPatrols,
        completionRate: ratio(completedPatrols, plannedPatrols),
        greenShopCount: toNumber(raw.green_shop_count),
        onTimePatrols,
        onTimeRate: ratio(onTimePatrols, completedPatrols),
        plannedPatrols,
        submittedReports: toNumber(raw.submitted_reports),
      },
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

function toNumber(value: string | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));
}
