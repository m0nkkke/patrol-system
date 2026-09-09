import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Share, StyleSheet, TouchableOpacity, View } from 'react-native';

import type { CreatedControlGuard } from '@/api/control-staff.api';
import { describeError } from '@/api/error-messages';
import type { Shop } from '@/api/types';
import { useCreateControlGuard } from '@/features/control-staff/use-control-staff';
import { ShopSelectionField } from '@/features/shops/ShopSelectionField';
import { ShopSelectionModal } from '@/features/shops/ShopSelectionModal';
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
  SubmitButton,
  TextField,
} from '@/ui';

export default function CreateControlGuardScreen(): React.ReactElement {
  const router = useRouter();
  const networkStatus = useNetworkStatus();
  const create = useCreateControlGuard();
  const [fullName, setFullName] = useState('');
  const [selectedShops, setSelectedShops] = useState<Shop[]>([]);
  const [primaryShopId, setPrimaryShopId] = useState<string | undefined>();
  const [shopSelectionOpen, setShopSelectionOpen] = useState(false);
  const [createdGuard, setCreatedGuard] = useState<CreatedControlGuard | null>(null);

  function resetForm(): void {
    setFullName('');
    setSelectedShops([]);
    setPrimaryShopId(undefined);
    setCreatedGuard(null);
    create.reset();
  }

  if (createdGuard) {
    return (
      <CreatedGuardResult
        guard={createdGuard}
        shops={selectedShops}
        onCreateMore={resetForm}
        onDone={() => router.dismissTo('/control-staff')}
      />
    );
  }

  const isValid = fullName.trim().length >= 2 && selectedShops.length > 0;

  function handleSubmit(): void {
    if (!isValid || create.isPending || networkStatus !== 'online') {
      return;
    }

    create.mutate(
      {
        fullName: fullName.trim(),
        shopIds: selectedShops.map((shop) => shop.id),
      },
      { onSuccess: setCreatedGuard },
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <View style={styles.content}>
          <Header onBack={() => router.back()} />
          <FormHeader
            icon="person-outline"
            title="Новый сотрудник контроля"
            subtitle="Укажите сотрудника и назначьте доступные ему магазины"
          />

          <TextField
            autoCapitalize="words"
            icon="person-outline"
            label="ФИО"
            onChangeText={setFullName}
            placeholder="Иван Петров"
            required
            value={fullName}
          />

          <View style={styles.fieldGap}>
            <ShopSelectionField
              onPress={() => setShopSelectionOpen(true)}
              primaryShopId={primaryShopId}
              required
              selectedShops={selectedShops}
            />
          </View>

          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
            <AppText variant="caption" style={styles.noticeText}>
              Проверяющий может назначить только магазины из своей области доступа.
            </AppText>
          </View>
        </View>

        <View style={styles.flex} />

        <View style={styles.footer}>
          {networkStatus === 'offline' ? (
            <AppText variant="caption" color={colors.warning} style={styles.footerMessage}>
              Для создания сотрудника требуется подключение к интернету.
            </AppText>
          ) : null}
          {create.isError ? (
            <AppText variant="caption" color={colors.danger} style={styles.footerMessage}>
              {describeError(create.error)}
            </AppText>
          ) : null}
          <SubmitButton
            disabled={!isValid || networkStatus !== 'online'}
            label="Создать сотрудника"
            loading={create.isPending}
            onPress={handleSubmit}
          />
        </View>
      </KeyboardAvoidingView>

      <ShopSelectionModal
        applyLabel="Назначить магазины"
        onApply={(selection) => {
          setSelectedShops(selection.shops);
          setPrimaryShopId(selection.primaryShopId);
          setShopSelectionOpen(false);
        }}
        onClose={() => setShopSelectionOpen(false)}
        primaryShopId={primaryShopId}
        required
        selectedShops={selectedShops}
        visible={shopSelectionOpen}
      />
    </Screen>
  );
}

function CreatedGuardResult({
  guard,
  shops,
  onCreateMore,
  onDone,
}: {
  guard: CreatedControlGuard;
  shops: Shop[];
  onCreateMore: () => void;
  onDone: () => void;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const accessKey = guard.accessKey ?? '—';
  const visibleShops = shops.slice(0, 4).map((shop) => shop.name);
  const hiddenShopCount = shops.length - visibleShops.length;
  const shopsSummary = `${visibleShops.join(', ')}${hiddenShopCount > 0 ? `, и ещё ${hiddenShopCount}` : ''}`;

  async function copyAccessKey(): Promise<void> {
    await Clipboard.setStringAsync(accessKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function shareAccessKey(): Promise<void> {
    await Share.share({ message: `Ключ доступа: ${accessKey}` });
  }

  return (
    <ResultScreen
      onBack={onDone}
      footer={
        <>
          <Button
            icon="share-social-outline"
            label="Поделиться ключом"
            onPress={() => void shareAccessKey()}
          />
          <View style={styles.actionGap}>
            <Button
              icon="person-add-outline"
              label="Создать ещё"
              onPress={onCreateMore}
              variant="secondary"
            />
          </View>
          <View style={styles.doneGap}>
            <Button label="Готово" icon="checkmark-outline" onPress={onDone} variant="ghost" />
          </View>
        </>
      }
    >
      <ResultHeader
        celebration
        icon="checkmark"
        iconBackground={colors.successBackground}
        iconColor={colors.success}
        subtitle="Сотрудник может войти в приложение"
        title="Сотрудник создан!"
      />

      <Card style={styles.resultCard}>
        <View style={styles.resultHeading}>
          <View style={styles.personIcon}>
            <Ionicons name="person-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.resultCopy}>
            <AppText variant="heading" numberOfLines={2}>
              {guard.fullName}
            </AppText>
            <AppText variant="body" muted style={styles.resultRole}>
              Сотрудник контроля
            </AppText>
          </View>
        </View>
        <View style={styles.assignment}>
          <AppText variant="caption" muted>
            Магазины:
          </AppText>
          <AppText variant="body" style={styles.assignmentText}>
            {shopsSummary}
          </AppText>
        </View>
      </Card>

      <Card style={styles.keyCard}>
        <View style={styles.keyHeading}>
          <View style={styles.keyIcon}>
            <Ionicons name="key-outline" size={25} color={colors.success} />
          </View>
          <View style={styles.resultCopy}>
            <AppText variant="caption" muted>
              Ключ доступа
            </AppText>
            <AppText selectable variant="title" numberOfLines={2} style={styles.keyValue}>
              {accessKey}
            </AppText>
          </View>
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          activeOpacity={0.7}
          onPress={() => void copyAccessKey()}
          style={styles.copyAction}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'clipboard-outline'}
            size={17}
            color={colors.primary}
          />
          <AppText variant="label" color={colors.primary} style={styles.copyText}>
            {copied ? 'Ключ скопирован' : 'Скопировать ключ'}
          </AppText>
        </TouchableOpacity>
        <AppText variant="caption" muted style={styles.keyHint}>
          Передайте этот ключ сотруднику. После закрытия экрана он больше не показывается.
        </AppText>
      </Card>
    </ResultScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  fieldGap: { marginTop: spacing.lg },
  notice: {
    alignItems: 'center',
    backgroundColor: colors.controlSurface,
    borderColor: colors.controlBorder,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.xl,
    padding: spacing.md,
  },
  noticeText: { flex: 1, marginLeft: spacing.md },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: screenInsets.actionFooterBottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.actionFooterTop,
  },
  footerMessage: { marginBottom: spacing.sm },
  resultCard: { padding: spacing.lg },
  resultHeading: { alignItems: 'center', flexDirection: 'row' },
  personIcon: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.sm,
    height: 48,
    justifyContent: 'center',
    marginRight: spacing.lg,
    width: 48,
  },
  resultCopy: { flex: 1, minWidth: 0 },
  resultRole: { marginTop: spacing.xs },
  assignment: { marginLeft: 48 + spacing.lg, marginTop: spacing.lg },
  assignmentText: { marginTop: spacing.xs },
  keyCard: { marginTop: spacing.lg, padding: spacing.lg },
  keyHeading: { alignItems: 'center', flexDirection: 'row' },
  keyIcon: {
    alignItems: 'center',
    backgroundColor: colors.successBackground,
    borderRadius: radius.sm,
    height: 48,
    justifyContent: 'center',
    marginRight: spacing.lg,
    width: 48,
  },
  keyValue: { marginTop: spacing.sm },
  copyAction: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    marginLeft: 48 + spacing.lg,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  copyText: { marginLeft: spacing.xs },
  keyHint: { marginLeft: 48 + spacing.lg, marginTop: spacing.sm },
  actionGap: { marginTop: spacing.md },
  doneGap: { marginTop: spacing.sm },
});
