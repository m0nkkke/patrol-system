import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

import { getSchedulePlan } from '@/api/patrols.api';
import {
  clearSchedulePlanNotifications,
  reconcileSchedulePlan,
} from '@/features/notifications/schedule-plan';
import { useAuthStore } from '@/store/auth-store';

const PLAN_DAYS = 7;
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function useSchedulePlan(): void {
  const status = useAuthStore((state) => state.status);
  const role = useAuthStore((state) => state.user?.role);
  const enabled = status === 'authenticated' && role === 'security_guard';
  const plan = useQuery({
    queryKey: ['schedule-plan', PLAN_DAYS],
    queryFn: () => getSchedulePlan(PLAN_DAYS),
    enabled,
    staleTime: 15 * 60 * 1000,
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  useEffect(() => {
    if (plan.data) {
      void reconcileSchedulePlan(plan.data);
    }
  }, [plan.data]);

  useEffect(() => {
    if (status === 'unauthenticated' || (status === 'authenticated' && role !== 'security_guard')) {
      void clearSchedulePlanNotifications();
    }
  }, [role, status]);
}
