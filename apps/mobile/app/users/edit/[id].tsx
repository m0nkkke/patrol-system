import type { UserRole } from '@patrol/shared';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { ShopMultiSelectList } from '@/features/shops/ShopMultiSelectList';
import { ROLE_ICONS } from '@/features/users/role';
import { useDeleteUser, useUpdateUser, useUser } from '@/features/users/queries';
import { colors, spacing } from '@/theme';
import {
  AppText,
  AppDialog,
  Button,
  FieldLabel,
  FormHeader,
  Header,
  Screen,
  SegmentedControl,
  type SegmentOption,
  TextField,
} from '@/ui';

const ROLE_SEGMENTS: SegmentOption<UserRole>[] = [
  { value: 'employee', label: 'Обходчик', icon: ROLE_ICONS.employee },
  { value: 'manager', label: 'Менеджер', icon: ROLE_ICONS.manager },
  { value: 'admin', label: 'Админ', icon: ROLE_ICONS.admin },
];

type StatusValue = 'active' | 'inactive';

const STATUS_SEGMENTS: SegmentOption<StatusValue>[] = [
  { value: 'active', label: 'Активен', icon: 'checkmark-circle-outline' },
  { value: 'inactive', label: 'Неактивен', icon: 'close-circle-outline' },
];

export default function EditUserScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: user, isPending, isError, error, refetch } = useUser(id);
  const { mutate, isPending: isSaving, isError: isSaveError, error: saveError } = useUpdateUser(id);
  const {
    mutate: deleteUser,
    isPending: isDeleting,
    isError: isDeleteError,
    error: deleteError,
  } = useDeleteUser(id);

  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [status, setStatus] = useState<StatusValue>('active');
  const [shopIds, setShopIds] = useState<string[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    if (!user || seeded) {
      return;
    }
    setFullName(user.fullName);
    setRole(user.role);
    setStatus(user.isActive ? 'active' : 'inactive');
    const ids = user.shopIds ?? (user.shops ?? []).map((shop) => shop.id);
    const primary = user.shopId;
    setShopIds(primary ? [primary, ...ids.filter((shopId) => shopId !== primary)] : ids);
    setSeeded(true);
  }, [user, seeded]);

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

  const needsShop = role !== 'admin';
  const isValid = fullName.trim().length >= 2 && (!needsShop || shopIds.length > 0);

  function toggleShop(shopId: string): void {
    setShopIds((prev) =>
      prev.includes(shopId) ? prev.filter((value) => value !== shopId) : [...prev, shopId],
    );
  }

  function setPrimaryShop(shopId: string): void {
    setShopIds((prev) =>
      prev.includes(shopId) ? [shopId, ...prev.filter((value) => value !== shopId)] : prev,
    );
  }

  function handleSubmit(): void {
    if (!isValid || isSaving || isDeleting) {
      return;
    }
    mutate(
      {
        fullName: fullName.trim(),
        role,
        isActive: status === 'active',
        shopId: needsShop ? shopIds[0] : undefined,
        shopIds: needsShop ? shopIds : undefined,
      },
      { onSuccess: () => router.back() },
    );
  }

  function handleDelete(): void {
    if (isDeleting) {
      return;
    }
    deleteUser(undefined, {
      onSuccess: () => router.replace('/users'),
      onSettled: () => setDeleteDialogVisible(false),
    });
  }

  return (
    <Screen padded={false}>
      <AppDialog
        visible={deleteDialogVisible}
        title="Удалить пользователя?"
        message="Пользователь исчезнет из приложения и обычных списков. История обходов и отчеты останутся в базе, а активные сессии будут отозваны."
        tone="danger"
        actions={[
          {
            label: isDeleting ? 'Удаление...' : 'Удалить',
            variant: 'danger',
            onPress: handleDelete,
          },
          {
            label: 'Отмена',
            variant: 'ghost',
            onPress: () => setDeleteDialogVisible(false),
          },
        ]}
        onClose={() => setDeleteDialogVisible(false)}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topArea}>
          <Header onBack={() => router.back()} />
          <FormHeader icon="create" title="Редактирование" subtitle="Изменение данных пользователя" />

          <TextField
            label="ФИО"
            required
            icon="person-outline"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Иван Петров"
            autoCapitalize="words"
          />

          <View style={styles.gapLg}>
            <FieldLabel label="Роль" required />
            <SegmentedControl options={ROLE_SEGMENTS} value={role} onChange={setRole} />
          </View>

          <View style={styles.gapLg}>
            <FieldLabel label="Статус" />
            <SegmentedControl options={STATUS_SEGMENTS} value={status} onChange={setStatus} />
          </View>

          {needsShop ? (
            <View style={styles.gapLg}>
              <FieldLabel label="Магазины" required />
            </View>
          ) : null}
        </View>

        {needsShop ? (
          <View style={styles.shopArea}>
            <ShopMultiSelectList
              selectedIds={shopIds}
              onToggle={toggleShop}
              onSetPrimary={setPrimaryShop}
            />
          </View>
        ) : (
          <View style={styles.flex} />
        )}

        <View style={styles.footer}>
          {isSaveError || isDeleteError ? (
            <AppText variant="caption" color={colors.danger} style={styles.footerError}>
              {describeError(saveError ?? deleteError)}
            </AppText>
          ) : null}
          <Button
            label="Сохранить"
            icon="checkmark-circle-outline"
            onPress={handleSubmit}
            loading={isSaving}
            disabled={!isValid || isDeleting}
          />
          <View style={styles.deleteButton}>
            <Button
              label="Удалить пользователя"
              icon="trash-outline"
              variant="dangerSecondary"
              onPress={() => setDeleteDialogVisible(true)}
              loading={isDeleting}
              disabled={isSaving}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topArea: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  shopArea: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  centerText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  footerError: {
    marginBottom: spacing.sm,
  },
  deleteButton: {
    marginTop: spacing.md,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
});
