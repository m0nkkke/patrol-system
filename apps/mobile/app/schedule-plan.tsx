import type { MobileSchedulePlanItemDto, PatrolPeriod } from '@patrol/shared';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { getSchedulePlan } from '@/api/patrols.api';
import { useAuthStore } from '@/store/auth-store';
import { colors, screenInsets, spacing } from '@/theme';
import {
  AppText,
  Button,
  Card,
  DataStatusBar,
  EmptyState,
  EntityIcon,
  Header,
  Screen,
  StatusLabel,
} from '@/ui';

const PLAN_DAYS = 7;

type PlanSection = {
  title: string;
  data: MobileSchedulePlanItemDto[];
};

const PERIOD_LABELS: Record<PatrolPeriod, string> = {
  morning: 'Утро',
  noon: 'День',
  evening: 'Вечер',
};

export default function SchedulePlanScreen(): React.ReactElement {
  const router = useRouter();
  const shopId = useAuthStore((state) => state.selectedShopId ?? state.user?.shopId ?? null);
  const plan = useQuery({
    queryKey: ['schedule-plan', PLAN_DAYS, shopId],
    queryFn: () => getSchedulePlan(PLAN_DAYS, shopId ?? undefined),
    enabled: shopId !== null,
    staleTime: 15 * 60 * 1000,
  });
  const sections = groupByLocalDate(plan.data?.items ?? []);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          compact
          title="График обходов"
          subtitle={`Ближайшие 7 дней · ${plan.data?.items.length ?? 0} запланировано`}
          onBack={() => router.back()}
        />
      </View>

      {plan.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : plan.isError ? (
        <View style={styles.center}>
          <AppText muted style={styles.centerText}>
            {describeError(plan.error)}
          </AppText>
          <Button label="Повторить" variant="secondary" onPress={() => void plan.refetch()} />
        </View>
      ) : (
        <SectionList
          style={styles.flex}
          sections={sections}
          keyExtractor={(item) => `${item.scheduleId}:${toTimestamp(item.plannedStartAt)}`}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={plan.isRefetching}
              onRefresh={() => void plan.refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          renderSectionHeader={({ section }) => (
            <AppText variant="label" style={styles.sectionTitle}>
              {section.title}
            </AppText>
          )}
          renderItem={({ item }) => <SchedulePlanCard item={item} />}
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          SectionSeparatorComponent={() => <View style={styles.sectionSeparator} />}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title="Обходов пока нет"
              description="Для выбранного магазина нет активных расписаний на ближайшие 7 дней."
            />
          }
        />
      )}
      {!plan.isPending && !plan.isError ? (
        <View style={styles.footer}>
          <DataStatusBar
            hasRefreshError={plan.isRefetchError}
            isRefreshing={plan.isRefetching}
            onRefresh={() => void plan.refetch()}
            updatedAt={plan.dataUpdatedAt}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function SchedulePlanCard({ item }: { item: MobileSchedulePlanItemDto }): React.ReactElement {
  const now = Date.now();
  const availableFrom = toTimestamp(item.availableFrom);
  const dueAt = toTimestamp(item.dueAt);
  const isAvailable = now >= availableFrom && now <= dueAt;

  return (
    <Card style={styles.card}>
      <View style={styles.titleRow}>
        <EntityIcon icon="calendar-outline" />
        <View style={styles.titleText}>
          <AppText variant="label" numberOfLines={2}>
            {item.scheduleName}
          </AppText>
          <AppText variant="caption" muted style={styles.shopName} numberOfLines={1}>
            {item.shopName}
          </AppText>
        </View>
        <StatusLabel
          label={isAvailable ? 'Доступен' : PERIOD_LABELS[item.period]}
          tone={isAvailable ? 'success' : 'neutral'}
        />
      </View>

      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={18} color={colors.primary} />
        <View style={styles.timeText}>
          <AppText variant="label">
            {formatTime(item.plannedStartAt, item.timezone)} - {formatTime(item.dueAt, item.timezone)}
          </AppText>
          <AppText variant="caption" muted style={styles.availableText}>
            Можно начать с {formatTime(item.availableFrom, item.timezone)}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

function groupByLocalDate(items: MobileSchedulePlanItemDto[]): PlanSection[] {
  const sorted = [...items].sort(
    (left, right) => toTimestamp(left.plannedStartAt) - toTimestamp(right.plannedStartAt),
  );
  const sections = new Map<string, PlanSection>();

  for (const item of sorted) {
    const key = formatDateKey(item.plannedStartAt, item.timezone);
    const existing = sections.get(key);
    if (existing) {
      existing.data.push(item);
    } else {
      sections.set(key, {
        title: formatDateTitle(item.plannedStartAt, item.timezone),
        data: [item],
      });
    }
  }

  return [...sections.values()];
}

function formatDateKey(value: Date | string, timezone: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).format(new Date(value));
}

function formatDateTitle(value: Date | string, timezone: string): string {
  const formatted = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: timezone,
  }).format(new Date(value));
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatTime(value: Date | string, timezone: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).format(new Date(value));
}

function toTimestamp(value: Date | string): number {
  return new Date(value).getTime();
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: screenInsets.horizontal,
  },
  centerText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  list: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: screenInsets.horizontal,
  },
  sectionTitle: {
    marginBottom: spacing.sm,
  },
  sectionSeparator: {
    height: spacing.xl,
  },
  itemSeparator: {
    height: spacing.sm,
  },
  card: {
    padding: spacing.lg,
  },
  titleRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  titleText: {
    flex: 1,
    marginHorizontal: spacing.md,
    minWidth: 0,
  },
  shopName: {
    marginTop: spacing.xs,
  },
  timeRow: {
    alignItems: 'flex-start',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  timeText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  availableText: {
    marginTop: spacing.xs,
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: screenInsets.footerBottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.footerTop,
  },
});
