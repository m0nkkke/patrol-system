import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

type HeaderProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
};

export function Header({ title, subtitle, onBack }: HeaderProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {onBack ? (
        <TouchableOpacity style={styles.back} onPress={onBack} hitSlop={12} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color={colors.primary} />
          <AppText variant="body" color={colors.primary} style={styles.backText}>
            Назад
          </AppText>
        </TouchableOpacity>
      ) : null}
      {title ? <AppText variant="heading">{title}</AppText> : null}
      {subtitle ? (
        <AppText variant="caption" muted style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  back: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  backText: {
    marginLeft: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
