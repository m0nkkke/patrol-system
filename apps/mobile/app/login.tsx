import { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import logoSource from '../assets/icon.png';

import { ApiError } from '@/api/errors';
import {
  ACCESS_KEY_MASK_LENGTH,
  formatAccessKey,
  isAccessKeyComplete,
} from '@/features/auth/access-key';
import { useAuthStore } from '@/store/auth-store';
import { spacing } from '@/theme';
import { AppText, Button, Screen, TextField } from '@/ui';

export default function LoginScreen(): React.ReactElement {
  const signIn = useAuthStore((state) => state.signIn);
  const [accessKey, setAccessKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = isAccessKeyComplete(accessKey) && !submitting;

  async function handleSubmit(): Promise<void> {
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signIn(accessKey);
    } catch (caught) {
      const apiError = caught instanceof ApiError ? caught : null;
      setError(
        apiError ? mapLoginError(apiError) : 'Не удалось войти. Попробуйте еще раз.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
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
          onSubmitEditing={() => void handleSubmit()}
        />

        <View style={styles.action}>
          <Button
            label="Войти"
            onPress={() => void handleSubmit()}
            loading={submitting}
            disabled={!canSubmit}
          />
        </View>
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
});
