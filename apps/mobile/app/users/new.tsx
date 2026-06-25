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
import { useShops } from '@/features/route-setup/queries';
import { ShopSelectList } from '@/features/shops/ShopSelectList';
import { useCreateUser } from '@/features/users/queries';
import { ROLE_ICONS } from '@/features/users/role';
import { RoleBadge } from '@/features/users/RoleBadge';
import { getInitials } from '@/lib/initials';
import { colors, radius, spacing } from '@/theme';
import {
  AppText,
  Avatar,
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
  const [shopId, setShopId] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);

  const { mutate, isPending, isError, error } = useCreateUser();

  function resetForm(): void {
    setFullName('');
    setRole('employee');
    setShopId(null);
    setCreatedUser(null);
  }

  if (createdUser) {
    return (
      <CreatedUserResult user={createdUser} onCreateMore={resetForm} onDone={() => router.back()} />
    );
  }

  const needsShop = role !== 'admin';
  const isValid = fullName.trim().length >= 2 && (!needsShop || shopId !== null);

  function handleSubmit(): void {
    if (!isValid || isPending) {
      return;
    }
    mutate(
      {
        fullName: fullName.trim(),
        role,
        shopId: needsShop ? (shopId ?? undefined) : undefined,
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
              <FieldLabel label="Магазин" required />
            </View>
          ) : null}
        </View>

        {needsShop ? (
          <View style={styles.shopArea}>
            <ShopSelectList selectedId={shopId} onSelect={setShopId} />
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
  onCreateMore,
  onDone,
}: {
  user: CreatedUser;
  onCreateMore: () => void;
  onDone: () => void;
}): React.ReactElement {
  const { data: shops } = useShops();
  const [copied, setCopied] = useState(false);

  const accessKey = user.accessKey ?? '—';
  const shopName = user.shopId
    ? ((shops ?? []).find((shop) => shop.id === user.shopId)?.name ?? '')
    : '';

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

        <View style={styles.userCard}>
          <Avatar initials={getInitials(user.fullName)} size={52} />
          <View style={styles.userInfo}>
            <View style={styles.userRole}>
              <RoleBadge role={user.role} />
            </View>
            <AppText variant="heading">{user.fullName}</AppText>
            {shopName ? (
              <AppText variant="caption" muted style={styles.userShop}>
                {shopName}
              </AppText>
            ) : null}
          </View>
        </View>

        <View style={styles.keyCard}>
          <View style={styles.keyTitleRow}>
            <Ionicons name="key-outline" size={16} color={colors.primary} />
            <AppText variant="label" color={colors.primary} style={styles.keyTitle}>
              Ключ доступа
            </AppText>
          </View>
          <AppText variant="title" selectable style={styles.keyValue}>
            {accessKey}
          </AppText>
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => void handleCopy()}
            activeOpacity={0.8}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'copy-outline'}
              size={16}
              color={colors.textInverse}
            />
            <AppText variant="label" color={colors.textInverse} style={styles.copyText}>
              {copied ? 'Скопировано' : 'Копировать'}
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
  userCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.lg,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.lg,
  },
  userRole: {
    marginBottom: spacing.xs,
  },
  userShop: {
    marginTop: spacing.xs,
  },
  keyCard: {
    backgroundColor: colors.iconBlueBackground,
    borderColor: colors.iconBlueBorder,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  keyTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  keyTitle: {
    letterSpacing: 0.6,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
  },
  keyValue: {
    letterSpacing: 2,
    marginVertical: spacing.md,
  },
  copyButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  copyText: {
    marginLeft: spacing.xs,
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
