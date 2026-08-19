import { Injectable } from '@nestjs/common';
import { ManagementBreakdownQueryDto } from '@patrol/shared';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import {
  ManagementBreakdownGroupBy,
  ManagementBreakdownRaw,
  ManagementBreakdownRepository,
} from './management-breakdown.repository';

type ManagementBreakdownItem = {
  groupKey: string;
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

type ManagementBreakdownResponse = {
  groupBy: ManagementBreakdownGroupBy;
  items: ManagementBreakdownItem[];
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
export class ManagementBreakdownService {
  constructor(private readonly breakdownRepository: ManagementBreakdownRepository) {}

  async getBreakdown(
    query: ManagementBreakdownQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ManagementBreakdownResponse> {
    if (actor.role !== 'admin') {
      throw new DomainValidationError(
        'MANAGEMENT_BREAKDOWN_FORBIDDEN',
        'User cannot access management breakdown',
      );
    }

    const groupBy = query.groupBy ?? 'routeCategory';
    const rows = await this.breakdownRepository.findBreakdown(query, groupBy);
    const rowByKey = new Map(rows.map((row) => [row.group_key, row]));

    return {
      groupBy,
      items: getExpectedKeys(groupBy).map((key) =>
        toBreakdownItem(rowByKey.get(key) ?? createEmptyRaw(key)),
      ),
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

function getExpectedKeys(groupBy: ManagementBreakdownGroupBy): string[] {
  return groupBy === 'period'
    ? ['morning', 'noon', 'evening']
    : ['internal', 'external'];
}

function createEmptyRaw(groupKey: string): ManagementBreakdownRaw {
  return {
    attention_patrols: '0',
    average_completion_seconds: null,
    clean_patrols: '0',
    completed_patrols: '0',
    group_key: groupKey,
    on_time_patrols: '0',
    planned_patrols: '0',
    submitted_reports: '0',
  };
}

function toBreakdownItem(raw: ManagementBreakdownRaw): ManagementBreakdownItem {
  const plannedPatrols = toNumber(raw.planned_patrols);
  const completedPatrols = toNumber(raw.completed_patrols);
  const onTimePatrols = toNumber(raw.on_time_patrols);
  const cleanPatrols = toNumber(raw.clean_patrols);
  const attentionPatrols = toNumber(raw.attention_patrols);

  return {
    groupKey: raw.group_key,
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

function toNumber(value: string | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));
}
