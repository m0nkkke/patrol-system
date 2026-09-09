import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import {
  REPORT_STATUS_LABELS,
  REPORT_TYPE_LABELS,
} from '@/features/control-reports/format';
import { useControlShopOverview } from '@/features/control-shops/queries';
import {
  controlIncidentDescription,
  incidentTypeLabel,
  incidentTypeTone,
} from '@/features/incidents/incident-type';
import { patrolStatusLabel, patrolStatusTone } from '@/features/patrol/patrol-status';
import { roleLabel } from '@/features/users/role';
import { formatDateTime } from '@/lib/format';
import { colors, radius, screenInsets, spacing } from '@/theme';
import { AppText, AsyncStateScreen, Badge, Button, Card, Header, Screen } from '@/ui';

export default function ControlShopOverviewScreen(): React.ReactElement {
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const overview = useControlShopOverview(id);

  if (overview.isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }
  if (overview.isError || !overview.data) {
    return (
      <AsyncStateScreen
        message={describeError(overview.error)}
        onBack={() => router.back()}
        onRetry={() => void overview.refetch()}
      />
    );
  }

  const data = overview.data;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={overview.isRefetching}
            onRefresh={() => void overview.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <Header
          title={data.shop.name}
          subtitle={data.shop.address ?? 'Контрольная сводка за 14 дней'}
          onBack={() => router.back()}
        />

        <View style={styles.metricsGrid}>
          <Metric label="Всего обходов" value={String(data.stats.totalPatrols)} />
          <Metric label="Выполнено" value={String(data.stats.completedPatrols)} />
          <Metric label="Выполнение" value={`${Math.round(data.stats.completionRate * 100)}%`} />
          <Metric label="Нарушения" value={String(data.stats.incidentCount)} attention={data.stats.incidentCount > 0} />
        </View>

        <SectionTitle title="Ответственные" />
        <Card>
          {data.staff.length > 0 ? (
            data.staff.map((person, index) => (
              <Card
                key={person.id}
                style={index > 0 ? styles.staffRowDivided : styles.staffRow}
                onPress={() =>
                  router.push({ pathname: '/control-staff/[id]', params: { id: person.id } })
                }
              >
                <View style={styles.flex}>
                  <AppText variant="body">{person.fullName}</AppText>
                  <AppText variant="caption" muted style={styles.meta}>
                    {roleLabel(person.role)}
                  </AppText>
                </View>
                <Badge label={person.isActive ? 'Активен' : 'Неактивен'} tone={person.isActive ? 'success' : 'neutral'} />
              </Card>
            ))
          ) : (
            <AppText muted>Ответственные не назначены.</AppText>
          )}
        </Card>

        <SectionTitle title="Последние обходы" />
        {data.recentPatrols.length > 0 ? (
          data.recentPatrols.map((patrol) => (
            <Card
              key={patrol.id}
              style={styles.listCard}
              onPress={() =>
                router.push({ pathname: '/control-patrols/[id]', params: { id: patrol.id } })
              }
            >
              <View style={styles.cardRow}>
                <View style={styles.flex}>
                  <AppText variant="label">
                    {patrol.employee.fullName ?? 'Сотрудник контроля'}
                  </AppText>
                  <AppText variant="caption" muted style={styles.meta}>
                    {formatDateTime(patrol.startedAt ?? undefined, data.shop.timezone)} ·{' '}
                    {patrol.scannedPoints}/{patrol.totalPoints} точек
                  </AppText>
                  <View style={styles.badgeTop}>
                    <Badge label={patrolStatusLabel(patrol.status)} tone={patrolStatusTone(patrol.status)} />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </Card>
          ))
        ) : (
          <AppText muted>Обходов за период нет.</AppText>
        )}
        <View style={styles.sectionAction}>
          <Button
            label="Все обходы магазина"
            variant="secondary"
            icon="document-text-outline"
            onPress={() =>
              router.push({
                pathname: '/control-patrols',
                params: { shopId: data.shop.id, shopName: data.shop.name },
              })
            }
          />
        </View>

        <SectionTitle title="Последние нарушения" />
        {data.recentIncidents.length > 0 ? (
          data.recentIncidents.map((incident) => (
            <Card
              key={incident.id}
              style={styles.listCard}
              onPress={() =>
                router.push({ pathname: '/incident/[id]', params: { id: incident.id } })
              }
            >
              <View style={styles.cardRow}>
                <View style={styles.flex}>
                  <Badge label={incidentTypeLabel(incident.type)} tone={incidentTypeTone(incident.type)} />
                  <AppText variant="body" style={styles.incidentMessage}>
                    {controlIncidentDescription(incident)}
                  </AppText>
                  <AppText variant="caption" muted style={styles.meta}>
                    {formatDateTime(incident.createdAt, data.shop.timezone)}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </Card>
          ))
        ) : (
          <AppText muted>Нарушений за период нет.</AppText>
        )}
        <View style={styles.sectionAction}>
          <Button
            label="Все нарушения магазина"
            variant="secondary"
            icon="warning-outline"
            onPress={() =>
              router.push({
                pathname: '/incidents',
                params: { shopId: data.shop.id, shopName: data.shop.name },
              })
            }
          />
        </View>

        <SectionTitle title="Последние отчёты" />
        {data.recentReports.length > 0 ? (
          data.recentReports.map((report) => (
            <Card
              key={report.id}
              style={styles.listCard}
              onPress={() =>
                router.push({ pathname: '/control-reports/[id]', params: { id: report.id } })
              }
            >
              <View style={styles.cardRow}>
                <View style={styles.flex}>
                  <AppText variant="label">{REPORT_TYPE_LABELS[report.reportType]}</AppText>
                  <AppText variant="caption" muted style={styles.meta}>
                    {report.employee.fullName ?? 'Сотрудник контроля'} · фото: {report.fileCount}
                  </AppText>
                  <View style={styles.badgeTop}>
                    <Badge label={REPORT_STATUS_LABELS[report.status]} tone={report.status === 'submitted' ? 'success' : report.status === 'cancelled' ? 'danger' : 'neutral'} />
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
            </Card>
          ))
        ) : (
          <AppText muted>Отчётов за период нет.</AppText>
        )}

        <View style={styles.sectionAction}>
          <Button
            label="Все отчёты магазина"
            icon="documents-outline"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: '/control-reports',
                params: { shopId: data.shop.id, shopName: data.shop.name },
              })
            }
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

function Metric({ label, value, attention = false }: { label: string; value: string; attention?: boolean }): React.ReactElement {
  return (
    <View style={styles.metric}>
      <AppText variant="heading" color={attention ? colors.danger : colors.text}>
        {value}
      </AppText>
      <AppText variant="caption" muted style={styles.meta}>
        {label}
      </AppText>
    </View>
  );
}

function SectionTitle({ title }: { title: string }): React.ReactElement {
  return (
    <AppText variant="label" style={styles.sectionTitle}>
      {title}
    </AppText>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  errorText: { marginBottom: spacing.lg, textAlign: 'center' },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metric: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    minHeight: 96,
    padding: spacing.md,
    width: '48%',
  },
  sectionTitle: { marginBottom: spacing.sm, marginTop: spacing.xl },
  staffRow: {
    alignItems: 'center',
    borderRadius: 0,
    borderWidth: 0,
    flexDirection: 'row',
    padding: spacing.sm,
  },
  staffRowDivided: {
    alignItems: 'center',
    borderRadius: 0,
    borderTopColor: colors.border,
    borderWidth: 0,
    borderTopWidth: 1,
    flexDirection: 'row',
    padding: spacing.sm,
  },
  flex: { flex: 1, marginRight: spacing.sm },
  meta: { marginTop: spacing.xs },
  listCard: { marginBottom: spacing.sm, padding: spacing.lg },
  cardRow: { alignItems: 'center', flexDirection: 'row' },
  badgeTop: { marginTop: spacing.sm },
  incidentMessage: { marginTop: spacing.sm },
  sectionAction: { marginTop: spacing.lg },
});
