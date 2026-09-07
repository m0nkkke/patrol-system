import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import type { Dispatch, SetStateAction } from 'react';

export function useUrlFilters<T extends Record<string, string>>(
  key: 'patrols' | 'incidents' | 'reports',
  defaults: T,
): [T, Dispatch<SetStateAction<T>>] {
  const search = useSearch({ strict: false });
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  let stored: Record<string, unknown> = {};
  try {
    const decoded: unknown = JSON.parse(search.filters ?? '{}');
    if (decoded && typeof decoded === 'object' && key in decoded) {
      const value: unknown = (decoded as Record<string, unknown>)[key];
      if (value && typeof value === 'object') stored = value as Record<string, unknown>;
    }
  } catch {
    /* Malformed links fall back to the default filters. */
  }
  const filters = { ...defaults };
  for (const field of Object.keys(defaults) as Array<keyof T>) {
    if (typeof stored[String(field)] === 'string')
      filters[field] = stored[String(field)] as T[keyof T];
  }
  const setFilters: Dispatch<SetStateAction<T>> = (action) => {
    const next = typeof action === 'function' ? action(filters) : action;
    const options = { search: { filters: JSON.stringify({ [key]: next }) }, replace: true };
    if (key === 'patrols' && params.patrolId)
      void navigate({
        ...options,
        to: '/patrols/$patrolId',
        params: { patrolId: params.patrolId },
      });
    else if (key === 'incidents' && params.incidentId)
      void navigate({
        ...options,
        to: '/incidents/$incidentId',
        params: { incidentId: params.incidentId },
      });
    else if (key === 'reports' && params.reportId)
      void navigate({
        ...options,
        to: '/reports/$reportId',
        params: { reportId: params.reportId },
      });
    else
      void navigate({
        ...options,
        to: ({ patrols: '/patrols', incidents: '/incidents', reports: '/reports' } as const)[key],
      });
  };
  return [filters, setFilters];
}
