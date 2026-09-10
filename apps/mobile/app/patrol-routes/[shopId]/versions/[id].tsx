import type { PatrolRouteVersion } from '@patrol/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { PatrolRoute } from '@/api/patrol-routes.api';
import {
  usePatrolRoute,
  usePatrolRouteVersions,
} from '@/features/patrol-routes/queries';
import { formatDateTime } from '@/lib/format';
import { colors, screenInsets, spacing } from '@/theme';
import {
  AppText,
  AsyncStateScreen,
  Card,
  EmptyState,
  EntityIcon,
  Header,
  Screen,
  StatusLabel,
} from '@/ui';

export default function PatrolRouteVersionsScreen(): React.ReactElement {
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ shopId: string; id: string }>();
  const routeQuery = usePatrolRoute(id);
  const versionsQuery = usePatrolRouteVersions(id);

  const refresh = (): void => {
    void routeQuery.refetch();
    void versionsQuery.refetch();
  };

  if (versionsQuery.isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }

  if (versionsQuery.isError) {
    return (
      <AsyncStateScreen
        message={describeError(versionsQuery.error)}
        onBack={() => router.back()}
        onRetry={refresh}
      />
    );
  }

  const route = routeQuery.data;
  const pointNames = buildPointNames(route);
  const versions = versionsQuery.data ?? [];

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header
          compact
          title="История маршрута"
          subtitle={route?.name ?? 'Изменения состава и настроек'}
          onBack={() => router.back()}
        />
        <AppText variant="caption" muted>
          Версий: {versions.length}
        </AppText>
      </View>
      <FlatList
        data={versions}
        keyExtractor={(version) => version.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={versionsQuery.isRefetching || routeQuery.isRefetching}
            onRefresh={refresh}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="История пока пуста"
            description="Версии появятся после создания или изменения маршрута."
          />
        }
        renderItem={({ item, index }) => (
          <VersionCard
            version={item}
            current={index === 0}
            pointNames={pointNames}
          />
        )}
      />
    </Screen>
  );
}

function VersionCard({
  version,
  current,
  pointNames,
}: {
  version: PatrolRouteVersion;
  current: boolean;
  pointNames: ReadonlyMap<string, string>;
}): React.ReactElement {
  const points = [...version.snapshot.points].sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );

  return (
    <Card style={styles.card}>
      <View style={styles.cardHeader}>
        <EntityIcon icon="git-branch-outline" />
        <View style={styles.headerCopy}>
          <View style={styles.titleRow}>
            <AppText variant="label">Версия {version.version}</AppText>
            {current ? <StatusLabel label="Текущая" tone="success" /> : null}
          </View>
          <AppText variant="caption" muted style={styles.smallGap}>
            {formatDateTime(version.createdAt)}
          </AppText>
        </View>
      </View>

      <View style={styles.metaBlock}>
        <MetaLine label="Автор" value={version.actorFullName || 'Системное изменение'} />
        <MetaLine
          label="Тип"
          value={version.snapshot.category === 'internal' ? 'Внутренний' : 'Внешний'}
        />
        <MetaLine label="Статус" value={version.snapshot.isActive ? 'Активен' : 'Отключён'} />
      </View>

      <View style={styles.pointsHeader}>
        <AppText variant="label">Контрольные точки</AppText>
        <AppText variant="caption" muted>{points.length}</AppText>
      </View>
      {points.length === 0 ? (
        <AppText variant="caption" muted style={styles.smallGap}>
          В этой версии точек нет.
        </AppText>
      ) : (
        points.map((point) => (
          <View key={point.patrolPointId} style={styles.pointRow}>
            <View style={styles.orderBadge}>
              <AppText variant="caption" color={colors.primary}>{point.sortOrder}</AppText>
            </View>
            <View style={styles.pointCopy}>
              <AppText variant="body" numberOfLines={2}>
                {pointNames.get(point.patrolPointId) ?? `Точка ${shortId(point.patrolPointId)}`}
              </AppText>
              <AppText variant="caption" muted style={styles.smallGap}>
                Выдержка: {point.dwellSeconds} сек.
              </AppText>
            </View>
          </View>
        ))
      )}
    </Card>
  );
}

function MetaLine({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.metaRow}>
      <AppText variant="caption" muted>{label}</AppText>
      <AppText variant="caption" style={styles.metaValue}>{value}</AppText>
    </View>
  );
}

function buildPointNames(route: PatrolRoute | undefined): ReadonlyMap<string, string> {
  return new Map(
    (route?.points ?? []).map((point) => [point.patrolPointId, point.patrolPoint.name]),
  );
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  list: {
    flexGrow: 1,
    gap: spacing.md,
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.listTop,
  },
  card: {
    padding: spacing.lg,
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  headerCopy: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaBlock: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  metaRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  metaValue: {
    flex: 1,
    marginLeft: spacing.lg,
    textAlign: 'right',
  },
  pointsHeader: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
  },
  pointRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  orderBadge: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  pointCopy: {
    flex: 1,
    marginLeft: spacing.md,
    minWidth: 0,
  },
  smallGap: {
    marginTop: spacing.xs,
  },
  errorText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
});
