import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type InfoCalloutProps = {
  text: string;
};

export function InfoCallout({ text }: InfoCalloutProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <Ionicons name="time-outline" size={20} color={colors.primary} />
      <AppText variant="caption" muted style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.controlSurface,
    borderColor: colors.controlBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.lg,
  },
  text: {
    flex: 1,
    marginLeft: spacing.md,
  },
});
