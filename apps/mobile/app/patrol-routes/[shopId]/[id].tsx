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
  useArchivePatrolRoute,
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
  const archive = useArchivePatrolRoute(shopId);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);

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

  function handleArchive(): void {
    setArchiveDialogOpen(false);
    archive.mutate(id, {
      onSuccess: () =>
        router.dismissTo({ pathname: '/patrol-routes/[shopId]', params: { shopId } }),
    });
  }

  function handleActivate(): void {
    update.mutate(
      { id, payload: { isActive: true } },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <Screen padded={false}>
      <AppDialog
        visible={archiveDialogOpen}
        title="Удалить маршрут?"
        message="Маршрут останется в истории и исчезнет из выбора для новых расписаний. Связанные расписания при необходимости отключите отдельно."
        tone="warning"
        actions={[
          { label: 'Удалить', variant: 'danger', onPress: handleArchive },
          { label: 'Отмена', variant: 'ghost', onPress: () => setArchiveDialogOpen(false) },
        ]}
        onClose={() => setArchiveDialogOpen(false)}
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
                  label={route.isActive ? 'Активен' : 'В архиве'}
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
                patrolPointIds: orderedPointIds,
                pointSettings,
              }}
              submitLabel="Сохранить изменения"
              submitting={update.isPending}
              error={update.isError ? describeError(update.error) : null}
              onSubmit={handleSubmit}
            />
          </View>
          <View style={styles.cancelAction}>
            <CancelButton onPress={() => router.back()} />
          </View>
          {route.isActive ? (
            <View style={styles.secondaryAction}>
              <Button
                label="Удалить маршрут"
                variant="dangerOutline"
                icon="trash-outline"
                loading={archive.isPending}
                onPress={() => setArchiveDialogOpen(true)}
              />
            </View>
          ) : (
            <View style={styles.secondaryAction}>
              <AppText variant="caption" muted style={styles.archiveHint}>
                Маршрут находится в архиве и недоступен для новых обходов.
              </AppText>
              <Button
                label="Вернуть из архива"
                variant="secondary"
                icon="refresh-outline"
                loading={update.isPending}
                onPress={handleActivate}
              />
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
  archiveHint: {
    marginBottom: spacing.md,
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
