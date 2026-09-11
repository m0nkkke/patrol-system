import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';

import { useGuardedPress } from '@/lib/use-guarded-press';
import { colors, radius, spacing } from '@/theme';

type CardProps = {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
};

export function Card({ children, onPress, style }: CardProps): React.ReactElement {
  const guardedOnPress = useGuardedPress(onPress);

  if (onPress) {
    return (
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
        onPress={guardedOnPress}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.xl,
  },
  pressed: {
    opacity: 0.7,
  },
});
