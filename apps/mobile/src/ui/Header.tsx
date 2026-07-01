import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors, spacing } from '@/theme';

import { AppText } from './AppText';

type HeaderProps = {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function Header({ title, subtitle, onBack, right }: HeaderProps): React.ReactElement {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity style={styles.back} onPress={onBack} hitSlop={12} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={20} color={colors.primary} />
            <AppText variant="body" color={colors.primary} style={styles.backText}>
              Назад
            </AppText>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        {right !== undefined ? (
          right
        ) : (
          <TouchableOpacity
            style={styles.home}
            onPress={() => router.navigate('/')}
            hitSlop={12}
            activeOpacity={0.7}
          >
            <Ionicons name="home-outline" size={20} color={colors.primary} />
            <AppText variant="body" color={colors.primary} style={styles.homeText}>
              Главная
            </AppText>
          </TouchableOpacity>
        )}
      </View>
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
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  back: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  backText: {
    marginLeft: spacing.xs,
  },
  home: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  homeText: {
    marginLeft: spacing.xs,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
