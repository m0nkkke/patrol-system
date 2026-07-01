import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatTimeInput, isValidTime } from '@/features/schedules/format';
import { WeekdayPicker } from '@/features/schedules/WeekdayPicker';
import { colors, spacing } from '@/theme';
import { AppText, Button, FieldLabel, TextField } from '@/ui';

export type ScheduleFormValues = {
  name: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
};

type ScheduleFormProps = {
  initial?: Partial<ScheduleFormValues>;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (values: ScheduleFormValues) => void;
};

export function ScheduleForm({
  initial,
  submitLabel,
  submitting,
  error,
  onSubmit,
}: ScheduleFormProps): React.ReactElement {
  const [name, setName] = useState(initial?.name ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? []);
  const [startTime, setStartTime] = useState(initial?.startTime ?? '');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');

  const isValid =
    name.trim().length >= 1 &&
    weekdays.length > 0 &&
    isValidTime(startTime) &&
    isValidTime(endTime);

  function toggleDay(day: number): void {
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function handleSubmit(): void {
    if (!isValid || submitting) {
      return;
    }
    onSubmit({ name: name.trim(), weekdays, startTime, endTime });
  }

  return (
    <View>
      <TextField
        label="Название"
        required
        icon="pricetag-outline"
        value={name}
        onChangeText={setName}
        placeholder="Вечерний обход"
      />

      <View style={styles.gapLg}>
        <FieldLabel label="Дни недели" required />
        <WeekdayPicker value={weekdays} onToggle={toggleDay} />
      </View>

      <View style={styles.gapLg}>
        <View style={styles.timeRow}>
          <View style={styles.timeField}>
            <TextField
              label="Начало"
              required
              icon="time-outline"
              value={startTime}
              onChangeText={(text) => setStartTime(formatTimeInput(text))}
              placeholder="20:00"
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
          <View style={styles.timeField}>
            <TextField
              label="Конец"
              required
              icon="time-outline"
              value={endTime}
              onChangeText={(text) => setEndTime(formatTimeInput(text))}
              placeholder="21:00"
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>
        </View>
      </View>

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.gapLg}>
          {error}
        </AppText>
      ) : null}

      <View style={styles.gapXl}>
        <Button
          label={submitLabel}
          icon="checkmark-circle-outline"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!isValid}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gapLg: {
    marginTop: spacing.lg,
  },
  gapXl: {
    marginTop: spacing.xl,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeField: {
    flex: 1,
  },
});
