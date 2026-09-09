import { memo } from 'react';

import type { ControlPatrolSummary } from '@/api/control-patrols.api';
import { PatrolHistoryCard } from '@/features/history/PatrolHistoryCard';
import { formatDateTime, formatDurationMinutes } from '@/lib/format';

function ControlPatrolCardComponent({
  patrol,
  onPress,
}: {
  patrol: ControlPatrolSummary;
  onPress: (patrol: ControlPatrolSummary) => void;
}): React.ReactElement {
  const detail =
    patrol.incidentCount > 0 || patrol.reportCount > 0
      ? `Нарушений: ${patrol.incidentCount} · отчётов: ${patrol.reportCount}`
      : undefined;

  return (
    <PatrolHistoryCard
      date={formatDateTime(patrol.startedAt ?? undefined)}
      detail={detail}
      duration={formatDurationMinutes(patrol.durationSeconds)}
      icon="storefront-outline"
      onPress={() => onPress(patrol)}
      points={`${patrol.progress.scannedPoints} / ${patrol.progress.totalPoints} точек`}
      route={patrol.route.name ?? 'Маршрут не указан'}
      status={patrol.status}
      subtitle={patrol.employee.fullName ?? 'Сотрудник не указан'}
      title={patrol.shop.name ?? 'Магазин не указан'}
    />
  );
}

export const ControlPatrolCard = memo(ControlPatrolCardComponent);
