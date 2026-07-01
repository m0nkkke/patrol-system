import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
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

export type FilterSheetGroup = {
  title: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
};

type FilterSheetProps = {
  groups: FilterSheetGroup[];
  label?: string;
  title?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  activeCount?: number;
  style?: StyleProp<ViewStyle>;
};

export function FilterSheet({
  groups,
  label = 'Фильтры',
  title = 'Фильтры',
  icon = 'options-outline',
  activeCount = 0,
  style,
}: FilterSheetProps): React.ReactElement {
  const [open, setOpen] = useState(false);

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
        {activeCount > 0 ? (
          <View style={styles.count}>
            <AppText variant="caption" color={colors.textInverse}>
              {activeCount}
            </AppText>
          </View>
        ) : null}
        <Ionicons name="chevron-down" size={18} color={colors.controlText} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={styles.backdropFill} onPress={() => setOpen(false)} />
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.sheetHeader}>
              <AppText variant="label">{title}</AppText>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {groups.map((group) => (
              <View key={group.title} style={styles.group}>
                <AppText variant="caption" muted style={styles.groupTitle}>
                  {group.title.toUpperCase()}
                </AppText>
                <View style={styles.chips}>
                  {group.options.map((option) => {
                    const selected = option.value === group.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => group.onChange(option.value)}
                        activeOpacity={0.7}
                      >
                        <AppText
                          variant="caption"
                          color={selected ? colors.primary : colors.controlText}
                        >
                          {option.label}
                        </AppText>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
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
  count: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    height: 20,
    justifyContent: 'center',
    marginRight: spacing.sm,
    minWidth: 20,
    paddingHorizontal: spacing.xs,
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
  group: {
    marginBottom: spacing.lg,
  },
  groupTitle: {
    fontWeight: '600',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    backgroundColor: colors.controlSurface,
    borderColor: colors.controlBorder,
    borderRadius: radius.full,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.iconBlueBackground,
    borderColor: colors.primary,
  },
});
