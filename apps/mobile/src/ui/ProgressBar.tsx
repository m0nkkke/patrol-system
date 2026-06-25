import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

type ProgressBarProps = {
  value: number;
  max: number;
};

export function ProgressBar({ value, max }: ProgressBarProps): React.ReactElement {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${ratio * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.border,
    borderRadius: radius.full,
    height: 12,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: '100%',
  },
});
