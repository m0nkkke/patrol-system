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
import { usePatrolPoint } from '@/features/patrol-points/queries';
import { nfcReader } from '@/nfc';
import { useAuthStore } from '@/store/auth-store';
import { colors, screenInsets, spacing } from '@/theme';
import {
  AppText,
  AppDialog,
  AppToast,
  Button,
  Card,
  EntityIcon,
  FormHeader,
  Header,
  NfcScanOverlay,
  ResultHeader,
  ResultScreen,
  Screen,
  SectionHeading,
  StatusLabel,
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
  const pointQuery = usePatrolPoint(id);

  const [reason, setReason] = useState('');
  const [scanning, setScanning] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [done, setDone] = useState<NfcTagReplacement | null>(null);
  const [nfcDisabledDialogOpen, setNfcDisabledDialogOpen] = useState(false);

  const replace = useReplaceNfcTag(shopId);

  const busy = replace.isPending;
  const pointName = pointQuery.data?.name ?? name ?? 'Контрольная точка';
  const hasCurrentNfc = Boolean(pointQuery.data?.nfcTagId ?? pointQuery.data?.nfcTag?.id);

  function leaveCompletedReplacement(): void {
    router.dismissTo({ pathname: '/nfc-replace/[shopId]', params: { shopId } });
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
          title={done.oldNfcUid ? 'Метка заменена!' : 'Метка привязана!'}
          subtitle={pointName}
        />
        <Card style={styles.resultCard}>
          <EntityIcon icon="radio-outline" size="large" tone="success" />
          <View style={styles.resultCopy}>
            <AppText variant="label" numberOfLines={2}>{pointName}</AppText>
            <AppText variant="caption" muted style={styles.resultText}>
              {done.oldNfcUid
                ? 'Новая метка привязана, старая сохранена в истории.'
                : 'Метка привязана к контрольной точке.'}
            </AppText>
            <View style={styles.resultStatus}>
              <StatusLabel
                label={done.oldNfcUid ? 'Замена завершена' : 'Привязка завершена'}
                tone="success"
              />
            </View>
          </View>
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
        title={hasCurrentNfc ? 'Сканируем новую метку' : 'Сканируем метку'}
        subtitle={`Поднесите телефон к NFC-метке для точки «${pointName}».`}
        onCancel={() => void nfcReader.cancel()}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header onBack={() => router.back()} />
          <FormHeader
            icon={hasCurrentNfc ? 'swap-horizontal' : 'radio-outline'}
            title={hasCurrentNfc ? 'Замена NFC-метки' : 'Привязка NFC-метки'}
            subtitle={pointName}
          />

          <Card style={styles.pointCard}>
            <EntityIcon icon="location-outline" />
            <View style={styles.pointCopy}>
              <AppText variant="label" numberOfLines={2}>{pointName}</AppText>
              <View style={styles.pointStatus}>
                <StatusLabel
                  label={hasCurrentNfc ? 'Текущая метка активна' : 'Метка не привязана'}
                  tone={hasCurrentNfc ? 'success' : 'warning'}
                />
              </View>
            </View>
          </Card>

          <View style={styles.section}>
            <SectionHeading
              title="Данные замены"
              subtitle="Причина сохранится в истории NFC-метки"
            />
            <TextField
              label="Причина замены (необязательно)"
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
            <View style={styles.section}>
              <SectionHeading
                title={hasCurrentNfc ? 'Новая NFC-метка' : 'NFC-метка'}
                subtitle="Поднесите телефон к метке после запуска сканирования"
              />
              <Button
                label={hasCurrentNfc ? 'Сканировать новую метку' : 'Сканировать метку'}
                icon="scan-outline"
                onPress={() => void handleScanNfc()}
                disabled={busy}
              />
              {formError ? (
                <AppText variant="caption" color={colors.danger} style={styles.error}>
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
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
    paddingBottom: screenInsets.bottom,
  },
  binding: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  bindingText: {
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.xxl,
  },
  pointCard: {
    alignItems: 'center',
    flexDirection: 'row',
    padding: spacing.lg,
  },
  pointCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  pointStatus: {
    marginTop: spacing.sm,
  },
  resultCard: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  resultCopy: {
    flex: 1,
    marginLeft: spacing.lg,
    minWidth: 0,
  },
  resultText: {
    marginTop: spacing.xs,
  },
  resultStatus: {
    marginTop: spacing.md,
  },
  error: {
    marginTop: spacing.md,
  },
});
