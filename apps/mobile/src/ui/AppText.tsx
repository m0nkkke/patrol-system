import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography, type TypographyVariant } from '@/theme';

type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  muted?: boolean;
  color?: string;
};

export function AppText({
  variant = 'body',
  muted = false,
  color,
  style,
  ...rest
}: AppTextProps): React.ReactElement {
  return (
    <Text
      style={[
        styles.base,
        typography[variant],
        muted && styles.muted,
        color ? { color } : null,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
  },
  muted: {
    color: colors.textMuted,
  },
});
