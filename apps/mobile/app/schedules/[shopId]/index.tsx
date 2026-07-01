import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { ScheduleCard } from '@/features/schedules/ScheduleCard';
import { useShopSchedules } from '@/features/schedules/queries';
import { colors, spacing } from '@/theme';
import { AppText, Button, Header, Screen } from '@/ui';

export default function ShopSchedulesScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { data, isPending, isError, error, refetch, isRefetching } = useShopSchedules(shopId);
  const schedules = useMemo(
    () =>
      [...(data ?? [])].sort((left, right) => {
        const active = Number(right.isActive) - Number(left.isActive);
        if (active !== 0) {
          return active;
        }
        const startTime = left.startTime.localeCompare(right.startTime);
        if (startTime !== 0) {
          return startTime;
        }
        return left.name.localeCompare(right.name);
      }),
    [data],
  );

  function openSchedule(scheduleId: string): void {
    router.push({ pathname: '/schedules/[shopId]/[id]', params: { shopId, id: scheduleId } });
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          title="Расписания"
          subtitle="Когда нужно проводить обходы"
          onBack={() => router.back()}
        />
      </View>

      {isPending ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <AppText muted style={styles.errorText}>
            {describeError(error)}
          </AppText>
          <Button label="Повторить" variant="secondary" onPress={() => void refetch()} />
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={schedules}
          keyExtractor={(schedule) => schedule.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refetch()}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={<AppText muted>Расписаний пока нет.</AppText>}
          renderItem={({ item }) => (
            <ScheduleCard schedule={item} onPress={() => openSchedule(item.id)} />
          )}
        />
      )}

      <View style={styles.footer}>
        <Button
          label="Добавить расписание"
          icon="add-outline"
          onPress={() => router.push({ pathname: '/schedules/[shopId]/new', params: { shopId } })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  center: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  errorText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
