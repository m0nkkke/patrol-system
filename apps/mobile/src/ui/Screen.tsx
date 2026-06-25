import { StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '@/theme';

type ScreenProps = {
  children: React.ReactNode;
  padded?: boolean;
  centered?: boolean;
  style?: ViewStyle;
};

export function Screen({
  children,
  padded = true,
  centered = false,
  style,
}: ScreenProps): React.ReactElement {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.content, padded && styles.padded, centered && styles.centered, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
  },
  padded: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
  },
  centered: {
    justifyContent: 'center',
  },
});
