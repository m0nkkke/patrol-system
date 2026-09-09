import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { colors, screenInsets, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';
import { EntityIcon } from './EntityIcon';
import { Header } from './Header';
import { Screen } from './Screen';

type AsyncStateScreenProps = {
  loading?: boolean;
  message?: string;
  onBack: () => void;
  onRetry?: () => void;
};

export function AsyncStateScreen({
  loading = false,
  message = 'Не удалось загрузить данные.',
  onBack,
  onRetry,
}: AsyncStateScreenProps): React.ReactElement {
  const router = useRouter();

  function handleBack(): void {
    if (router.canGoBack()) {
      onBack();
    } else {
      router.replace('/');
    }
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Header compact onBack={handleBack} />
      </View>
      <View style={styles.content}>
        {loading ? (
          <>
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText variant="caption" muted style={styles.loadingText}>
              Загружаем данные…
            </AppText>
          </>
        ) : (
          <>
            <EntityIcon icon="alert-circle-outline" size="large" tone="warning" />
            <AppText muted style={styles.message}>
              {message}
            </AppText>
            {onRetry ? (
              <Button label="Повторить" variant="secondary" onPress={onRetry} />
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
  },
  loadingText: {
    marginTop: spacing.md,
  },
  message: {
    marginBottom: spacing.lg,
    marginTop: spacing.md,
    textAlign: 'center',
  },
});
