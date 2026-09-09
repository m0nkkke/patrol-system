import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { AppText } from './AppText';

type SectionHeadingProps = {
  title: string;
  subtitle?: string;
  trailing?: React.ReactNode;
};

export function SectionHeading({
  title,
  subtitle,
  trailing,
}: SectionHeadingProps): React.ReactElement {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <AppText variant="label">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" muted style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
