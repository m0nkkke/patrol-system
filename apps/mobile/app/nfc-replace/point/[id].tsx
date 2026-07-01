import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import type { NfcTagReplacement } from '@/api/patrol-points.api';
import { useReplaceNfcTag } from '@/features/nfc-replace/queries';
import { nfcReader } from '@/nfc';
import { useAuthStore } from '@/store/auth-store';
import { colors, spacing } from '@/theme';
import {
  AppText,
  AppDialog,
  AppToast,
  Button,
  Card,
  FormHeader,
  Header,
  NfcScanOverlay,
  ResultHeader,
  ResultScreen,
  Screen,
  TextField,
} from '@/ui';

export default function NfcReplaceScreen(): React.ReactElement {
  const router = useRouter();
  const { id, shopId, name } = useLocalSearchParams<{
    id: string;
    shopId: string;
    name: string;
  }>();
  const replacedBy = useAuthStore((state) => state.user?.id);

  const [reason, setReason] = useState('');
  const [scanning, setScanning] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [done, setDone] = useState<NfcTagReplacement | null>(null);
  const [nfcDisabledDialogOpen, setNfcDisabledDialogOpen] = useState(false);

  const replace = useReplaceNfcTag(shopId);

  const busy = replace.isPending;

  function leaveCompletedReplacement(): void {
    router.replace({ pathname: '/nfc-replace/[shopId]', params: { shopId } });
  }

  function submitUid(rawUid: string): void {
    replace.mutate(
      {
        pointId: id,
        payload: {
          uid: rawUid.trim().toLowerCase(),
          reason: reason.trim() || undefined,
          replacedBy,
        },
      },
      { onSuccess: setDone },
    );
  }

  async function handleScanNfc(): Promise<void> {
    if (busy) {
      return;
    }
    setNfcError(null);
    const supported = await nfcReader.isAvailable();
    if (!supported) {
      setNfcError('NFC недоступен на этом устройстве.');
      return;
    }

    const enabled = await nfcReader.isEnabled();
    if (!enabled) {
      setNfcDisabledDialogOpen(true);
      return;
    }

    let scannedUid: string;
    setScanning(true);
    try {
      scannedUid = await nfcReader.readUid();
    } catch {
      setNfcError('Не удалось считать NFC-метку.');
      return;
    } finally {
      setScanning(false);
    }
    submitUid(scannedUid);
  }

  if (done) {
    return (
      <ResultScreen
        onBack={leaveCompletedReplacement}
        footer={
          <Button
            label="Готово"
            icon="checkmark-outline"
            onPress={leaveCompletedReplacement}
          />
        }
      >
        <ResultHeader
          icon="checkmark"
          iconColor={colors.success}
          iconBackground={colors.successBackground}
          title="Метка заменена!"
          subtitle={name}
        />
        <Card style={styles.gapLg}>
          <AppText variant="body" muted>
            Новая метка привязана к точке. Старая метка архивирована.
          </AppText>
        </Card>
      </ResultScreen>
    );
  }

  const formError = nfcError ?? (replace.isError ? describeError(replace.error) : null);

  return (
    <Screen padded={false}>
      <AppToast message={formError} />
      <AppDialog
        visible={nfcDisabledDialogOpen}
        title="NFC выключен"
        message="Включите NFC в настройках телефона и повторите сканирование."
        tone="warning"
        actions={[
          {
            label: 'Открыть настройки',
            onPress: () => {
              setNfcDisabledDialogOpen(false);
              void nfcReader.openSettings();
            },
          },
          { label: 'Позже', onPress: () => setNfcDisabledDialogOpen(false), variant: 'ghost' },
        ]}
        onClose={() => setNfcDisabledDialogOpen(false)}
      />
      <NfcScanOverlay
        visible={scanning}
        title="Сканируем новую метку"
        subtitle="Поднесите телефон к новой NFC-метке для этой точки."
        onCancel={() => void nfcReader.cancel()}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header onBack={() => router.back()} />
          <FormHeader icon="swap-horizontal" title="Замена NFC-метки" subtitle={name} />

          <View>
            <TextField
              label="Причина замены"
              icon="document-text-outline"
              value={reason}
              onChangeText={setReason}
              placeholder="например, повреждён корпус метки"
            />
          </View>

          {busy ? (
            <View style={styles.binding}>
              <ActivityIndicator color={colors.primary} />
              <AppText variant="caption" muted style={styles.bindingText}>
                Привязываем новую метку…
              </AppText>
            </View>
          ) : (
            <View style={styles.gapXl}>
              <Button
                label="Сканировать новую метку"
                icon="scan-outline"
                onPress={() => void handleScanNfc()}
                disabled={busy}
              />
              <AppText variant="caption" muted style={styles.gapLg}>
                При нажатии проверим NFC и подскажем, если его нужно включить.
              </AppText>
              {formError ? (
                <AppText variant="caption" color={colors.danger} style={styles.gapLg}>
                  {formError}
                </AppText>
              ) : null}
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  binding: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  bindingText: {
    marginTop: spacing.md,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  gapXl: {
    marginTop: spacing.xl,
  },
});
