import type { PatrolIncidentType } from '@patrol/shared';

import { apiClient } from './client';
import type { Paginated, PatrolIncident } from './types';

export type IncidentFilters = {
  shopId?: string;
  employeeId?: string;
  type?: PatrolIncidentType;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
};

export async function getIncidents(
  filters: IncidentFilters = {},
): Promise<Paginated<PatrolIncident>> {
  const response = await apiClient.get<Paginated<PatrolIncident>>('/patrols/incidents', {
    params: filters,
  });
  return response.data;
}
