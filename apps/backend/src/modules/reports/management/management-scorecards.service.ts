import { Injectable } from '@nestjs/common';
import { ManagementScorecardsQueryDto } from '@patrol/shared';

import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainValidationError } from '../../../common/errors/domain-validation.error';
import {
  ManagementScorecardRaw,
  ManagementScorecardsRepository,
  ScorecardSort,
} from './management-scorecards.repository';

type ManagementShopScorecard = {
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
  regionId: string | null;
  shopId: string;
  shopName: string;
  status: 'attention' | 'green';
};

type ManagementShopScorecardsResponse = {
  items: ManagementShopScorecard[];
  meta: {
    limit: number;
    page: number;
    total: number;
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
export class ManagementScorecardsService {
  constructor(private readonly scorecardsRepository: ManagementScorecardsRepository) {}

  async getShopScorecards(
    query: ManagementScorecardsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ManagementShopScorecardsResponse> {
    if (actor.role !== 'admin') {
      throw new DomainValidationError(
        'MANAGEMENT_SCORECARDS_FORBIDDEN',
        'User cannot access management scorecards',
      );
    }

    const page = normalizePositiveInteger(query.page, 1);
    const limit = Math.min(normalizePositiveInteger(query.limit, 50), 500);
    const sort = query.sort ?? 'shopName:asc';
    const result = await this.scorecardsRepository.findScorecards(query, {
      limit,
      offset: (page - 1) * limit,
      sort,
    });

    return {
      items: result.items.map(toScorecard),
      meta: {
        limit,
        page,
        total: result.total,
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

  async getShopScorecardsForExport(
    query: ManagementScorecardsQueryDto,
    actor: AuthenticatedUser,
  ): Promise<ManagementShopScorecardsResponse> {
    return this.getShopScorecards(
      {
        ...query,
        limit: 500,
        page: 1,
      },
      actor,
    );
  }
}

function toScorecard(raw: ManagementScorecardRaw): ManagementShopScorecard {
  const plannedPatrols = toNumber(raw.planned_patrols);
  const completedPatrols = toNumber(raw.completed_patrols);
  const onTimePatrols = toNumber(raw.on_time_patrols);
  const cleanPatrols = toNumber(raw.clean_patrols);
  const attentionPatrols = toNumber(raw.attention_patrols);

  return {
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
    regionId: raw.region_id,
    shopId: raw.shop_id,
    shopName: raw.shop_name,
    status:
      attentionPatrols > 0 || (plannedPatrols > 0 && completedPatrols < plannedPatrols)
        ? 'attention'
        : 'green',
  };
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  const numeric = Number(value);

  return Number.isInteger(numeric) && numeric > 0 ? numeric : fallback;
}

function toNumber(value: string | null | undefined): number {
  return value === null || value === undefined ? 0 : Number(value);
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Number((numerator / denominator).toFixed(4));
}
