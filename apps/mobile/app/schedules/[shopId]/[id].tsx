import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import { useShopPatrolRoutes } from '@/features/patrol-routes/queries';
import { formatScheduleTime } from '@/features/schedules/format';
import { ScheduleForm, type ScheduleFormValues } from '@/features/schedules/ScheduleForm';
import {
  useDeleteSchedule,
  useSchedule,
  useUpdateSchedule,
} from '@/features/schedules/queries';
import { screenInsets, spacing } from '@/theme';
import { AppDialog, AsyncStateScreen, Button, FormHeader, Header, Screen } from '@/ui';

export default function EditScheduleScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId, id } = useLocalSearchParams<{ shopId: string; id: string }>();
  const { data: schedule, isPending, isError, error, refetch } = useSchedule(id);
  const routes = useShopPatrolRoutes(shopId);
  const update = useUpdateSchedule(shopId);
  const deleteSchedule = useDeleteSchedule(shopId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (isPending || routes.isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }

  if (isError || routes.isError || !schedule) {
    return (
      <AsyncStateScreen
        message={describeError(error ?? routes.error)}
        onBack={() => router.back()}
        onRetry={() => {
          void refetch();
          void routes.refetch();
        }}
      />
    );
  }

  function handleSubmit(values: ScheduleFormValues): void {
    update.mutate(
      {
        id,
        payload: {
          name: values.name,
          isActive: values.isActive,
          routeId: values.routeId,
          period: values.period,
          earlyStartMinutes: values.earlyStartMinutes,
          weekdays: values.weekdays,
          startTime: values.startTime,
          endTime: values.endTime,
        },
      },
      { onSuccess: () => router.back() },
    );
  }

  function handleDelete(): void {
    setDeleteDialogOpen(false);
    deleteSchedule.mutate(id, {
      onSuccess: () =>
        router.dismissTo({ pathname: '/schedules/[shopId]', params: { shopId } }),
    });
  }

  return (
    <Screen padded={false}>
      <AppDialog
        visible={deleteDialogOpen}
        title="Удалить расписание?"
        message="Расписание будет скрыто из рабочих списков и перестанет создавать новые обходы. История завершённых обходов сохранится."
        tone="danger"
        actions={[
          { label: 'Удалить', variant: 'danger', onPress: handleDelete },
          { label: 'Отмена', variant: 'ghost', onPress: () => setDeleteDialogOpen(false) },
        ]}
        onClose={() => setDeleteDialogOpen(false)}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header onBack={() => router.back()} right={<View />} />
          <FormHeader
            icon="calendar-outline"
            title="Редактирование"
            subtitle="Изменение расписания обходов"
          />
          <ScheduleForm
            routes={routes.data ?? []}
            initial={{
              name: schedule.name,
              isActive: schedule.isActive,
              routeId: schedule.routeId,
              period: schedule.period,
              earlyStartMinutes: schedule.earlyStartMinutes,
              weekdays: schedule.weekdays,
              startTime: formatScheduleTime(schedule.startTime),
              endTime: formatScheduleTime(schedule.endTime),
            }}
            submitLabel="Сохранить"
            submitting={update.isPending}
            error={
              update.isError
                ? describeError(update.error)
                : deleteSchedule.isError
                  ? describeError(deleteSchedule.error)
                  : null
            }
            onCancel={() => router.back()}
            onSubmit={handleSubmit}
          />
          <View style={styles.deleteAction}>
            <Button
              label="Удалить расписание"
              icon="trash-outline"
              variant="dangerOutline"
              loading={deleteSchedule.isPending}
              onPress={() => setDeleteDialogOpen(true)}
            />
          </View>
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
  deleteAction: {
    marginTop: spacing.xxl,
  },
});
