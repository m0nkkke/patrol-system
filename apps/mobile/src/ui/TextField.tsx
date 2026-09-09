import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { colors, layout, radius, spacing, typography } from '@/theme';

import { AppText } from './AppText';
import { CompactTextIcon } from './CompactTextIcon';
import { FieldLabel } from './FieldLabel';

type TextFieldProps = TextInputProps & {
  label?: string;
  error?: string | null;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconText?: string;
  tone?: 'default' | 'control';
  compact?: boolean;
};

export function TextField({
  label,
  error,
  required,
  icon,
  iconText,
  tone = 'default',
  compact = false,
  style,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps): React.ReactElement {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <FieldLabel label={label} required={required} /> : null}
      <View
        style={[
          styles.inputRow,
          compact && styles.inputRowCompact,
          tone === 'control' ? styles.inputRowControl : null,
          focused && styles.inputRowFocused,
          error ? styles.inputRowError : null,
        ]}
      >
        {iconText ? (
          <View style={styles.icon}>
            <CompactTextIcon label={iconText} />
          </View>
        ) : icon ? (
          <Ionicons
            name={icon}
            size={20}
            color={tone === 'control' ? colors.controlText : colors.textMuted}
            style={styles.icon}
          />
        ) : null}
        <TextInput
          style={[styles.input, compact && styles.inputCompact, style]}
          placeholderTextColor={colors.textMuted}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />
      </View>
      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: layout.controlHeight,
    overflow: 'hidden',
    paddingHorizontal: spacing.lg,
  },
  inputRowFocused: {
    borderColor: colors.primary,
  },
  inputRowCompact: {
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  inputRowControl: {
    backgroundColor: colors.controlSurface,
    borderColor: colors.controlBorder,
  },
  inputRowError: {
    borderColor: colors.danger,
  },
  icon: {
    marginRight: spacing.sm,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: typography.body.fontSize,
    minWidth: 0,
    paddingVertical: spacing.md,
  },
  inputCompact: {
    fontSize: 14,
    paddingVertical: spacing.sm,
  },
  error: {
    marginTop: spacing.sm,
  },
});
