import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { colors, radius, spacing } from '@/theme';
import { AppText } from '@/ui';

import { WEEKDAYS } from './format';

type WeekdayPickerProps = {
  value: number[];
  onToggle: (day: number) => void;
};

export function WeekdayPicker({ value, onToggle }: WeekdayPickerProps): React.ReactElement {
  return (
    <View style={styles.row}>
      {WEEKDAYS.map((weekday) => {
        const selected = value.includes(weekday.value);
        return (
          <TouchableOpacity
            key={weekday.value}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onToggle(weekday.value)}
            activeOpacity={0.8}
          >
            <AppText
              variant="label"
              color={selected ? colors.textInverse : colors.text}
            >
              {weekday.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
