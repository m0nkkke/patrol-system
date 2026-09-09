import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { useDeleteUser, useRotateUserAccessKey, useUser } from '@/features/users/queries';
import { roleLabel } from '@/features/users/role';
import { userInitials } from '@/features/users/user-card-data';
import {
  canDeleteUser,
  userDetailCapabilities,
} from '@/features/users/user-detail-capabilities';
import { formatDateTime } from '@/lib/format';
import { useAuthStore } from '@/store/auth-store';
import { colors, radius, screenInsets, spacing } from '@/theme';
import {
  AppDialog,
  AppText,
  AsyncStateScreen,
  Badge,
  Button,
  Card,
  DashboardMenuPanel,
  type DashboardAction,
  DetailRow,
  Header,
  Screen,
} from '@/ui';
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
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { data: user, isPending, isError, error, refetch } = useUser(id);
  const rotate = useRotateUserAccessKey(id);
  const deleteMutation = useDeleteUser(id);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [copied, setCopied] = useState(false);

  if (isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }

  if (isError || !user) {
    return (
      <AsyncStateScreen
        message={describeError(error)}
        onBack={() => router.back()}
        onRetry={() => void refetch()}
      />
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

  function confirmDelete(): void {
    setDialog({
      title: 'Удалить пользователя?',
      message: 'Пользователь потеряет доступ к системе, а все его активные сессии будут отозваны. История действий сохранится.',
      tone: 'danger',
      actions: [
        {
          label: 'Удалить',
          variant: 'danger',
          onPress: () => {
            setDialog(null);
            deleteMutation.mutate(undefined, {
              onSuccess: () => router.dismissTo('/users'),
              onError: (deleteError) => {
                setDialog({
                  title: 'Не удалось удалить пользователя',
                  message: describeError(deleteError),
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

  const currentUser = user;

  function copyAccessKey(): void {
    if (!currentUser.accessKey) {
      return;
    }
    void Clipboard.setStringAsync(currentUser.accessKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const capabilities = userDetailCapabilities(user.role);
  const canDelete = canDeleteUser(user.id, currentUserId);
  const actions: DashboardAction[] = [];

  if (capabilities.canAssignShops) {
    actions.push({
      icon: 'storefront-outline',
      onPress: () =>
        router.push({ pathname: '/users/shops/[id]', params: { id: user.id } }),
      subtitle: 'Назначение доступных и основного магазина',
      title: 'Магазины',
    });
  }

  if (capabilities.canViewPatrolHistory) {
    actions.push({
      icon: 'document-text-outline',
      onPress: () =>
        router.push({
          pathname: '/history/employee/[id]',
          params: { id: user.id, name: user.fullName },
        }),
      subtitle: 'Все обходы пользователя',
      title: 'История обходов',
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
        <Header title="Пользователь" onBack={() => router.back()} />

        <Card style={styles.heroCard}>
          <View style={styles.heroMain}>
            <View
              style={[
                styles.avatar,
                !user.isActive && styles.avatarInactive,
              ]}
            >
              <AppText
                variant="heading"
                color={user.isActive ? colors.iconBlue : colors.danger}
                numberOfLines={1}
              >
                {userInitials(user.fullName)}
              </AppText>
            </View>
            <View style={styles.heroContent}>
              <AppText
                variant="heading"
                color={user.isActive ? colors.text : colors.textMuted}
                numberOfLines={3}
              >
                {user.fullName}
              </AppText>
              <View style={styles.badges}>
                <AppText variant="caption" muted>
                  {roleLabel(user.role)}
                </AppText>
                <Badge
                  icon="ellipse"
                  label={user.isActive ? 'Активен' : 'Неактивен'}
                  tone={user.isActive ? 'success' : 'danger'}
                />
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editAction}
            onPress={() => router.push({ pathname: '/users/edit/[id]', params: { id: user.id } })}
            accessibilityRole="button"
            accessibilityLabel="Редактировать пользователя"
            hitSlop={8}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <AppText variant="body" color={colors.primary} style={styles.editActionText}>
              Изменить
            </AppText>
          </TouchableOpacity>
        </Card>

        {!capabilities.hasAccessKey ? (
          <Card style={styles.detailsCard}>
            <DetailRow
              first
              icon="calendar-outline"
              label="Последний вход"
              value={formatDateTime(user.lastLoginAt)}
            />
          </Card>
        ) : (
          <AccessKeyCard
            accessKey={user.accessKey}
            copied={copied}
            lastLoginAt={user.lastLoginAt}
            rotating={rotate.isPending}
            onCopy={copyAccessKey}
            onRotate={confirmRotate}
          />
        )}

        {actions.length > 0 ? (
          <View style={styles.menu}>
            <DashboardMenuPanel actions={actions} />
          </View>
        ) : null}
        {canDelete ? (
          <View style={styles.deleteAction}>
            <Button
              label="Удалить пользователя"
              icon="trash-outline"
              variant="dangerOutline"
              loading={deleteMutation.isPending}
              onPress={confirmDelete}
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function AccessKeyCard({
  accessKey,
  copied,
  lastLoginAt,
  onCopy,
  onRotate,
  rotating,
}: {
  accessKey?: string;
  copied: boolean;
  lastLoginAt?: string;
  onCopy: () => void;
  onRotate: () => void;
  rotating: boolean;
}): React.ReactElement {
  return (
    <Card style={styles.accessCard}>
      <View style={styles.accessHeader}>
        <View style={styles.keyIcon}>
          <Ionicons name="key-outline" size={22} color={colors.success} />
        </View>
        <AppText variant="label">Ключ доступа</AppText>
      </View>

      <View style={styles.accessContent}>
        <AppText variant="caption" muted>
          Ключ доступа
        </AppText>
        <View style={styles.keyRow}>
          <AppText variant="heading" numberOfLines={2} style={styles.keyValue}>
            {accessKey ?? '—'}
          </AppText>
          {accessKey ? (
            <TouchableOpacity
              accessibilityLabel="Скопировать ключ доступа"
              hitSlop={10}
              onPress={onCopy}
              activeOpacity={0.7}
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={22}
                color={copied ? colors.success : colors.primary}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.accessDivider} />

        <View style={styles.loginRow}>
          <View style={styles.loginContent}>
            <AppText variant="caption" muted>
              Последний вход
            </AppText>
            <AppText variant="body" style={styles.loginValue}>
              {formatDateTime(lastLoginAt)}
            </AppText>
          </View>
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
        </View>

        <TouchableOpacity
          style={styles.rotateRow}
          onPress={onRotate}
          disabled={rotating}
          hitSlop={8}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={18} color={colors.primary} />
          <AppText variant="label" color={colors.primary} style={styles.rotateText}>
            {rotating ? 'Сброс…' : 'Сбросить ключ'}
          </AppText>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
    paddingBottom: screenInsets.bottom,
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
    marginTop: spacing.sm,
  },
  editAction: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    flexDirection: 'row',
    marginTop: spacing.md,
  },
  editActionText: {
    marginLeft: spacing.xs,
  },
  heroCard: {
    padding: spacing.lg,
  },
  heroMain: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.md,
    height: 64,
    justifyContent: 'center',
    marginRight: spacing.lg,
    width: 64,
  },
  avatarInactive: {
    backgroundColor: colors.dangerSurface,
  },
  heroContent: {
    flex: 1,
    minWidth: 0,
  },
  accessCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  accessHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  keyIcon: {
    alignItems: 'center',
    backgroundColor: colors.successBackground,
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 40,
  },
  accessContent: {
    marginLeft: 52,
    marginTop: spacing.lg,
  },
  keyRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  keyValue: {
    flex: 1,
    marginRight: spacing.md,
    minWidth: 0,
  },
  accessDivider: {
    backgroundColor: colors.border,
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.lg,
  },
  loginRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  loginContent: {
    flex: 1,
    marginRight: spacing.md,
  },
  loginValue: {
    marginTop: spacing.xs,
  },
  rotateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.lg,
  },
  rotateText: {
    marginLeft: spacing.xs,
  },
  detailsCard: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: 0,
  },
  menu: {
    marginTop: spacing.lg,
  },
  deleteAction: {
    marginTop: spacing.xxl,
  },
});
