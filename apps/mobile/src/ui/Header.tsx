import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

type HeaderProps = {
  compact?: boolean;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  titleAction?: {
    accessibilityLabel: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
};

export function Header({
  compact = false,
  title,
  subtitle,
  onBack,
  right,
  titleAction,
}: HeaderProps): React.ReactElement {
  const router = useRouter();

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <View style={styles.topRow}>
        {onBack ? (
          <TouchableOpacity
            accessibilityLabel="Назад"
            accessibilityRole="button"
            style={styles.back}
            onPress={onBack}
            hitSlop={12}
            activeOpacity={0.7}
          >
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
            accessibilityLabel="Главная"
            accessibilityRole="button"
            style={styles.home}
            onPress={() => router.dismissTo('/')}
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
      {title || subtitle ? (
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            {title ? <AppText variant="heading">{title}</AppText> : null}
            {subtitle ? (
              <AppText variant="caption" muted style={styles.subtitle}>
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {titleAction ? (
            <TouchableOpacity
              accessibilityLabel={titleAction.accessibilityLabel}
              accessibilityRole="button"
              activeOpacity={0.7}
              hitSlop={8}
              onPress={titleAction.onPress}
              style={styles.titleAction}
            >
              <Ionicons name={titleAction.icon} size={22} color={colors.primary} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  containerCompact: {
    marginBottom: spacing.md,
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
  headingCopy: {
    flex: 1,
    minWidth: 0,
  },
  headingRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  titleAction: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    marginLeft: spacing.md,
    width: 40,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
});
