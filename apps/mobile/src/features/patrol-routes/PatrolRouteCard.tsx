import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PatrolRoute } from '@/api/patrol-routes.api';
import { appIcons, colors, spacing } from '@/theme';
import { AppText, Card, EntityIcon, StatusLabel } from '@/ui';

import { DEFAULT_PATROL_POINT_DWELL_SECONDS } from './route-point-settings';

type PatrolRouteCardProps = {
  route: PatrolRoute;
  onPress: (route: PatrolRoute) => void;
};

function PatrolRouteCardComponent({ route, onPress }: PatrolRouteCardProps): React.ReactElement {
  const pointCount = route.points?.length ?? 0;
  const totalDwellSeconds = (route.points ?? []).reduce(
    (total, point) => total + (point.dwellSeconds ?? DEFAULT_PATROL_POINT_DWELL_SECONDS),
    0,
  );

  return (
    <Card style={styles.card} onPress={() => onPress(route)}>
      <View style={styles.row}>
        <EntityIcon
          icon={route.category === 'internal' ? 'business-outline' : appIcons.externalRoute}
          tone={route.isActive ? 'primary' : 'neutral'}
        />
        <View style={styles.content}>
          <AppText variant="label" muted={!route.isActive} numberOfLines={2}>
            {route.name}
          </AppText>
          <View style={styles.metaRow}>
            <Ionicons name="layers-outline" size={14} color={colors.textMuted} />
            <AppText variant="caption" muted style={styles.metaText}>
              {route.category === 'internal' ? 'Внутренний' : 'Внешний'}
            </AppText>
          </View>
          <View style={styles.facts}>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={colors.textMuted} />
              <AppText variant="caption" muted style={styles.metaText}>
                {pointCount} {pointLabel(pointCount)}
              </AppText>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="timer-outline" size={14} color={colors.textMuted} />
              <AppText variant="caption" muted style={styles.metaText}>
                {formatDwell(totalDwellSeconds)}
              </AppText>
            </View>
          </View>
        </View>
        <View style={styles.trailing}>
          <StatusLabel
            label={route.isActive ? 'Активен' : 'В архиве'}
            tone={route.isActive ? 'success' : 'neutral'}
          />
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </View>
      </View>
    </Card>
  );
}

function formatDwell(totalSeconds: number): string {
  if (totalSeconds < 60) {
    return `${totalSeconds} сек.`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return seconds === 0 ? `${minutes} мин.` : `${minutes} мин. ${seconds} сек.`;
}

function pointLabel(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'точек';
  if (last === 1) return 'точка';
  if (last >= 2 && last <= 4) return 'точки';
  return 'точек';
}

export const PatrolRouteCard = memo(PatrolRouteCardComponent);

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    minHeight: 112,
    padding: spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  metaText: {
    marginLeft: spacing.xs,
  },
  facts: {
    columnGap: spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  trailing: {
    alignItems: 'flex-end',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    marginLeft: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
