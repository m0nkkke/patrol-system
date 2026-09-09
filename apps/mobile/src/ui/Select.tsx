import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors, layout, radius, spacing, typography } from '@/theme';

import { AppText } from './AppText';
import { BottomSheetModal } from './BottomSheetModal';
import { CompactTextIcon } from './CompactTextIcon';
import { FieldLabel } from './FieldLabel';
import { SearchField } from './SearchField';

export type SelectOption = {
  value: string;
  label: string;
  detail?: string;
  detailIconText?: string;
  hint?: string;
};

type SelectProps = {
  disabled?: boolean;
  label?: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  value: string | null;
  placeholder?: string;
  title?: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  searchable?: boolean;
};

export function Select({
  disabled = false,
  label,
  required,
  icon,
  value,
  placeholder = 'Выберите',
  title,
  options,
  onChange,
  searchable = false,
}: SelectProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = options.find((option) => option.value === value);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return options;
    }
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(query) ||
        (option.hint?.toLowerCase().includes(query) ?? false),
    );
  }, [options, search]);

  function select(optionValue: string): void {
    onChange(optionValue);
    setOpen(false);
    setSearch('');
  }

  return (
    <View style={styles.container}>
      {label ? <FieldLabel label={label} required={required} /> : null}

      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        style={[styles.field, disabled && styles.disabled]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
        disabled={disabled}
      >
        {icon ? (
          <Ionicons name={icon} size={20} color={colors.textMuted} style={styles.icon} />
        ) : null}
        <AppText variant="body" color={selected ? colors.text : colors.textMuted} style={styles.value}>
          {selected ? selected.label : placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <BottomSheetModal visible={open} onClose={() => setOpen(false)}>
            <View style={styles.sheetHeader}>
              <AppText variant="label">{title ?? label ?? 'Выберите'}</AppText>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {searchable ? (
              <View style={styles.search}>
                <SearchField
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Поиск"
                />
              </View>
            ) : null}

            <FlatList
              data={visible}
              keyExtractor={(option) => option.value}
              keyboardShouldPersistTaps="handled"
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => select(item.value)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optionText}>
                      <AppText variant="body">{item.label}</AppText>
                      {item.detail ? (
                        <View style={styles.optionDetail}>
                          {item.detailIconText ? (
                            <CompactTextIcon label={item.detailIconText} />
                          ) : null}
                          <AppText
                            variant="caption"
                            muted
                            style={item.detailIconText ? styles.optionDetailText : undefined}
                          >
                            {item.detail}
                          </AppText>
                        </View>
                      ) : null}
                      {item.hint ? (
                        <AppText variant="caption" muted style={styles.optionHint}>
                          {item.hint}
                        </AppText>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
      </BottomSheetModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  field: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.inputBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    minHeight: layout.controlHeight,
    paddingHorizontal: spacing.lg,
  },
  icon: {
    marginRight: spacing.sm,
  },
  value: {
    flex: 1,
    fontSize: typography.body.fontSize,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  search: {
    marginBottom: spacing.sm,
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
  optionText: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  optionDetail: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  optionDetailText: {
    marginLeft: spacing.xs,
  },
  optionHint: {
    marginTop: spacing.xs,
  },
});
