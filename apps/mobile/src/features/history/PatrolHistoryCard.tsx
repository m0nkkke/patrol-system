import { Ionicons } from '@expo/vector-icons';
import type { PatrolStatus } from '@patrol/shared';
import { StyleSheet, View } from 'react-native';

import { patrolStatusLabel, patrolStatusTone } from '@/features/patrol/patrol-status';
import { appIcons, colors, radius, spacing } from '@/theme';
import { AppText, Badge, Card } from '@/ui';

type PatrolHistoryCardProps = {
  date: string;
  detail?: string;
  duration: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  points: string;
  route: string;
  status: PatrolStatus;
  subtitle?: string;
  title: string;
};

export function PatrolHistoryCard({
  date,
  detail,
  duration,
  icon,
  onPress,
  points,
  route,
  status,
  subtitle,
  title,
}: PatrolHistoryCardProps): React.ReactElement {
  return (
    <Card style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.summary}>
          <AppText variant="caption" numberOfLines={2} style={styles.date}>
            {date}
          </AppText>
          <AppText variant="caption" muted style={styles.summaryLabel}>
            Длительность
          </AppText>
          <AppText variant="caption" style={styles.duration}>
            {duration}
          </AppText>
        </View>

        <View style={styles.divider} />

        <View style={styles.info}>
          <View style={styles.contextRow}>
            <View style={styles.contextIcon}>
              <Ionicons name={icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.contextCopy}>
              <AppText variant="caption" numberOfLines={2} style={styles.contextName}>
                {title}
              </AppText>
              {subtitle ? (
                <AppText variant="caption" muted numberOfLines={1} style={styles.subtitle}>
                  {subtitle}
                </AppText>
              ) : null}
            </View>
          </View>
          <AppText variant="caption" muted numberOfLines={1} style={styles.meta}>
            {route}
          </AppText>
          <AppText variant="caption" muted style={styles.points}>
            {points}
          </AppText>
          {detail ? (
            <AppText variant="caption" muted numberOfLines={1} style={styles.detail}>
              {detail}
            </AppText>
          ) : null}
          <View style={styles.statusRow}>
            <Badge
              compact
              icon={statusIconFor(status)}
              label={patrolStatusLabel(status)}
              tone={patrolStatusTone(status)}
            />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

function statusIconFor(status: PatrolStatus): keyof typeof Ionicons.glyphMap {
  switch (status) {
    case 'completed':
      return 'checkmark-circle-outline';
    case 'overdue':
      return 'time-outline';
    case 'cancelled':
      return 'close-circle-outline';
    default:
      return appIcons.patrol;
  }
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  summary: {
    flexBasis: 102,
    flexShrink: 0,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
  },
  summaryLabel: {
    fontSize: 13,
    marginTop: spacing.sm,
  },
  duration: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  divider: {
    alignSelf: 'stretch',
    backgroundColor: colors.border,
    marginHorizontal: spacing.sm,
    width: StyleSheet.hairlineWidth,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  contextRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  contextIcon: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.sm,
    height: 34,
    justifyContent: 'center',
    marginRight: spacing.sm,
    width: 34,
  },
  contextCopy: {
    flex: 1,
    minWidth: 0,
  },
  contextName: {
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  meta: {
    fontSize: 13,
    marginTop: spacing.sm,
  },
  points: {
    fontSize: 13,
    marginTop: spacing.xs,
  },
  detail: {
    fontSize: 12,
    marginTop: spacing.xs,
  },
  statusRow: {
    marginTop: spacing.sm,
  },
});
