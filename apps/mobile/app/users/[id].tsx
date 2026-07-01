import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { AdminUser } from '@/api/types';
import { PatrolCard } from '@/features/history/PatrolCard';
import { useEmployeePatrols } from '@/features/history/queries';
import { useRotateUserAccessKey, useUser } from '@/features/users/queries';
import { RoleBadge } from '@/features/users/RoleBadge';
import { formatDateTime } from '@/lib/format';
import { colors, spacing } from '@/theme';
import { AppDialog, AppText, Badge, Button, Card, Header, InfoRow, Screen } from '@/ui';
import type { AppDialogAction } from '@/ui';

type DialogState = {
  actions: AppDialogAction[];
  message?: string;
  title: string;
  tone?: 'danger' | 'info' | 'success' | 'warning';
};

export default function UserDetailScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user, isPending, isError, error, refetch } = useUser(id);
  const rotate = useRotateUserAccessKey(id);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  if (isPending) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (isError || !user) {
    return (
      <Screen centered>
        <AppText muted style={styles.centerText}>
          {describeError(error)}
        </AppText>
        <Button label="Повторить" variant="secondary" onPress={() => void refetch()} />
      </Screen>
    );
  }

  function confirmRotate(): void {
    setDialog({
      title: 'Сбросить ключ доступа?',
      message: 'Текущий ключ перестанет работать. Сотруднику нужно будет войти по новому ключу.',
      tone: 'danger',
      actions: [
        {
          label: 'Сбросить',
          variant: 'danger',
          onPress: () => {
            setDialog(null);
            rotate.mutate(undefined, {
              onSuccess: (updated) => {
                const key = updated.accessKey ?? '-';
                setDialog({
                  title: 'Новый ключ доступа',
                  message: key,
                  tone: 'success',
                  actions: [
                    {
                      label: 'Скопировать',
                      onPress: () => {
                        void Clipboard.setStringAsync(key);
                        setDialog(null);
                      },
                    },
                    { label: 'Готово', onPress: () => setDialog(null), variant: 'ghost' },
                  ],
                });
              },
              onError: (rotateError) => {
                setDialog({
                  title: 'Ошибка',
                  message: describeError(rotateError),
                  tone: 'danger',
                  actions: [{ label: 'Понятно', onPress: () => setDialog(null) }],
                });
              },
            });
          },
        },
        { label: 'Отмена', onPress: () => setDialog(null), variant: 'ghost' },
      ],
    });
  }

  return (
    <Screen padded={false}>
      {dialog ? (
        <AppDialog
          visible
          title={dialog.title}
          message={dialog.message}
          tone={dialog.tone}
          actions={dialog.actions}
          onClose={() => setDialog(null)}
        />
      ) : null}
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header
          title="Пользователь"
          onBack={() => router.back()}
          right={
            <TouchableOpacity
              style={styles.editAction}
              onPress={() => router.push({ pathname: '/users/edit/[id]', params: { id: user.id } })}
              hitSlop={8}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <AppText variant="body" color={colors.primary} style={styles.editActionText}>
                Изменить
              </AppText>
            </TouchableOpacity>
          }
        />

        <Card>
          <AppText variant="heading">{user.fullName}</AppText>
          <View style={styles.badges}>
            <RoleBadge role={user.role} />
            <Badge
              label={user.isActive ? 'Активен' : 'Неактивен'}
              tone={user.isActive ? 'success' : 'danger'}
            />
          </View>
        </Card>

        {user.role === 'admin' ? null : <ShopsCard user={user} />}

        <Card style={styles.gapLg}>
          {user.role === 'admin' ? (
            <InfoRow label="Последний вход" value={formatDateTime(user.lastLoginAt)} first />
          ) : (
            <>
              <InfoRow label="Ключ доступа" value={user.accessKey ?? '—'} selectable first />
              <InfoRow label="Последний вход" value={formatDateTime(user.lastLoginAt)} />
              <TouchableOpacity
                style={styles.rotateRow}
                onPress={confirmRotate}
                disabled={rotate.isPending}
                hitSlop={8}
                activeOpacity={0.7}
              >
                <Ionicons name="refresh-outline" size={16} color={colors.primary} />
                <AppText variant="label" color={colors.primary} style={styles.rotateText}>
                  {rotate.isPending ? 'Сброс…' : 'Сбросить ключ'}
                </AppText>
              </TouchableOpacity>
            </>
          )}
        </Card>

        {user.role === 'employee' ? (
          <EmployeePatrolsSection
            employeeId={user.id}
            onOpen={(patrolId) =>
              router.push({ pathname: '/history/patrol/[id]', params: { id: patrolId } })
            }
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function ShopsCard({
  user,
}: {
  user: AdminUser;
}): React.ReactElement {
  const ordered = [...(user.shops ?? [])].sort((a, b) => {
    if (a.id === user.shopId) {
      return -1;
    }
    if (b.id === user.shopId) {
      return 1;
    }
    return a.name.localeCompare(b.name, 'ru');
  });

  return (
    <Card style={styles.gapLg}>
      <AppText variant="label" style={styles.shopsTitle}>
        Магазины
      </AppText>
      {ordered.length === 0 ? (
        <AppText variant="caption" muted>
          Магазины не назначены.
        </AppText>
      ) : (
        ordered.map((shop, index) => (
          <View key={shop.id} style={[styles.shopRow, index > 0 && styles.shopRowBorder]}>
            <AppText variant="body" style={styles.shopName} numberOfLines={1}>
              {shop.name}
            </AppText>
            {shop.id === user.shopId ? <Badge label="Основной" tone="success" /> : null}
          </View>
        ))
      )}
    </Card>
  );
}

function EmployeePatrolsSection({
  employeeId,
  onOpen,
}: {
  employeeId: string;
  onOpen: (patrolId: string) => void;
}): React.ReactElement {
  const { data, isPending } = useEmployeePatrols(employeeId);
  const patrols = data?.items ?? [];

  return (
    <View style={styles.section}>
      <AppText variant="label" style={styles.sectionTitle}>
        История обходов
      </AppText>
      {isPending ? (
        <ActivityIndicator color={colors.primary} style={styles.sectionLoader} />
      ) : patrols.length === 0 ? (
        <AppText variant="caption" muted>
          Обходов пока нет.
        </AppText>
      ) : (
        patrols.map((patrol) => (
          <PatrolCard key={patrol.id} patrol={patrol} onPress={() => onOpen(patrol.id)} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  centerText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  badges: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  shopsTitle: {
    marginBottom: spacing.sm,
  },
  editAction: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  editActionText: {
    marginLeft: spacing.xs,
  },
  rotateRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  rotateText: {
    marginLeft: spacing.xs,
  },
  shopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  shopRowBorder: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
  },
  shopName: {
    flex: 1,
    marginRight: spacing.md,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  sectionLoader: {
    marginTop: spacing.md,
  },
});
