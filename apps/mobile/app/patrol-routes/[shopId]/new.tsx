import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

import { describeError } from '@/api/error-messages';
import {
  PatrolRouteForm,
  type PatrolRouteFormValues,
} from '@/features/patrol-routes/PatrolRouteForm';
import {
  useCreatePatrolRoute,
  useShopPatrolPoints,
} from '@/features/patrol-routes/queries';
import { screenInsets } from '@/theme';
import { AsyncStateScreen, FormHeader, Header, Screen } from '@/ui';

export default function NewPatrolRouteScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const pointsQuery = useShopPatrolPoints(shopId);
  const create = useCreatePatrolRoute(shopId);

  if (pointsQuery.isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }

  if (pointsQuery.isError) {
    return (
      <AsyncStateScreen
        message={describeError(pointsQuery.error)}
        onBack={() => router.back()}
        onRetry={() => void pointsQuery.refetch()}
      />
    );
  }

  function handleSubmit(values: PatrolRouteFormValues): void {
    create.mutate(
      { shopId, isActive: true, ...values },
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
          <Header onBack={() => router.back()} />
          <FormHeader
            icon="git-network-outline"
            title="Новый маршрут"
            subtitle="Состав и порядок контрольных точек"
          />
          <PatrolRouteForm
            points={pointsQuery.data ?? []}
            submitLabel="Создать маршрут"
            submitting={create.isPending}
            error={create.isError ? describeError(create.error) : null}
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
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
});
