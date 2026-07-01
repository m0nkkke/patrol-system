import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { Patrol } from '@/api/types';
import { patrolStatusLabel, patrolStatusTone } from '@/features/patrol/patrol-status';
import { formatDateTime } from '@/lib/format';
import { colors, spacing } from '@/theme';
import { AppText, Badge, Card } from '@/ui';

type PatrolCardProps = {
  patrol: Patrol;
  onPress: (patrol: Patrol) => void;
  showEmployee?: boolean;
  timezone?: string;
};

function PatrolCardComponent({
  patrol,
  onPress,
  showEmployee = false,
  timezone,
}: PatrolCardProps): React.ReactElement {
  const date = formatDateTime(patrol.startedAt, timezone ?? patrol.shop?.timezone);
  const points = `${patrol.scannedPoints} / ${patrol.totalPoints} точек`;
  const title = showEmployee && patrol.employee ? patrol.employee.fullName : date;
  const meta = showEmployee && patrol.employee ? `${date} · ${points}` : points;

  return (
    <Card style={styles.card} onPress={() => onPress(patrol)}>
      <View style={styles.row}>
        <View style={styles.info}>
          <AppText variant="label">{title}</AppText>
          <AppText variant="caption" muted style={styles.meta}>
            {meta}
          </AppText>
          <View style={styles.statusRow}>
            <Badge label={patrolStatusLabel(patrol.status)} tone={patrolStatusTone(patrol.status)} />
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </View>
    </Card>
  );
}

export const PatrolCard = memo(PatrolCardComponent);

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  info: {
    flex: 1,
    marginRight: spacing.md,
  },
  meta: {
    marginTop: spacing.xs,
  },
  statusRow: {
    marginTop: spacing.sm,
  },
});
