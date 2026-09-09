import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { useControlIncident } from '@/features/control-incidents/queries';
import {
  controlIncidentDescription,
  incidentSeverityLabel,
  incidentSeverityTone,
  incidentTypeIcon,
  incidentTypeLabel,
} from '@/features/incidents/incident-type';
import { patrolStatusLabel } from '@/features/patrol/patrol-status';
import { formatDateTime, formatSeconds } from '@/lib/format';
import { colors, radius, screenInsets, spacing } from '@/theme';
import { AppText, AsyncStateScreen, Badge, Button, Card, DetailRow, Header, Screen } from '@/ui';

export default function IncidentDetailsScreen(): React.ReactElement {
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const incident = useControlIncident(id);

  if (incident.isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }
  if (incident.isError || !incident.data) {
    return (
      <AsyncStateScreen
        message={describeError(incident.error)}
        onBack={() => router.back()}
        onRetry={() => void incident.refetch()}
      />
    );
  }

  const item = incident.data;
  const critical = item.severity === 'critical';
  const accent = critical ? colors.danger : colors.iconOrange;
  const accentBackground = critical ? colors.dangerSurface : colors.iconOrangeBackground;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Header title="Нарушение" onBack={() => router.back()} />

        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={[styles.heroIcon, { backgroundColor: accentBackground }]}>
              <Ionicons name={incidentTypeIcon(item.type)} size={28} color={accent} />
            </View>
            <View style={styles.heroContent}>
              <AppText variant="heading" numberOfLines={3}>
                {incidentTypeLabel(item.type)}
              </AppText>
              <AppText variant="caption" muted style={styles.heroDate}>
                Зафиксировано {formatDateTime(item.createdAt)}
              </AppText>
              <View style={styles.heroBadge}>
                <Badge
                  compact
                  label={incidentSeverityLabel(item.severity)}
                  tone={incidentSeverityTone(item.severity)}
                />
              </View>
            </View>
          </View>
          <View style={[styles.description, { borderColor: accentBackground }]}>
            <AppText variant="body">{controlIncidentDescription(item)}</AppText>
          </View>
        </Card>

        <SectionTitle title="Связанный обход" />
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
            label="Статус обхода"
            value={patrolStatusLabel(item.patrol.status)}
          />
          {item.patrol.routeName ? (
            <DetailRow icon="git-network-outline" label="Маршрут" value={item.patrol.routeName} />
          ) : null}
          {item.patrol.startedAt ? (
            <DetailRow
              icon="play-circle-outline"
              label="Начало обхода"
              value={formatDateTime(item.patrol.startedAt)}
            />
          ) : null}
          {item.patrol.dueAt ? (
            <DetailRow
              icon="alarm-outline"
              label="Срок завершения"
              value={formatDateTime(item.patrol.dueAt)}
            />
          ) : null}
        </Card>

        {item.expectedSeconds !== null || item.actualSeconds !== null ? (
          <View>
            <SectionTitle title="Сравнение с нормативом" />
            <Card style={styles.detailsCard}>
              <DetailRow
                icon="speedometer-outline"
                label="Норматив"
                value={formatSeconds(item.expectedSeconds ?? undefined)}
                first
              />
              <DetailRow
                icon="time-outline"
                label="Фактическое время"
                value={formatSeconds(item.actualSeconds ?? undefined)}
              />
              {item.expectedSeconds !== null && item.actualSeconds !== null ? (
                <DetailRow
                  icon="trending-up-outline"
                  label="Отклонение"
                  value={formatSignedSeconds(item.actualSeconds - item.expectedSeconds)}
                />
              ) : null}
            </Card>
          </View>
        ) : null}

        {item.fromPatrolPoint || item.toPatrolPoint ? (
          <View>
            <SectionTitle title="Участок маршрута" />
            <Card style={styles.detailsCard}>
              {item.fromPatrolPoint ? (
                <DetailRow
                  icon="radio-button-on-outline"
                  label="От точки"
                  value={`${item.fromPatrolPoint.sortOrder}. ${item.fromPatrolPoint.name}`}
                  first
                />
              ) : null}
              {item.toPatrolPoint ? (
                <DetailRow
                  icon="location-outline"
                  label="До точки"
                  value={`${item.toPatrolPoint.sortOrder}. ${item.toPatrolPoint.name}`}
                  first={!item.fromPatrolPoint}
                />
              ) : null}
            </Card>
          </View>
        ) : null}

        {item.patrolEvent ? (
          <View>
            <SectionTitle title="Данные сканирования" />
            <Card style={styles.detailsCard}>
              <DetailRow
                icon="scan-outline"
                label="Время сканирования"
                value={formatDateTime(item.patrolEvent.scannedAt)}
                first
              />
              <DetailRow iconText="ID" label="UID метки" value={item.patrolEvent.nfcUid} />
              <DetailRow
                icon="phone-portrait-outline"
                label="Устройство"
                value={item.patrolEvent.deviceId}
              />
              <DetailRow
                icon="cloud-upload-outline"
                label="Поздняя синхронизация"
                value={item.patrolEvent.lateSync ? 'Да' : 'Нет'}
              />
              <DetailRow
                icon="archive-outline"
                label="Точка деактивирована после скана"
                value={item.patrolEvent.pointDeactivatedAfterScan ? 'Да' : 'Нет'}
              />
            </Card>
          </View>
        ) : null}

        <View style={styles.button}>
          <Button
            label="Перейти к обходу"
            icon="arrow-forward-circle-outline"
            onPress={() =>
              router.navigate({ pathname: '/control-patrols/[id]', params: { id: item.patrol.id } })
            }
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionTitle({ title }: { title: string }): React.ReactElement {
  return (
    <AppText variant="label" style={styles.sectionTitle}>
      {title}
    </AppText>
  );
}

function formatSignedSeconds(seconds: number): string {
  const prefix = seconds > 0 ? '+' : seconds < 0 ? '-' : '';
  return `${prefix}${formatSeconds(Math.abs(seconds))}`;
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
    marginRight: spacing.sm,
    minWidth: 0,
  },
  heroDate: {
    marginTop: spacing.xs,
  },
  heroBadge: {
    marginTop: spacing.sm,
  },
  description: {
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  detailsCard: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
  },
  sectionTitle: { marginBottom: spacing.sm, marginTop: spacing.xl },
  button: { marginTop: spacing.xl },
});
