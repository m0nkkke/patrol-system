import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import type { RouteSetupState } from '@/api/types';
import { useRouteSetup, useScanRoutePoint, useStartRouteSetup } from '@/features/route-setup/queries';
import { nfcReader } from '@/nfc';
import { colors, radius, spacing } from '@/theme';
import {
  AppText,
  Button,
  Card,
  FormHeader,
  Header,
  ProgressBar,
  ResultHeader,
  ResultScreen,
  Screen,
  TextField,
} from '@/ui';

export default function RouteSetupScreen(): React.ReactElement {
  const router = useRouter();
  const { shopId } = useLocalSearchParams<{ shopId: string }>();
  const { data: state, isPending, isError, error, refetch } = useRouteSetup(shopId);

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
    return <DoneStep total={state.expectedPoints} onDone={() => router.back()} />;
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

  function handleStart(): void {
    if (!isValid || isPending) {
      return;
    }
    mutate({ expectedPoints });
  }

  return (
    <Screen padded={false}>
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
            error={isError ? describeError(error) : null}
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
  const [uid, setUid] = useState('');
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const [justBound, setJustBound] = useState<number | null>(null);

  const { mutate, isPending, isError, error } = useScanRoutePoint(shopId);

  useEffect(() => {
    void nfcReader.isAvailable().then(setNfcAvailable);
  }, []);

  useEffect(() => {
    if (justBound === null) {
      return;
    }
    const timer = setTimeout(() => setJustBound(null), 2000);
    return () => clearTimeout(timer);
  }, [justBound]);

  const nameValid = name.trim().length >= 1;
  const trimmedUid = uid.trim();
  const uidValid = trimmedUid.length >= 4 && trimmedUid.length <= 32;
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
          setName('');
          setDescription('');
          setUid('');
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
    try {
      const scannedUid = await nfcReader.readUid();
      bind(scannedUid);
    } catch {
      setNfcError('Не удалось считать NFC-метку.');
    }
  }

  const formError = nfcError ?? (isError ? describeError(error) : null);

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topArea}>
          <Header onBack={onBack} />
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
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {justBound !== null ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              <AppText variant="caption" color={colors.success} style={styles.successText}>
                Точка №{justBound} привязана
              </AppText>
            </View>
          ) : null}

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
              {nfcAvailable ? (
                <Button
                  label="Сканировать NFC метку"
                  icon="scan-outline"
                  onPress={() => void handleScanNfc()}
                  disabled={!nameValid}
                />
              ) : null}

              <View style={nfcAvailable ? styles.manualBlock : undefined}>
                <TextField
                  label="UID метки (для теста)"
                  icon="qr-code-outline"
                  value={uid}
                  onChangeText={setUid}
                  placeholder="04a1b2c3d4e5f6"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.gapLg}>
                  <Button
                    label="Привязать точку"
                    icon="link-outline"
                    variant={nfcAvailable ? 'secondary' : 'primary'}
                    onPress={() => bind(trimmedUid)}
                    disabled={!nameValid || !uidValid}
                  />
                </View>
              </View>

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

function DoneStep({ total, onDone }: { total: number; onDone: () => void }): React.ReactElement {
  return (
    <ResultScreen
      onBack={onDone}
      footer={<Button label="Готово" icon="checkmark-outline" onPress={onDone} />}
    >
      <ResultHeader
        icon="checkmark"
        iconColor={colors.success}
        iconBackground={colors.successBackground}
        title="Маршрут готов!"
        subtitle={`${total} точек зарегистрировано`}
      />
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
  successBanner: {
    alignItems: 'center',
    backgroundColor: colors.successBackground,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  successText: {
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
  binding: {
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  bindingText: {
    marginTop: spacing.md,
  },
  manualBlock: {
    marginTop: spacing.lg,
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
