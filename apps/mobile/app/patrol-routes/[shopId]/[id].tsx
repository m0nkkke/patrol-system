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
import {
  PatrolRouteForm,
  type PatrolRouteFormValues,
} from '@/features/patrol-routes/PatrolRouteForm';
import {
  useDeletePatrolRoute,
  usePatrolRoute,
  useShopPatrolPoints,
  useUpdatePatrolRoute,
} from '@/features/patrol-routes/queries';
import { appIcons, screenInsets, spacing } from '@/theme';
import {
  AppDialog,
  AppText,
  AsyncStateScreen,
  Button,
  CancelButton,
  Card,
  EntityIcon,
  FormHeader,
  Header,
  Screen,
  StatusLabel,
} from '@/ui';

export default function EditPatrolRouteScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId, id } = useLocalSearchParams<{ shopId: string; id: string }>();
  const routeQuery = usePatrolRoute(id);
  const pointsQuery = useShopPatrolPoints(shopId);
  const update = useUpdatePatrolRoute(shopId);
  const deleteRoute = useDeletePatrolRoute(shopId);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (routeQuery.isPending || pointsQuery.isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }

  const route = routeQuery.data;
  if (routeQuery.isError || pointsQuery.isError || !route) {
    return (
      <AsyncStateScreen
        message={describeError(routeQuery.error ?? pointsQuery.error)}
        onBack={() => router.back()}
        onRetry={() => {
          void routeQuery.refetch();
          void pointsQuery.refetch();
        }}
      />
    );
  }

  const orderedPointIds = [...(route.points ?? [])]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((item) => item.patrolPointId);
  const pointSettings = (route.points ?? []).map((item) => ({
    patrolPointId: item.patrolPointId,
    dwellSeconds: item.dwellSeconds ?? 90,
  }));
  const formPoints = [...(pointsQuery.data ?? [])];
  const knownPointIds = new Set(formPoints.map((point) => point.id));
  for (const routePoint of route.points ?? []) {
    if (!knownPointIds.has(routePoint.patrolPointId)) {
      formPoints.push(routePoint.patrolPoint);
      knownPointIds.add(routePoint.patrolPointId);
    }
  }

  function handleSubmit(values: PatrolRouteFormValues): void {
    update.mutate(
      { id, payload: values },
      { onSuccess: () => router.back() },
    );
  }

  function handleDelete(): void {
    setDeleteDialogOpen(false);
    deleteRoute.mutate(id, {
      onSuccess: () =>
        router.dismissTo({ pathname: '/patrol-routes/[shopId]', params: { shopId } }),
    });
  }

  return (
    <Screen padded={false}>
      <AppDialog
        visible={deleteDialogOpen}
        title="Удалить маршрут?"
        message="Маршрут будет скрыт из рабочих списков, но сохранится в истории завершённых обходов. Перед удалением отключите связанные с ним расписания."
        tone="warning"
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
          <Header onBack={() => router.back()} />
          <FormHeader
            icon="git-network-outline"
            title="Редактирование маршрута"
            subtitle="Основные данные, порядок точек и выдержка"
          />
          <Card style={styles.summaryCard}>
            <EntityIcon
              icon={route.category === 'internal' ? 'business-outline' : appIcons.externalRoute}
              size="large"
              tone={route.isActive ? 'primary' : 'neutral'}
            />
            <View style={styles.summaryCopy}>
              <AppText variant="label" muted={!route.isActive} numberOfLines={2}>
                {route.name}
              </AppText>
              <AppText variant="caption" muted style={styles.summaryMeta}>
                {route.category === 'internal' ? 'Внутренний маршрут' : 'Внешний маршрут'} ·{' '}
                {orderedPointIds.length} точек
              </AppText>
              <View style={styles.summaryStatus}>
                <StatusLabel
                  label={route.isActive ? 'Активен' : 'Отключён'}
                  tone={route.isActive ? 'success' : 'neutral'}
                />
              </View>
            </View>
          </Card>
          <View style={styles.historyAction}>
            <Button
              label="История изменений"
              icon="time-outline"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/patrol-routes/[shopId]/versions/[id]',
                  params: { shopId, id },
                })
              }
            />
          </View>
          <View style={styles.form}>
            <PatrolRouteForm
              points={formPoints}
              initial={{
                name: route.name,
                category: route.category,
                isActive: route.isActive,
                patrolPointIds: orderedPointIds,
                pointSettings,
              }}
              submitLabel="Сохранить изменения"
              submitting={update.isPending}
              error={
                update.isError
                  ? describeError(update.error)
                  : deleteRoute.isError
                    ? describeError(deleteRoute.error)
                    : null
              }
              onSubmit={handleSubmit}
            />
          </View>
          <View style={styles.cancelAction}>
            <CancelButton onPress={() => router.back()} />
          </View>
          <View style={styles.secondaryAction}>
            <Button
              label="Удалить маршрут"
              variant="dangerOutline"
              icon="trash-outline"
              loading={deleteRoute.isPending}
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
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  errorText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  secondaryAction: {
    marginTop: spacing.xxl,
  },
  summaryCard: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: spacing.lg,
  },
  summaryCopy: {
    flex: 1,
    marginLeft: spacing.lg,
    minWidth: 0,
  },
  summaryMeta: {
    marginTop: spacing.xs,
  },
  summaryStatus: {
    marginTop: spacing.sm,
  },
  form: {
    marginTop: spacing.xxl,
  },
  historyAction: {
    marginTop: spacing.md,
  },
  cancelAction: {
    marginTop: spacing.md,
  },
});
