import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

import { useNetworkStatus } from '@/lib/use-network-status';
import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { type DataStatusKind, resolveDataStatus } from './data-status';

type DataStatusBarProps = {
  hasRefreshError: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  updatedAt: number;
};

const STATUS_VISUALS: Record<
  DataStatusKind,
  {
    background: string;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  checking: {
    background: colors.surfaceMuted,
    color: colors.textMuted,
    icon: 'ellipsis-horizontal',
  },
  current: {
    background: colors.successBackground,
    color: colors.success,
    icon: 'checkmark',
  },
  error: {
    background: colors.dangerSurface,
    color: colors.danger,
    icon: 'alert-circle-outline',
  },
  offline: {
    background: colors.iconOrangeBackground,
    color: colors.warning,
    icon: 'cloud-offline-outline',
  },
  refreshing: {
    background: colors.controlSurface,
    color: colors.primary,
    icon: 'sync-outline',
  },
};

function formatUpdatedAt(updatedAt: number): string {
  if (!updatedAt) {
    return '—';
  }
  const updated = new Date(updatedAt);
  if (Number.isNaN(updated.getTime())) {
    return '—';
  }
  const now = new Date();
  const time = updated.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  const isToday =
    updated.getFullYear() === now.getFullYear() &&
    updated.getMonth() === now.getMonth() &&
    updated.getDate() === now.getDate();

  if (isToday) {
    return time;
  }
  const date = updated.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  return `${date}, ${time}`;
}

export function DataStatusBar({
  hasRefreshError,
  isRefreshing,
  onRefresh,
  updatedAt,
}: DataStatusBarProps): React.ReactElement {
  const networkStatus = useNetworkStatus();
  const status = resolveDataStatus({ hasRefreshError, isRefreshing, networkStatus });
  const visual = STATUS_VISUALS[status.kind];
  const updatedTime = formatUpdatedAt(updatedAt);
  const refreshDisabled = isRefreshing || networkStatus === 'offline';

  return (
    <View style={styles.container}>
      <View style={styles.state}>
        <View style={[styles.stateIcon, { backgroundColor: visual.background }]}>
          <Ionicons name={visual.icon} size={14} color={visual.color} />
        </View>
        <AppText
          variant="caption"
          muted
          style={[styles.statusText, styles.stateText]}
        >
          {status.label}
        </AppText>
      </View>

      <View style={styles.updated}>
        <AppText variant="caption" muted numberOfLines={1} style={styles.statusText}>
          Обновлено: {updatedTime}
        </AppText>
        <TouchableOpacity
          accessibilityLabel="Обновить данные"
          accessibilityRole="button"
          accessibilityState={{ disabled: refreshDisabled }}
          activeOpacity={0.7}
          disabled={refreshDisabled}
          onPress={onRefresh}
          style={[styles.refreshButton, refreshDisabled && styles.refreshButtonDisabled]}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="refresh" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  state: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    minWidth: 0,
  },
  stateIcon: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  stateText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  statusText: {
    fontSize: 12,
    lineHeight: 16,
  },
  updated: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: spacing.sm,
  },
  refreshButton: {
    alignItems: 'center',
    backgroundColor: colors.controlSurface,
    borderRadius: radius.md,
    height: 40,
    justifyContent: 'center',
    marginLeft: spacing.sm,
    width: 40,
  },
  refreshButtonDisabled: {
    opacity: 0.55,
  },
});
