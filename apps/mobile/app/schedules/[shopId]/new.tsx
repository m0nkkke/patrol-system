import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { describeError } from '@/api/error-messages';
import { ScheduleForm, type ScheduleFormValues } from '@/features/schedules/ScheduleForm';
import { useCreateSchedule } from '@/features/schedules/queries';
import { spacing } from '@/theme';
import { FormHeader, Header, Screen } from '@/ui';

export default function NewScheduleScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { mutate, isPending, isError, error } = useCreateSchedule(shopId);

  function handleSubmit(values: ScheduleFormValues): void {
    mutate(
      {
        shopId,
        name: values.name,
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header onBack={() => router.back()} />
          <FormHeader
            icon="time-outline"
            title="Новое расписание"
            subtitle="График обходов магазина"
          />
          <ScheduleForm
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
});
