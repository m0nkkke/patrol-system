import { Children, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

export function FilterSortBar({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <View style={styles.bar}>
      {Children.map(children, (child) => (
        <View style={styles.item}>{child}</View>
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
  item: {
    flex: 1,
  },
});
