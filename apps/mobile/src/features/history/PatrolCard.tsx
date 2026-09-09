import { memo } from 'react';

import type { Patrol } from '@/api/types';
import { formatDateTime, formatDuration } from '@/lib/format';

import { PatrolHistoryCard } from './PatrolHistoryCard';

type PatrolCardProps = {
  patrol: Patrol;
  onPress: (patrol: Patrol) => void;
  context?: 'employee' | 'shop';
  timezone?: string;
};

function PatrolCardComponent({
  patrol,
  onPress,
  context = 'employee',
  timezone,
}: PatrolCardProps): React.ReactElement {
  const date = formatDateTime(patrol.startedAt, timezone ?? patrol.shop?.timezone);
  const points = `${patrol.scannedPoints} / ${patrol.totalPoints} точек`;
  const duration = formatDuration(
    patrol.startedAt,
    patrol.completedAt ?? patrol.cancelledAt,
  );
  const contextName =
    context === 'shop' ? patrol.employee?.fullName ?? 'Сотрудник не указан' : patrol.shop?.name ?? 'Магазин';
  const contextIcon = context === 'shop' ? 'person-outline' : 'storefront-outline';
  const routeLabel = patrol.schedule?.name ?? (patrol.routeId ? 'Маршрут обхода' : 'Без маршрута');

  return (
    <PatrolHistoryCard
      date={date}
      duration={duration}
      icon={contextIcon}
      onPress={() => onPress(patrol)}
      points={points}
      route={routeLabel}
      status={patrol.status}
      title={contextName}
    />
  );
}

export const PatrolCard = memo(PatrolCardComponent);
