import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import type { RouteSetupState } from '@/api/types';
import {
  useResetRouteSetup,
  useRouteSetup,
  useScanRoutePoint,
  useStartRouteSetup,
} from '@/features/route-setup/queries';
import { nfcReader } from '@/nfc';
import { useAuthStore } from '@/store/auth-store';
import { colors, radius, spacing } from '@/theme';
import {
  AppText,
  AppDialog,
  AppToast,
  Button,
  Card,
  FormHeader,
  Header,
  NfcScanOverlay,
  ProgressBar,
  ResultHeader,
  ResultScreen,
  Screen,
  TextField,
} from '@/ui';

export default function RouteSetupScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const userRole = useAuthStore((state) => state.user?.role);
  const { data: state, isPending, isError, error, refetch } = useRouteSetup(shopId);

  function leaveCompletedRouteSetup(): void {
    if (userRole === 'admin') {
      router.replace('/route-setup/shops');
      return;
    }

    router.replace('/');
  }

  if (isPending) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (isError || !state) {
    return (
      <Screen centered>
        <AppText muted style={styles.centerText}>
          {describeError(error)}
        </AppText>
        <Button label="Повторить" variant="secondary" onPress={() => void refetch()} />
      </Screen>
    );
  }

  if (state.expectedPoints === 0 || state.routeStatus === 'not_configured') {
    return <NumberStep shopId={shopId} onBack={() => router.back()} />;
  }

  if (state.nextSortOrder === undefined) {
    return <DoneStep shopId={shopId} state={state} onDone={leaveCompletedRouteSetup} />;
  }

  return <PointStep shopId={shopId} state={state} onBack={() => router.back()} />;
}

function NumberStep({
  shopId,
  onBack,
}: {
  shopId: string;
  onBack: () => void;
}): React.ReactElement {
  const [value, setValue] = useState('');
  const { mutate, isPending, isError, error } = useStartRouteSetup(shopId);

  const expectedPoints = Number.parseInt(value, 10);
  const isValid = Number.isInteger(expectedPoints) && expectedPoints >= 1 && expectedPoints <= 32767;
  const formError = isError ? describeError(error) : null;

  function handleStart(): void {
    if (!isValid || isPending) {
      return;
    }
    mutate({ expectedPoints });
  }

  return (
    <Screen padded={false}>
      <AppToast message={formError} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topArea}>
          <Header onBack={onBack} />
          <FormHeader
            icon="git-network-outline"
            title="Настройка маршрута"
            subtitle="Сколько контрольных точек в магазине?"
          />
          <TextField
            label="Количество точек"
            required
            icon="layers-outline"
            value={value}
            onChangeText={setValue}
            placeholder="например, 12"
            keyboardType="number-pad"
            error={formError}
          />
          <AppText variant="caption" muted style={styles.hint}>
            После старта точки регистрируются по очереди — по одной.
          </AppText>
        </View>

        <View style={styles.flex} />

        <View style={styles.footer}>
          <Button
            label="Начать настройку"
            icon="play-outline"
            onPress={handleStart}
            loading={isPending}
            disabled={!isValid}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function PointStep({
  shopId,
  state,
  onBack,
}: {
  shopId: string;
  state: RouteSetupState;
  onBack: () => void;
}): React.ReactElement {
  const current = state.nextSortOrder ?? state.expectedPoints;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scanning, setScanning] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [justBound, setJustBound] = useState<number | null>(null);
  const [dialog, setDialog] = useState<{
    actions: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
    message: string;
    title: string;
    tone: 'danger' | 'info' | 'success' | 'warning';
  } | null>(null);

  const { mutate, isPending, isError, error } = useScanRoutePoint(shopId);
  const reset = useResetRouteSetup(shopId);

  useEffect(() => {
    if (justBound === null) {
      return;
    }
    const timer = setTimeout(() => setJustBound(null), 4000);
    return () => clearTimeout(timer);
  }, [justBound]);

  const nameValid = name.trim().length >= 1;
  const busy = isPending;

  function bind(rawUid: string): void {
    if (!nameValid || busy) {
      return;
    }
    const boundNumber = current;
    mutate(
      {
        uid: rawUid.trim().toLowerCase(),
        name: name.trim(),
        description: description.trim() || undefined,
      },
      {
        onSuccess: () => {
          Keyboard.dismiss();
          setName('');
          setDescription('');
          setNfcError(null);
          setJustBound(boundNumber);
        },
      },
    );
  }

  async function handleScanNfc(): Promise<void> {
    if (!nameValid || busy) {
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
      setDialog({
        actions: [
          {
            label: 'Открыть настройки',
            onPress: () => {
              setDialog(null);
              void nfcReader.openSettings();
            },
          },
          { label: 'Позже', onPress: () => setDialog(null), variant: 'ghost' },
        ],
        message: 'Включите NFC в настройках телефона и повторите сканирование.',
        title: 'NFC выключен',
        tone: 'warning',
      });
      return;
    }

    setScanning(true);
    try {
      const scannedUid = await nfcReader.readUid();
      bind(scannedUid);
    } catch {
      setNfcError('Не удалось считать NFC-метку.');
    } finally {
      setScanning(false);
    }
  }

  const formError = nfcError ?? (isError ? describeError(error) : null);

  function confirmReset(): void {
    setDialog({
      actions: [
        {
          label: 'Начать заново',
          onPress: () => {
            setDialog(null);
            reset.mutate();
          },
          variant: 'danger',
        },
        { label: 'Отмена', onPress: () => setDialog(null), variant: 'ghost' },
      ],
      message: 'Все уже зарегистрированные точки этого маршрута будут удалены.',
      title: 'Начать настройку заново?',
      tone: 'danger',
    });
  }

  return (
    <Screen padded={false}>
      <AppToast message={formError} />
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
      <NfcScanOverlay
        visible={scanning}
        title={`Сканируем точку №${current}`}
        subtitle="Поднесите телефон к NFC-метке этой контрольной точки."
        onCancel={() => void nfcReader.cancel()}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topArea}>
          <Header onBack={onBack} />
          <View>
            <Card>
              <AppText variant="label">
                Точка {current} из {state.expectedPoints}
              </AppText>
              <View style={styles.progressWrap}>
                <ProgressBar value={state.registeredPoints} max={state.expectedPoints} />
              </View>
              <AppText variant="caption" muted style={styles.gapSm}>
                Зарегистрировано {state.registeredPoints} из {state.expectedPoints}
              </AppText>
            </Card>
            {justBound !== null ? (
              <View style={styles.toastOverlay} pointerEvents="none">
                <View style={styles.toast}>
                  <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                  <AppText variant="label" color={colors.success} style={styles.toastText}>
                    Точка №{justBound} привязана
                  </AppText>
                </View>
              </View>
            ) : null}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TextField
            label="Название точки"
            required
            icon="pricetag-outline"
            value={name}
            onChangeText={setName}
            placeholder="например, Электрощитовая"
          />
          <View style={styles.gapLg}>
            <TextField
              label="Краткое описание"
              icon="document-text-outline"
              value={description}
              onChangeText={setDescription}
              placeholder="Заметка (необязательно)"
            />
          </View>

          {busy ? (
            <View style={styles.binding}>
              <ActivityIndicator color={colors.primary} />
              <AppText variant="caption" muted style={styles.bindingText}>
                Привязываем метку к точке №{current}…
              </AppText>
            </View>
          ) : (
            <View style={styles.gapXl}>
              <Button
                label="Сканировать NFC метку"
                icon="scan-outline"
                onPress={() => void handleScanNfc()}
                disabled={!nameValid || busy}
              />
              <AppText variant="caption" muted style={styles.gapLg}>
                {nameValid
                  ? 'При нажатии проверим NFC и подскажем, если его нужно включить.'
                  : 'Сначала введите название точки.'}
              </AppText>
              {formError ? (
                <AppText variant="caption" color={colors.danger} style={styles.gapLg}>
                  {formError}
                </AppText>
              ) : null}
            </View>
          )}

          <View style={styles.gapXl}>
            <Button
              label="Начать заново"
              variant="ghost"
              icon="refresh-outline"
              onPress={confirmReset}
              loading={reset.isPending}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function DoneStep({
  shopId,
  state,
  onDone,
}: {
  shopId: string;
  state: RouteSetupState;
  onDone: () => void;
}): React.ReactElement {
  const points = [...state.points].sort((a, b) => a.sortOrder - b.sortOrder);
  const reset = useResetRouteSetup(shopId);
  const [dialogOpen, setDialogOpen] = useState(false);

  function confirmReset(): void {
    setDialogOpen(true);
  }

  return (
    <ResultScreen
      onBack={onDone}
      footer={
        <>
          <Button label="Готово" icon="checkmark-outline" onPress={onDone} />
          <View style={styles.gapSm}>
            <Button
              label="Настроить заново"
              variant="secondary"
              icon="refresh-outline"
              onPress={confirmReset}
              loading={reset.isPending}
            />
          </View>
        </>
      }
    >
      <AppDialog
        visible={dialogOpen}
        title="Настроить маршрут заново?"
        message="Все точки этого маршрута будут удалены, настройку начнёте с начала."
        tone="danger"
        actions={[
          {
            label: 'Настроить заново',
            onPress: () => {
              setDialogOpen(false);
              reset.mutate();
            },
            variant: 'danger',
          },
          { label: 'Отмена', onPress: () => setDialogOpen(false), variant: 'ghost' },
        ]}
        onClose={() => setDialogOpen(false)}
      />
      <ResultHeader
        icon="checkmark"
        iconColor={colors.success}
        iconBackground={colors.successBackground}
        title="Маршрут готов!"
        subtitle={`${state.expectedPoints} точек в маршруте`}
      />
      <AppText variant="label" style={styles.doneTitle}>
        Точки маршрута
      </AppText>
      {points.map((point) => (
        <Card key={point.id} style={styles.donePointCard}>
          <AppText variant="body">
            {point.sortOrder}. {point.name.trim().length > 0 ? point.name : 'Без названия'}
          </AppText>
        </Card>
      ))}
    </ResultScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  centerText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  topArea: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  hint: {
    marginTop: spacing.md,
  },
  footer: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  progressWrap: {
    marginTop: spacing.md,
  },
  toastOverlay: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  toast: {
    alignItems: 'center',
    backgroundColor: colors.successBackground,
    borderColor: colors.success,
    borderRadius: radius.md,
    borderWidth: 1,
    elevation: 4,
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  toastText: {
    fontWeight: '700',
    marginLeft: spacing.md,
  },
  doneTitle: {
    marginBottom: spacing.sm,
  },
  donePointCard: {
    marginBottom: spacing.sm,
    padding: spacing.lg,
  },
  binding: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  bindingText: {
    marginTop: spacing.md,
  },
  gapSm: {
    marginTop: spacing.sm,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  gapXl: {
    marginTop: spacing.xl,
  },
});
