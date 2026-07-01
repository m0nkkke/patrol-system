import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

export function ListFooter({ loading }: { loading: boolean }): React.ReactElement | null {
  if (!loading) {
    return null;
  }
  return (
    <View style={styles.footer}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingVertical: spacing.lg,
  },
});
