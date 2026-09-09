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
import type { CreatedUser, Shop } from '@/api/types';
import { ShopSelectionField } from '@/features/shops/ShopSelectionField';
import { ShopSelectionModal } from '@/features/shops/ShopSelectionModal';
import { useCreateUser } from '@/features/users/queries';
import { ROLE_OPTIONS, roleLabel } from '@/features/users/role';
import { useNetworkStatus } from '@/lib/use-network-status';
import { colors, radius, screenInsets, spacing } from '@/theme';
import {
  AppText,
  Button,
  Card,
  FormHeader,
  Header,
  ResultHeader,
  ResultScreen,
  Screen,
  Select,
  SubmitButton,
  TextField,
} from '@/ui';

export default function CreateUserScreen(): React.ReactElement {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('security_guard');
  const [selectedShops, setSelectedShops] = useState<Shop[]>([]);
  const [primaryShopId, setPrimaryShopId] = useState<string | undefined>();
  const [shopSelectionOpen, setShopSelectionOpen] = useState(false);
  const [createdUser, setCreatedUser] = useState<CreatedUser | null>(null);
  const networkStatus = useNetworkStatus();

  const { mutate, isPending, isError, error } = useCreateUser();

  function resetForm(): void {
    setFullName('');
    setRole('security_guard');
    setSelectedShops([]);
    setPrimaryShopId(undefined);
    setCreatedUser(null);
  }

  if (createdUser) {
    return (
      <CreatedUserResult
        user={createdUser}
        shops={selectedShops}
        onCreateMore={resetForm}
        onDone={() => router.dismissTo('/users')}
      />
    );
  }

  const needsShop = role !== 'admin' && role !== 'route_setter';
  const isValid = fullName.trim().length >= 2 && (!needsShop || selectedShops.length > 0);

  function handleSubmit(): void {
    if (!isValid || isPending || networkStatus !== 'online') {
      return;
    }
    mutate(
      {
        fullName: fullName.trim(),
        role,
        isUniversalRouteSetter: role === 'route_setter',
        shopId: needsShop ? (primaryShopId ?? selectedShops[0]?.id) : undefined,
        shopIds: needsShop ? selectedShops.map((shop) => shop.id) : undefined,
      },
      { onSuccess: setCreatedUser },
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.topArea}>
          <Header onBack={() => router.back()} />
          <FormHeader
            icon="person-outline"
            title="Новый пользователь"
            subtitle="Создайте сотрудника и выдайте ключ"
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
            <Select
              label="Роль"
              required
              icon="shield-checkmark-outline"
              value={role}
              title="Роль пользователя"
              options={ROLE_OPTIONS}
              onChange={(value) => setRole(value as UserRole)}
            />
          </View>

          {needsShop ? (
            <View style={styles.gapLg}>
              <ShopSelectionField
                selectedShops={selectedShops}
                primaryShopId={primaryShopId}
                required
                onPress={() => setShopSelectionOpen(true)}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.flex} />

        {needsShop ? (
          <View style={styles.noticeWrap}>
            <View style={styles.accessNotice}>
              <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
              <AppText variant="body" style={styles.accessNoticeText}>
                Пользователь получит доступ только к выбранным магазинам
              </AppText>
            </View>
          </View>
        ) : null}

        <View style={styles.footer}>
          {networkStatus === 'offline' ? (
            <AppText variant="caption" color={colors.warning} style={styles.footerError}>
              Для создания пользователя требуется подключение к интернету.
            </AppText>
          ) : null}
          {isError ? (
            <AppText variant="caption" color={colors.danger} style={styles.footerError}>
              {describeError(error)}
            </AppText>
          ) : null}
          <SubmitButton
            label="Создать пользователя"
            onPress={handleSubmit}
            loading={isPending}
            disabled={!isValid || networkStatus !== 'online'}
          />
        </View>
      </KeyboardAvoidingView>

      <ShopSelectionModal
        visible={shopSelectionOpen}
        selectedShops={selectedShops}
        primaryShopId={primaryShopId}
        required
        onClose={() => setShopSelectionOpen(false)}
        onApply={(selection) => {
          setSelectedShops(selection.shops);
          setPrimaryShopId(selection.primaryShopId);
          setShopSelectionOpen(false);
        }}
      />
    </Screen>
  );
}

function CreatedUserResult({
  user,
  shops,
  onCreateMore,
  onDone,
}: {
  user: CreatedUser;
  shops: Shop[];
  onCreateMore: () => void;
  onDone: () => void;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);

  const accessKey = user.accessKey ?? '—';
  const assignedNames = shops.map((shop) => shop.name);
  const visibleShopNames = assignedNames.slice(0, 4);
  const hiddenShopCount = assignedNames.length - visibleShopNames.length;
  const shopsSummary = `${visibleShopNames.join(', ')}${hiddenShopCount > 0 ? `, и ещё ${hiddenShopCount}` : ''}`;

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
            <Button label="Создать ещё" onPress={onCreateMore} />
          </View>
          <View style={styles.gapSm}>
            <Button label="Готово" icon="checkmark-outline" variant="ghost" onPress={onDone} />
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
        celebration
      />

      <Card style={styles.userCard}>
        <View style={styles.userHeading}>
          <View style={styles.userIcon}>
            <Ionicons name="person-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.userInfo}>
            <AppText variant="heading" numberOfLines={2}>
              {user.fullName}
            </AppText>
            <AppText variant="body" muted style={styles.userRole}>
              {roleLabel(user.role)}
            </AppText>
          </View>
        </View>
        {shopsSummary ? (
          <View style={styles.assignedShops}>
            <AppText variant="caption" muted>
              Магазины:
            </AppText>
            <AppText variant="body" style={styles.assignedShopNames}>
              {shopsSummary}
            </AppText>
          </View>
        ) : null}
      </Card>

      <Card style={styles.keyCard}>
        <View style={styles.keyHeading}>
          <View style={styles.keyIcon}>
            <Ionicons name="key-outline" size={25} color={colors.success} />
          </View>
          <View style={styles.keyContent}>
            <AppText variant="caption" muted>
              Ключ доступа
            </AppText>
            <AppText variant="title" selectable numberOfLines={2} style={styles.keyValue}>
              {accessKey}
            </AppText>
          </View>
        </View>
        <View style={styles.keyActions}>
          <TouchableOpacity
            style={styles.copyLink}
            onPress={() => void handleCopy()}
            activeOpacity={0.7}
          >
            <Ionicons
              name={copied ? 'checkmark' : 'clipboard-outline'}
              size={16}
              color={colors.primary}
            />
            <AppText variant="label" color={colors.primary} style={styles.copyLinkText}>
              {copied ? 'Ключ скопирован' : 'Скопировать ключ'}
            </AppText>
          </TouchableOpacity>
          <AppText variant="caption" muted style={styles.keyHint}>
            Передайте этот ключ сотруднику
          </AppText>
        </View>
      </Card>
    </ResultScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  topArea: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  noticeWrap: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: spacing.sm,
  },
  accessNotice: {
    alignItems: 'center',
    backgroundColor: colors.controlSurface,
    borderRadius: radius.md,
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  accessNoticeText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: screenInsets.actionFooterBottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.actionFooterTop,
  },
  footerError: {
    marginBottom: spacing.sm,
  },
  userCard: {
    padding: spacing.lg,
  },
  userHeading: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  userIcon: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.sm,
    height: 48,
    justifyContent: 'center',
    marginRight: spacing.lg,
    width: 48,
  },
  userInfo: {
    flex: 1,
    minWidth: 0,
  },
  userRole: {
    marginTop: spacing.xs,
  },
  assignedShops: {
    marginLeft: 48 + spacing.lg,
    marginTop: spacing.lg,
  },
  assignedShopNames: {
    marginTop: spacing.xs,
  },
  keyCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  keyHeading: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  keyIcon: {
    alignItems: 'center',
    backgroundColor: colors.successBackground,
    borderRadius: radius.sm,
    height: 48,
    justifyContent: 'center',
    marginRight: spacing.lg,
    width: 48,
  },
  keyContent: {
    flex: 1,
    minWidth: 0,
  },
  keyValue: {
    marginTop: spacing.sm,
  },
  keyActions: {
    borderTopColor: colors.border,
    borderStyle: 'dashed',
    borderTopWidth: 1,
    marginLeft: 48 + spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  copyLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
  },
  copyLinkText: {
    marginLeft: spacing.xs,
  },
  keyHint: {
    marginTop: spacing.sm,
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
});
