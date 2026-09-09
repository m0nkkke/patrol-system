import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  type StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';

import { colors, layout, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { BottomSheetModal } from './BottomSheetModal';

export type SheetButtonOption<T extends string> = {
  value: T;
  label: string;
};

type SheetButtonProps<T extends string> = {
  label: string;
  detail?: string;
  icon: keyof typeof Ionicons.glyphMap;
  title?: string;
  options: SheetButtonOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'control' | 'inline';
};

export function SheetButton<T extends string>({
  label,
  detail,
  icon,
  title,
  options,
  value,
  onChange,
  style,
  variant = 'control',
}: SheetButtonProps<T>): React.ReactElement {
  const [open, setOpen] = useState(false);

  function select(optionValue: T): void {
    onChange(optionValue);
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.field, variant === 'inline' && styles.fieldInline, style]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={18} color={colors.controlText} style={styles.icon} />
        <View style={[styles.copy, variant === 'inline' && styles.copyInline]}>
          <AppText variant="label" color={colors.controlText} style={styles.label} numberOfLines={1}>
            {label}
          </AppText>
          {detail ? (
            <AppText variant="caption" muted numberOfLines={1} style={styles.detail}>
              {detail}
            </AppText>
          ) : null}
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.controlText} />
      </TouchableOpacity>

      <BottomSheetModal visible={open} onClose={() => setOpen(false)}>
            <View style={styles.sheetHeader}>
              <AppText variant="label">{title ?? label}</AppText>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={options}
              keyExtractor={(option) => option.value}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => select(item.value)}
                    activeOpacity={0.7}
                  >
                    <AppText variant="body" color={isSelected ? colors.primary : colors.text}>
                      {item.label}
                    </AppText>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    alignItems: 'center',
    backgroundColor: colors.controlSurface,
    borderColor: colors.controlBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.lg,
  },
  fieldInline: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    justifyContent: 'flex-end',
    minHeight: 44,
    paddingHorizontal: 0,
  },
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    fontSize: 14,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  copyInline: {
    alignItems: 'flex-start',
    flex: 0,
  },
  detail: {
    marginTop: 2,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  separator: {
    backgroundColor: colors.border,
    height: 1,
  },
  option: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
});
