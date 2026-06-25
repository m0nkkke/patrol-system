import { ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { Header } from './Header';
import { Screen } from './Screen';

type ResultScreenProps = {
  onBack: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
};

export function ResultScreen({ onBack, children, footer }: ResultScreenProps): React.ReactElement {
  return (
    <Screen padded={false}>
      <View style={styles.headerWrap}>
        <Header onBack={onBack} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
      <View style={styles.footer}>{footer}</View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
  },
  footer: {
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
});
