import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  type StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, radius, spacing } from '@/theme';

import { AppText } from './AppText';

export type SheetButtonOption<T extends string> = {
  value: T;
  label: string;
};

type SheetButtonProps<T extends string> = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  title?: string;
  options: SheetButtonOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
};

export function SheetButton<T extends string>({
  label,
  icon,
  title,
  options,
  value,
  onChange,
  style,
}: SheetButtonProps<T>): React.ReactElement {
  const [open, setOpen] = useState(false);

  function select(optionValue: T): void {
    onChange(optionValue);
    setOpen(false);
  }

  return (
    <>
      <TouchableOpacity
        style={[styles.field, style]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <Ionicons name={icon} size={18} color={colors.controlText} style={styles.icon} />
        <AppText variant="label" color={colors.controlText} style={styles.label} numberOfLines={1}>
          {label}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.controlText} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={styles.backdropFill} onPress={() => setOpen(false)} />
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
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
          </SafeAreaView>
        </View>
      </Modal>
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
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    flex: 1,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '70%',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
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
