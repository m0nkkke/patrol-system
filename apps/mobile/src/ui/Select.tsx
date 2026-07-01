import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, layout, radius, spacing, typography } from '@/theme';

import { AppText } from './AppText';
import { FieldLabel } from './FieldLabel';
import { TextField } from './TextField';

export type SelectOption = {
  value: string;
  label: string;
  hint?: string;
};

type SelectProps = {
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

      <TouchableOpacity style={styles.field} onPress={() => setOpen(true)} activeOpacity={0.7}>
        {icon ? (
          <Ionicons name={icon} size={20} color={colors.textMuted} style={styles.icon} />
        ) : null}
        <AppText variant="body" color={selected ? colors.text : colors.textMuted} style={styles.value}>
          {selected ? selected.label : placeholder}
        </AppText>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <TouchableOpacity style={styles.backdropFill} onPress={() => setOpen(false)} />
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.sheetHeader}>
              <AppText variant="label">{title ?? label ?? 'Выберите'}</AppText>
              <TouchableOpacity onPress={() => setOpen(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {searchable ? (
              <View style={styles.search}>
                <TextField
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Поиск"
                  icon="search"
                  tone="control"
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
          </SafeAreaView>
        </View>
      </Modal>
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
  optionHint: {
    marginTop: spacing.xs,
  },
});
