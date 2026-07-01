import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import { formatScheduleTime } from '@/features/schedules/format';
import { ScheduleForm, type ScheduleFormValues } from '@/features/schedules/ScheduleForm';
import {
  useDeactivateSchedule,
  useSchedule,
  useUpdateSchedule,
} from '@/features/schedules/queries';
import { colors, spacing } from '@/theme';
import { AppText, Button, FormHeader, Header, Screen } from '@/ui';

export default function EditScheduleScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId, id } = useLocalSearchParams<{ shopId: string; id: string }>();
  const { data: schedule, isPending, isError, error, refetch } = useSchedule(id);
  const update = useUpdateSchedule(shopId);
  const deactivate = useDeactivateSchedule(shopId);

  if (isPending) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (isError || !schedule) {
    return (
      <Screen centered>
        <AppText muted style={styles.centerText}>
          {describeError(error)}
        </AppText>
        <Button label="Повторить" variant="secondary" onPress={() => void refetch()} />
      </Screen>
    );
  }

  function handleSubmit(values: ScheduleFormValues): void {
    update.mutate(
      {
        id,
        payload: {
          name: values.name,
          weekdays: values.weekdays,
          startTime: values.startTime,
          endTime: values.endTime,
        },
      },
      { onSuccess: () => router.back() },
    );
  }

  function handleDeactivate(): void {
    deactivate.mutate(id, { onSuccess: () => router.back() });
  }

  function handleActivate(): void {
    update.mutate({ id, payload: { isActive: true } }, { onSuccess: () => router.back() });
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header onBack={() => router.back()} />
          <FormHeader
            icon="time-outline"
            title="Расписание"
            subtitle="Изменение графика обходов"
          />
          <ScheduleForm
            initial={{
              name: schedule.name,
              weekdays: schedule.weekdays,
              startTime: formatScheduleTime(schedule.startTime),
              endTime: formatScheduleTime(schedule.endTime),
            }}
            submitLabel="Сохранить"
            submitting={update.isPending}
            error={update.isError ? describeError(update.error) : null}
            onSubmit={handleSubmit}
          />
          {schedule.isActive ? (
            <View style={styles.gapLg}>
              <Button
                label="Отключить расписание"
                variant="secondary"
                icon="pause-circle-outline"
                onPress={handleDeactivate}
                loading={deactivate.isPending}
              />
            </View>
          ) : (
            <View style={styles.gapLg}>
              <AppText variant="caption" muted>
                Расписание отключено — обходы по нему не отслеживаются.
              </AppText>
              <View style={styles.gapMd}>
                <Button
                  label="Включить расписание"
                  variant="secondary"
                  icon="play-circle-outline"
                  onPress={handleActivate}
                  loading={update.isPending}
                />
              </View>
            </View>
          )}
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  centerText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  gapMd: {
    marginTop: spacing.md,
  },
});
