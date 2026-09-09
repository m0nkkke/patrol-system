import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ScrollView,
  type StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';

import { colors, layout, radius, spacing } from '@/theme';

import { AppText } from './AppText';
import { BottomSheetModal } from './BottomSheetModal';

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
  showActiveCount?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FilterSheet({
  groups,
  label = 'Фильтры',
  title = 'Фильтры',
  icon = 'options-outline',
  activeCount = 0,
  showActiveCount = false,
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
        {showActiveCount || activeCount > 0 ? (
          <View style={styles.count}>
            <AppText variant="caption" color={colors.controlText}>
              {activeCount}
            </AppText>
          </View>
        ) : null}
        <Ionicons name="chevron-down" size={18} color={colors.controlText} />
      </TouchableOpacity>

      <BottomSheetModal visible={open} onClose={() => setOpen(false)}>
        <View style={styles.sheetContent}>
            <View style={styles.sheetHeader}>
              <AppText variant="label">{title}</AppText>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.groups}
              contentContainerStyle={styles.groupsContent}
              nestedScrollEnabled
              showsVerticalScrollIndicator
            >
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
            </ScrollView>
        </View>
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
  icon: {
    marginRight: spacing.sm,
  },
  label: {
    flex: 1,
    fontSize: 14,
  },
  count: {
    alignItems: 'center',
    backgroundColor: colors.chipBackground,
    borderRadius: radius.full,
    height: 20,
    justifyContent: 'center',
    marginRight: spacing.sm,
    minWidth: 20,
    paddingHorizontal: spacing.xs,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetContent: {
    flexShrink: 1,
  },
  group: {
    marginBottom: spacing.lg,
  },
  groups: {
    flexGrow: 0,
    flexShrink: 1,
  },
  groupsContent: {
    paddingBottom: spacing.lg,
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
