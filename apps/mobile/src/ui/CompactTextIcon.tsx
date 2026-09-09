import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { AppText } from './AppText';

export function CompactTextIcon({ label }: { label: string }): React.ReactElement {
  return (
    <View style={styles.container}>
      <AppText style={styles.label}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderColor: colors.textMuted,
    borderRadius: 3,
    borderWidth: 1,
    height: 17,
    justifyContent: 'center',
    width: 19,
  },
  label: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 11,
  },
});
