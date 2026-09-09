import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';

import { AppText } from './AppText';
import { EntityIcon } from './EntityIcon';

type EmptyStateProps = {
  description?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
};

export function EmptyState({
  description,
  icon = 'file-tray-outline',
  title,
}: EmptyStateProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <EntityIcon icon={icon} size="large" tone="neutral" />
      <AppText variant="label" style={styles.title}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="caption" muted style={styles.description}>
          {description}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minHeight: 180,
    paddingHorizontal: spacing.xl,
  },
  title: {
    marginTop: spacing.md,
    textAlign: 'center',
  },
  description: {
    marginTop: spacing.sm,
    maxWidth: 300,
    textAlign: 'center',
  },
});
