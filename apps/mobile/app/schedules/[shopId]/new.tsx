import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import { useShopPatrolRoutes } from '@/features/patrol-routes/queries';
import { ScheduleForm, type ScheduleFormValues } from '@/features/schedules/ScheduleForm';
import { useCreateSchedule } from '@/features/schedules/queries';
import { screenInsets } from '@/theme';
import { AsyncStateScreen, FormHeader, Header, Screen } from '@/ui';

export default function NewScheduleScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { mutate, isPending, isError, error } = useCreateSchedule(shopId);
  const routes = useShopPatrolRoutes(shopId);

  if (routes.isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }

  if (routes.isError) {
    return (
      <AsyncStateScreen
        message={describeError(routes.error)}
        onBack={() => router.back()}
        onRetry={() => void routes.refetch()}
      />
    );
  }

  function handleSubmit(values: ScheduleFormValues): void {
    mutate(
      {
        shopId,
        name: values.name,
        isActive: values.isActive,
        routeId: values.routeId,
        period: values.period,
        earlyStartMinutes: values.earlyStartMinutes,
        weekdays: values.weekdays,
        startTime: values.startTime,
        endTime: values.endTime,
      },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header onBack={() => router.back()} right={<View />} />
          <FormHeader
            icon="calendar-outline"
            title="Новое расписание"
            subtitle="Настройте маршрут, дни и время обхода"
          />
          <ScheduleForm
            routes={routes.data ?? []}
            submitLabel="Создать расписание"
            submitting={isPending}
            error={isError ? describeError(error) : null}
            onSubmit={handleSubmit}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
    paddingBottom: screenInsets.bottom,
  },
});
