import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { colors, radius } from '@/theme';

export type EntityIconTone = 'primary' | 'danger' | 'success' | 'warning' | 'neutral';

const TONES: Record<EntityIconTone, { background: string; foreground: string }> = {
  primary: { background: colors.iconBlueBackground, foreground: colors.primary },
  danger: { background: colors.dangerSurface, foreground: colors.danger },
  success: { background: colors.successBackground, foreground: colors.success },
  warning: { background: colors.iconOrangeBackground, foreground: colors.warning },
  neutral: { background: colors.iconSlateBackground, foreground: colors.iconSlate },
};

type EntityIconProps = {
  icon: keyof typeof Ionicons.glyphMap;
  size?: 'small' | 'medium' | 'large';
  tone?: EntityIconTone;
};

export function EntityIcon({
  icon,
  size = 'medium',
  tone = 'primary',
}: EntityIconProps): React.ReactElement {
  const palette = TONES[tone];
  const iconSize = size === 'large' ? 26 : size === 'small' ? 18 : 22;

  return (
    <View style={[styles.base, styles[size], { backgroundColor: palette.background }]}>
      <Ionicons name={icon} size={iconSize} color={palette.foreground} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexShrink: 0,
    justifyContent: 'center',
  },
  small: {
    height: 36,
    width: 36,
  },
  medium: {
    height: 44,
    width: 44,
  },
  large: {
    height: 52,
    width: 52,
  },
});
