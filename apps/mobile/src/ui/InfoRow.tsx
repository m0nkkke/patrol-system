import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

type InfoRowProps = {
  label: string;
  value: string;
  selectable?: boolean;
  first?: boolean;
};

export function InfoRow({ label, value, selectable = false, first = false }: InfoRowProps): React.ReactElement {
  return (
    <View style={[styles.row, first && styles.first]}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText variant="body" selectable={selectable} style={styles.value}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    paddingVertical: spacing.md,
  },
  first: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  value: {
    marginTop: spacing.xs,
  },
});
