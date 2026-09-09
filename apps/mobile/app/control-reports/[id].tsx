import type { PatrolReportStatus } from '@patrol/shared';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import type { ControlReportFile } from '@/api/control-reports.api';
import { describeError } from '@/api/error-messages';
import {
  formatReportField,
  reportFieldLabel,
  REPORT_PERIOD_LABELS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_TONES,
  REPORT_TYPE_LABELS,
  reportTypeIcon,
} from '@/features/control-reports/format';
import { useControlReport } from '@/features/control-reports/queries';
import { formatDateTime } from '@/lib/format';
import { colors, radius, screenInsets, spacing } from '@/theme';
import {
  AppText,
  AsyncStateScreen,
  Badge,
  Button,
  Card,
  DetailRow,
  Header,
  ProtectedImage,
  Screen,
} from '@/ui';

export default function ControlReportDetailsScreen(): React.ReactElement {
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const report = useControlReport(id);

  if (report.isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }
  if (report.isError || !report.data) {
    return (
      <AsyncStateScreen
        message={describeError(report.error)}
        onBack={() => router.back()}
        onRetry={() => void report.refetch()}
      />
    );
  }

  const item = report.data;
  const fields = Object.entries(item.fields);
  const presentation = reportStatusPresentation(item.status);

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Header title="Операционный отчёт" onBack={() => router.back()} />

        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={[styles.heroIcon, { backgroundColor: presentation.background }]}>
              <Ionicons name={reportTypeIcon(item.reportType)} size={28} color={presentation.color} />
            </View>
            <View style={styles.heroContent}>
              <AppText variant="heading" numberOfLines={3}>
                {REPORT_TYPE_LABELS[item.reportType]}
              </AppText>
              <AppText variant="caption" muted style={styles.heroDate}>
                Создан {formatDateTime(item.createdAt)}
              </AppText>
              <View style={styles.heroBadge}>
                <Badge
                  compact
                  icon={presentation.icon}
                  label={REPORT_STATUS_LABELS[item.status]}
                  tone={REPORT_STATUS_TONES[item.status]}
                />
              </View>
            </View>
          </View>
        </Card>

        <SectionTitle title="Основные данные" />
        <Card style={styles.detailsCard}>
          <DetailRow
            first
            icon="storefront-outline"
            label="Магазин"
            value={item.shop.name ?? 'Не указан'}
          />
          <DetailRow
            icon="shield-checkmark-outline"
            label="Сотрудник контроля"
            value={item.employee.fullName ?? 'Не указан'}
          />
          <DetailRow
            icon="flag-outline"
            label="Статус"
            value={REPORT_STATUS_LABELS[item.status]}
          />
          {item.submittedAt ? (
            <DetailRow
              icon="send-outline"
              label="Отправлен"
              value={formatDateTime(item.submittedAt)}
            />
          ) : null}
          {item.period ? (
            <DetailRow
              icon="time-outline"
              label="Период"
              value={REPORT_PERIOD_LABELS[item.period]}
            />
          ) : null}
          {item.route ? (
            <DetailRow
              icon="git-network-outline"
              label="Маршрут"
              value={item.route.name ?? item.route.id}
            />
          ) : null}
          {item.schedule ? (
            <DetailRow
              icon="calendar-outline"
              label="Расписание"
              value={item.schedule.name ?? item.schedule.id}
            />
          ) : null}
        </Card>

        {item.comment ? (
          <MessageCard
            icon="chatbox-ellipses-outline"
            title="Комментарий сотрудника"
            text={item.comment}
            tone="info"
          />
        ) : null}
        {item.cancellationReason ? (
          <MessageCard
            icon="close-circle-outline"
            title="Причина отмены"
            text={item.cancellationReason}
            tone="danger"
          />
        ) : null}

        {fields.length > 0 ? (
          <View style={styles.section}>
            <SectionTitle title="Данные отчёта" nested />
            <Card style={styles.detailsCard}>
              {fields.map(([key, value], index) => (
                <DetailRow
                  key={key}
                  icon="list-outline"
                  label={reportFieldLabel(key)}
                  value={formatReportField(value)}
                  first={index === 0}
                />
              ))}
            </Card>
          </View>
        ) : null}

        {item.files.length > 0 ? (
          <View style={styles.section}>
            <SectionTitle title={`Фотографии · ${item.files.length}`} nested />
            {item.files.map((file) => (
              <View key={file.id} style={styles.photoBlock}>
                <ProtectedImage
                  fileId={file.id}
                  style={styles.photo}
                  resizeMode="contain"
                  accessibilityLabel={file.originalName ?? 'Фотография операционного отчёта'}
                />
                <View style={styles.fileMeta}>
                  <Ionicons name="image-outline" size={16} color={colors.textMuted} />
                  <View style={styles.fileCopy}>
                    <AppText variant="caption" numberOfLines={1} style={styles.fileName}>
                      {file.originalName ?? `Фотография ${file.id.slice(0, 8)}`}
                    </AppText>
                    <AppText variant="caption" muted style={styles.fileDetails}>
                      {formatFileDetails(file)}
                    </AppText>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {item.patrolId ? (
          <View style={styles.button}>
            <Button
              label="Перейти к обходу"
              icon="arrow-forward-circle-outline"
              onPress={() =>
                router.navigate({ pathname: '/control-patrols/[id]', params: { id: item.patrolId as string } })
              }
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function SectionTitle({
  nested = false,
  title,
}: {
  nested?: boolean;
  title: string;
}): React.ReactElement {
  return (
    <AppText
      variant="label"
      style={[styles.sectionTitle, !nested && styles.sectionTitleStandalone]}
    >
      {title}
    </AppText>
  );
}

function MessageCard({
  icon,
  text,
  title,
  tone,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  title: string;
  tone: 'danger' | 'info';
}): React.ReactElement {
  const danger = tone === 'danger';
  const color = danger ? colors.danger : colors.primary;

  return (
    <View
      style={[
        styles.messageCard,
        {
          backgroundColor: danger ? colors.dangerSurface : colors.controlSurface,
          borderColor: danger ? '#fecaca' : colors.controlBorder,
        },
      ]}
    >
      <Ionicons name={icon} size={21} color={color} />
      <View style={styles.messageCopy}>
        <AppText variant="label">{title}</AppText>
        <AppText variant="body" style={styles.messageText}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

function reportStatusPresentation(status: PatrolReportStatus): {
  background: string;
  color: string;
  icon: 'checkmark-circle-outline' | 'close-circle-outline' | 'create-outline';
} {
  if (status === 'submitted') {
    return {
      background: colors.successBackground,
      color: colors.success,
      icon: 'checkmark-circle-outline',
    };
  }
  if (status === 'cancelled') {
    return {
      background: colors.dangerSurface,
      color: colors.danger,
      icon: 'close-circle-outline',
    };
  }
  return {
    background: colors.iconBlueBackground,
    color: colors.primary,
    icon: 'create-outline',
  };
}

function formatFileDetails(file: ControlReportFile): string {
  const dimensions =
    file.width !== null && file.height !== null ? `${file.width} × ${file.height}` : null;
  const size =
    file.sizeBytes >= 1024 * 1024
      ? `${(file.sizeBytes / (1024 * 1024)).toFixed(1)} МБ`
      : `${Math.round(file.sizeBytes / 1024)} КБ`;
  return [dimensions, size].filter(Boolean).join(' · ');
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  errorText: { marginBottom: spacing.lg, textAlign: 'center' },
  heroCard: {
    padding: spacing.lg,
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  heroIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 58,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 58,
  },
  heroContent: {
    flex: 1,
    minWidth: 0,
  },
  heroDate: {
    marginTop: spacing.xs,
  },
  heroBadge: {
    marginTop: spacing.sm,
  },
  detailsCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
  },
  messageCard: {
    alignItems: 'flex-start',
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  messageCopy: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  messageText: {
    marginTop: spacing.sm,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  sectionTitleStandalone: {
    marginTop: spacing.xl,
  },
  photoBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  photo: { aspectRatio: 4 / 3, width: '100%' },
  fileMeta: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    padding: spacing.md,
  },
  fileCopy: {
    flex: 1,
    marginLeft: spacing.sm,
    minWidth: 0,
  },
  fileName: {
    fontWeight: '600',
  },
  fileDetails: {
    marginTop: spacing.xs,
  },
  button: {
    marginTop: spacing.xl,
  },
});
