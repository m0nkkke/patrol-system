import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { logger } from '@/lib/logger';
import { colors, spacing } from '@/theme';

import { AppText } from './AppText';
import { Button } from './Button';

type Props = { children: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error(error, { componentStack: info.componentStack, source: 'error-boundary' });
  }

  private readonly reset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.container}>
        <AppText variant="heading" style={styles.title}>
          Что-то пошло не так
        </AppText>
        <AppText muted style={styles.text}>
          Произошла непредвиденная ошибка. Попробуйте ещё раз.
        </AppText>
        <Button label="Попробовать снова" onPress={this.reset} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  text: {
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
});
