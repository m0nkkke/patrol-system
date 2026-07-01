import { Ionicons } from '@expo/vector-icons';
import type { UserRole } from '@patrol/shared';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import type { CreatedUser } from '@/api/types';
import { useShopsByIds } from '@/features/route-setup/queries';
import { ShopMultiSelectList } from '@/features/shops/ShopMultiSelectList';
import { useCreateUser } from '@/features/users/queries';
import { ROLE_ICONS, roleLabel } from '@/features/users/role';
import { colors, radius, spacing } from '@/theme';
import {
  AppText,
  Button,
  FieldLabel,
  FormHeader,
  Header,
  ResultHeader,
  ResultScreen,
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

export default function CreateUserScreen(): React.ReactElement {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [shopIds, setShopIds] = useState<string[]>([]);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);

  const { mutate, isPending, isError, error } = useCreateUser();

  function resetForm(): void {
    setFullName('');
    setRole('employee');
    setShopIds([]);
    setCreatedUser(null);
  }

  function toggleShop(shopId: string): void {
    setShopIds((prev) =>
      prev.includes(shopId) ? prev.filter((id) => id !== shopId) : [...prev, shopId],
    );
  }

  function setPrimaryShop(shopId: string): void {
    setShopIds((prev) =>
      prev.includes(shopId) ? [shopId, ...prev.filter((id) => id !== shopId)] : prev,
    );
  }

  if (createdUser) {
    return (
      <CreatedUserResult
        user={createdUser}
        shopIds={shopIds}
        onCreateMore={resetForm}
        onDone={() => router.replace('/users')}
      />
    );
  }

  const needsShop = role !== 'admin';
  const isValid = fullName.trim().length >= 2 && (!needsShop || shopIds.length > 0);

  function handleSubmit(): void {
    if (!isValid || isPending) {
      return;
    }
    mutate(
      {
        fullName: fullName.trim(),
        role,
        shopId: needsShop ? shopIds[0] : undefined,
        shopIds: needsShop ? shopIds : undefined,
      },
      { onSuccess: setCreatedUser },
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topArea}>
          <Header onBack={() => router.back()} />
          <FormHeader
            icon="person-add"
            title="Новый пользователь"
            subtitle="Создание сотрудника, выдача ключа"
          />

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
          {isError ? (
            <AppText variant="caption" color={colors.danger} style={styles.footerError}>
              {describeError(error)}
            </AppText>
          ) : null}
          <Button
            label="Создать пользователя"
            icon="checkmark-circle-outline"
            onPress={handleSubmit}
            loading={isPending}
            disabled={!isValid}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function CreatedUserResult({
  user,
  shopIds,
  onCreateMore,
  onDone,
}: {
  user: CreatedUser;
  shopIds: string[];
  onCreateMore: () => void;
  onDone: () => void;
}): React.ReactElement {
  const shops = useShopsByIds(shopIds);
  const [copied, setCopied] = useState(false);

  const accessKey = user.accessKey ?? '—';
  const assignedNames = shops.map((shop) => shop.name);
  const shopsLabel =
    assignedNames.length === 0
      ? ''
      : assignedNames.length === 1
        ? `Магазин: ${assignedNames[0]}`
        : `Магазины: ${assignedNames.join(', ')}`;

  async function handleCopy(): Promise<void> {
    try {
      await Clipboard.setStringAsync(accessKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  }

  async function handleShare(): Promise<void> {
    try {
      await Share.share({ message: `Ключ доступа: ${accessKey}` });
    } catch {
      // ignore
    }
  }

  return (
    <ResultScreen
      onBack={onDone}
      footer={
        <>
          <Button
            label="Поделиться ключом"
            icon="share-social-outline"
            onPress={() => void handleShare()}
          />
          <View style={styles.gapMd}>
            <Button
              label="Создать ещё"
              variant="secondary"
              icon="person-add-outline"
              onPress={onCreateMore}
            />
          </View>
          <View style={styles.gapSm}>
            <Button label="Готово" variant="ghost" onPress={onDone} />
          </View>
        </>
      }
    >
      <ResultHeader
        icon="checkmark"
          iconColor={colors.success}
          iconBackground={colors.successBackground}
          title="Пользователь создан!"
          subtitle="Сотрудник может войти в систему"
        />

        <View style={styles.infoCard}>
          <AppText variant="heading">{user.fullName}</AppText>
          <AppText variant="caption" muted style={styles.gapXs}>
            {roleLabel(user.role)}
          </AppText>
          {shopsLabel ? (
            <AppText variant="caption" muted style={styles.gapXs}>
              {shopsLabel}
            </AppText>
          ) : null}
        </View>

        <View style={[styles.infoCard, styles.gapLg]}>
          <AppText variant="caption" muted>
            Ключ доступа
          </AppText>
          <AppText variant="title" selectable style={styles.keyValue}>
            {accessKey}
          </AppText>
          <TouchableOpacity
            style={styles.copyLink}
            onPress={() => void handleCopy()}
            activeOpacity={0.7}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={16}
              color={colors.primary}
            />
            <AppText variant="label" color={colors.primary} style={styles.copyLinkText}>
              {copied ? 'Скопировано' : 'Скопировать'}
            </AppText>
          </TouchableOpacity>
        </View>
    </ResultScreen>
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
  infoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  keyValue: {
    letterSpacing: 2,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  copyLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
  },
  copyLinkText: {
    marginLeft: spacing.xs,
  },
  gapXs: {
    marginTop: spacing.xs,
  },
  gapSm: {
    marginTop: spacing.sm,
  },
  gapMd: {
    marginTop: spacing.md,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  gapXl: {
    marginTop: spacing.xl,
  },
});
