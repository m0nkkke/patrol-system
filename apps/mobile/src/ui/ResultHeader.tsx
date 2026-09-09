import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '@/theme';

import { AppText } from './AppText';

type ResultHeaderProps = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBackground: string;
  title: string;
  subtitle?: string;
  celebration?: boolean;
};

export function ResultHeader({
  icon,
  iconColor,
  iconBackground,
  title,
  subtitle,
  celebration = false,
}: ResultHeaderProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <View style={styles.iconStage}>
        {celebration ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={[styles.confettiLine, styles.confettiTopLeft]} />
            <View style={[styles.confettiDot, styles.confettiLeftBlue]} />
            <View style={[styles.confettiDot, styles.confettiLeftGreen]} />
            <View style={[styles.confettiDot, styles.confettiTopOrange]} />
            <View style={[styles.confettiLine, styles.confettiRightGreen]} />
            <View style={[styles.confettiDot, styles.confettiRightBlue]} />
          </View>
        ) : null}
        <View style={[styles.iconCircle, { backgroundColor: iconBackground }]}>
          <Ionicons name={icon} size={36} color={iconColor} />
        </View>
      </View>
      <AppText variant="title" style={styles.title}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="subtitle" muted style={styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  iconStage: {
    alignItems: 'center',
    height: 88,
    justifyContent: 'center',
    marginBottom: spacing.lg,
    width: 144,
  },
  confettiDot: {
    borderRadius: radius.full,
    height: 4,
    position: 'absolute',
    width: 4,
  },
  confettiLine: {
    height: 8,
    position: 'absolute',
    width: 2,
  },
  confettiTopLeft: {
    backgroundColor: '#34d399',
    left: 18,
    top: 8,
    transform: [{ rotate: '-18deg' }],
  },
  confettiLeftBlue: {
    backgroundColor: '#3b82f6',
    left: 7,
    top: 46,
  },
  confettiLeftGreen: {
    backgroundColor: '#22c55e',
    bottom: 6,
    left: 27,
  },
  confettiTopOrange: {
    backgroundColor: '#f59e0b',
    right: 30,
    top: 5,
  },
  confettiRightGreen: {
    backgroundColor: '#6ee7b7',
    right: 14,
    top: 34,
    transform: [{ rotate: '68deg' }],
  },
  confettiRightBlue: {
    backgroundColor: '#3b82f6',
    bottom: 10,
    right: 22,
  },
  title: {
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
