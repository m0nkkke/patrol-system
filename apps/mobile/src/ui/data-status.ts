import type { NetworkStatus } from '@/lib/use-network-status';

export type DataStatusKind = 'checking' | 'current' | 'error' | 'offline' | 'refreshing';

export type DataStatus = {
  kind: DataStatusKind;
  label: string;
};

export function resolveDataStatus({
  hasRefreshError,
  isRefreshing,
  networkStatus,
}: {
  hasRefreshError: boolean;
  isRefreshing: boolean;
  networkStatus: NetworkStatus;
}): DataStatus {
  if (networkStatus === 'offline') {
    return { kind: 'offline', label: 'Нет сети — показаны сохранённые данные' };
  }
  if (isRefreshing) {
    return { kind: 'refreshing', label: 'Обновление данных...' };
  }
  if (hasRefreshError) {
    return { kind: 'error', label: 'Не удалось обновить данные' };
  }
  if (networkStatus === 'unknown') {
    return { kind: 'checking', label: 'Проверка соединения...' };
  }
  return { kind: 'current', label: 'Все данные актуальны' };
}
