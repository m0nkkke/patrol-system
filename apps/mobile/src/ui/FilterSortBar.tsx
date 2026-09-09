import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

export function FilterSortBar({
  children,
  compact = false,
}: {
  children: ReactNode;
  compact?: boolean;
}): React.ReactElement {
  const items = Children.toArray(children);

  return (
    <View style={[styles.bar, compact && styles.barCompact]}>
      {items.map((child, index) => (
        <View key={index} style={styles.item}>
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  barCompact: {
    marginTop: 0,
  },
  item: {
    flex: 1,
  },
});
