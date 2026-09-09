import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import logoSource from '../assets/icon.png';

import { ApiError } from '@/api/errors';
import {
  ACCESS_KEY_MASK_LENGTH,
  formatAccessKey,
  isAccessKeyComplete,
} from '@/features/auth/access-key';
import { requiresActorFullName } from '@/features/auth/login-flow';
import { useAuthStore } from '@/store/auth-store';
import { spacing } from '@/theme';
import { AppText, Button, Header, Screen, TextField } from '@/ui';

type LoginStep = 'access-key' | 'actor-name';

export default function LoginScreen(): React.ReactElement {
  const signIn = useAuthStore((state) => state.signIn);
  const signInUniversalRouteSetter = useAuthStore(
    (state) => state.signInUniversalRouteSetter,
  );
  const [step, setStep] = useState<LoginStep>('access-key');
  const [accessKey, setAccessKey] = useState('');
  const [fullName, setFullName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmitAccessKey = isAccessKeyComplete(accessKey) && !submitting;
  const canSubmitFullName = fullName.trim().length >= 2 && !submitting;

  async function handleAccessKeySubmit(): Promise<void> {
    if (!canSubmitAccessKey) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signIn(accessKey);
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null;
      if (apiError && requiresActorFullName(apiError.code)) {
        setStep('actor-name');
      } else {
        setError(
          apiError ? mapLoginError(apiError) : 'Не удалось войти. Попробуйте еще раз.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFullNameSubmit(): Promise<void> {
    if (!canSubmitFullName) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signInUniversalRouteSetter(accessKey, fullName.trim());
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null;
      setError(
        apiError?.code === 'NETWORK_ERROR'
          ? 'Нет связи с сервером. Проверьте подключение.'
          : 'Не удалось войти. Проверьте ФИО и повторите попытку.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function returnToAccessKey(): void {
    setStep('access-key');
    setFullName('');
    setError(null);
  }

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {step === 'access-key' ? (
          <>
            <View style={styles.header}>
              <Image source={logoSource} style={styles.logo} />
              <AppText variant="title" style={styles.title}>
                Patrol System
              </AppText>
              <AppText variant="subtitle" muted style={styles.subtitle}>
                Введите ключ доступа
              </AppText>
            </View>

            <TextField
              value={accessKey}
              onChangeText={(text) => setAccessKey(formatAccessKey(text))}
              placeholder="XXXX-XXXX-XXXX"
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              maxLength={ACCESS_KEY_MASK_LENGTH}
              editable={!submitting}
              returnKeyType="go"
              error={error}
              onSubmitEditing={() => void handleAccessKeySubmit()}
            />

            <View style={styles.action}>
              <Button
                label="Войти"
                onPress={() => void handleAccessKeySubmit()}
                loading={submitting}
                disabled={!canSubmitAccessKey}
              />
            </View>
          </>
        ) : (
          <>
            <Header onBack={returnToAccessKey} right={<View />} />
            <View style={styles.actorContent}>
              <AppText variant="heading">Укажите ФИО</AppText>
              <AppText variant="caption" muted style={styles.actorSubtitle}>
                ФИО будет сохранено в журнале действий этой сессии.
              </AppText>

              <View style={styles.actorField}>
                <TextField
                  label="ФИО"
                  required
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder="Иван Петров"
                  autoCapitalize="words"
                  autoFocus
                  editable={!submitting}
                  returnKeyType="go"
                  error={error}
                  onSubmitEditing={() => void handleFullNameSubmit()}
                />
              </View>

              <View style={styles.actorAction}>
                <Button
                  label="Продолжить"
                  onPress={() => void handleFullNameSubmit()}
                  loading={submitting}
                  disabled={!canSubmitFullName}
                />
              </View>
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

function mapLoginError(error: ApiError): string {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Нет связи с сервером. Проверьте подключение.';
    default:
      return 'Неверный ключ доступа.';
  }
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  screen: {
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  keyboard: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  logo: {
    borderRadius: 18,
    height: 76,
    marginBottom: spacing.md,
    width: 76,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.lg,
  },
  actorContent: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  actorSubtitle: {
    marginTop: spacing.sm,
  },
  actorField: {
    marginTop: spacing.xl,
  },
  actorAction: {
    marginTop: spacing.xl,
  },
});
