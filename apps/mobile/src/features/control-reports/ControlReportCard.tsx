import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ControlReport } from '@/api/control-reports.api';
import {
  REPORT_STATUS_LABELS,
  REPORT_STATUS_TONES,
  REPORT_TYPE_LABELS,
  reportTypeIcon,
} from '@/features/control-reports/format';
import { formatDateTime } from '@/lib/format';
import { colors, radius, spacing } from '@/theme';
import { AppText, Badge, Card } from '@/ui';

function ControlReportCardComponent({
  report,
  onPress,
}: {
  report: ControlReport;
  onPress: (report: ControlReport) => void;
}): React.ReactElement {
  const cancelled = report.status === 'cancelled';

  return (
    <Card style={styles.card} onPress={() => onPress(report)}>
      <View style={[styles.icon, cancelled && styles.iconCancelled]}>
        <Ionicons
          name={reportTypeIcon(report.reportType)}
          size={22}
          color={cancelled ? colors.danger : colors.primary}
        />
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <AppText variant="label" numberOfLines={2} style={styles.title}>
            {REPORT_TYPE_LABELS[report.reportType]}
          </AppText>
          <Badge
            compact
            label={REPORT_STATUS_LABELS[report.status]}
            tone={REPORT_STATUS_TONES[report.status]}
          />
        </View>
        <MetaRow icon="storefront-outline" value={report.shop.name ?? 'Магазин не указан'} />
        <MetaRow
          icon="shield-checkmark-outline"
          value={report.employee.fullName ?? 'Сотрудник не указан'}
        />
        {report.comment ? <MetaRow icon="chatbox-outline" value={report.comment} /> : null}
        <View style={styles.bottomMeta}>
          <View style={styles.dateRow}>
            <Ionicons name="time-outline" size={15} color={colors.textMuted} />
            <AppText variant="caption" muted style={styles.dateText}>
              {formatDateTime(report.submittedAt ?? report.createdAt)}
            </AppText>
          </View>
          {report.files.length > 0 ? (
            <View style={styles.filesRow}>
              <Ionicons name="images-outline" size={15} color={colors.textMuted} />
              <AppText variant="caption" muted style={styles.filesText}>
                {report.files.length}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Card>
  );
}

function MetaRow({
  icon,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
}): React.ReactElement {
  return (
    <View style={styles.metaRow}>
      <Ionicons name={icon} size={15} color={colors.textMuted} />
      <AppText variant="caption" muted numberOfLines={1} style={styles.metaText}>
        {value}
      </AppText>
    </View>
  );
}

export const ControlReportCard = memo(ControlReportCardComponent);

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  icon: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.sm,
    height: 44,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 44,
  },
  iconCancelled: {
    backgroundColor: colors.dangerSurface,
  },
  content: {
    flex: 1,
    marginRight: spacing.sm,
    minWidth: 0,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  metaText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  bottomMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  dateRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
  },
  dateText: {
    marginLeft: spacing.sm,
  },
  filesRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginLeft: spacing.sm,
  },
  filesText: { marginLeft: spacing.xs },
});
