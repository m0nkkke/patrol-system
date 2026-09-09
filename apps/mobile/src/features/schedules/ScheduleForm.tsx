import type { PatrolPeriod } from '@patrol/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { PatrolRoute } from '@/api/types';
import { formatTimeInput, isValidTime } from '@/features/schedules/format';
import { WeekdayPicker } from '@/features/schedules/WeekdayPicker';
import { colors, spacing } from '@/theme';
import {
  AppText,
  CancelButton,
  FieldLabel,
  Select,
  StatusToggleCard,
  SubmitButton,
  TextField,
} from '@/ui';

const PERIOD_OPTIONS = [
  { value: 'morning', label: 'Утро' },
  { value: 'noon', label: 'День' },
  { value: 'evening', label: 'Вечер' },
];

export type ScheduleFormValues = {
  isActive: boolean;
  name: string;
  routeId: string;
  period: PatrolPeriod;
  earlyStartMinutes: number;
  weekdays: number[];
  startTime: string;
  endTime: string;
};

type ScheduleFormProps = {
  initial?: Partial<ScheduleFormValues>;
  routes: PatrolRoute[];
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onCancel?: () => void;
  onSubmit: (values: ScheduleFormValues) => void;
};

export function ScheduleForm({
  initial,
  routes,
  submitLabel,
  submitting,
  error,
  onCancel,
  onSubmit,
}: ScheduleFormProps): React.ReactElement {
  const activeRoutes = routes.filter((route) => route.isActive);
  const [name, setName] = useState(initial?.name ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [routeId, setRouteId] = useState(
    initial?.routeId ?? (activeRoutes.length === 1 ? activeRoutes[0]?.id ?? '' : ''),
  );
  const [period, setPeriod] = useState<PatrolPeriod>(initial?.period ?? 'morning');
  const [earlyStartMinutes, setEarlyStartMinutes] = useState(
    String(initial?.earlyStartMinutes ?? 0),
  );
  const [weekdays, setWeekdays] = useState<number[]>(initial?.weekdays ?? []);
  const [startTime, setStartTime] = useState(initial?.startTime ?? '');
  const [endTime, setEndTime] = useState(initial?.endTime ?? '');

  const earlyStartValue = Number.parseInt(earlyStartMinutes, 10);
  const earlyStartValid =
    /^\d+$/.test(earlyStartMinutes) && earlyStartValue >= 0 && earlyStartValue <= 1440;
  const routeOptions = routes
    .filter((route) => route.isActive || route.id === routeId)
    .map((route) => ({
      value: route.id,
      label: route.name,
      hint: `${route.category === 'external' ? 'Внешний' : 'Внутренний'} маршрут${
        route.isActive ? '' : ' · отключён'
      }`,
    }));
  const isValid =
    name.trim().length >= 1 &&
    routeId.length > 0 &&
    earlyStartValid &&
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
    onSubmit({
      isActive,
      name: name.trim(),
      routeId,
      period,
      earlyStartMinutes: earlyStartValue,
      weekdays,
      startTime,
      endTime,
    });
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
        <Select
          label="Маршрут"
          required
          icon="git-network-outline"
          value={routeId || null}
          placeholder="Выберите маршрут"
          title="Маршрут обхода"
          options={routeOptions}
          onChange={setRouteId}
          searchable={routeOptions.length > 8}
        />
        {routeOptions.length === 0 ? (
          <AppText variant="caption" color={colors.danger} style={styles.gapSm}>
            В магазине нет активных маршрутов.
          </AppText>
        ) : null}
      </View>

      <View style={styles.gapLg}>
        <Select
          label="Период"
          required
          value={period}
          title="Период обхода"
          options={PERIOD_OPTIONS}
          onChange={(value) => setPeriod(value as PatrolPeriod)}
        />
      </View>

      <View style={styles.gapLg}>
        <TextField
          label="Доступно заранее, минут"
          required
          icon="timer-outline"
          value={earlyStartMinutes}
          onChangeText={(text) => setEarlyStartMinutes(text.replace(/\D/g, '').slice(0, 4))}
          placeholder="0"
          keyboardType="number-pad"
          maxLength={4}
          error={earlyStartValid ? undefined : 'Введите число от 0 до 1440.'}
        />
      </View>

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

      <View style={styles.gapLg}>
        <StatusToggleCard
          label="Статус расписания"
          value={isActive}
          onChange={setIsActive}
          activeLabel="Расписание активно"
          inactiveLabel="Расписание отключено"
          activeDescription="Обходы по расписанию доступны сотрудникам"
          inactiveDescription="Обходы по расписанию не создаются"
        />
      </View>

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.gapLg}>
          {error}
        </AppText>
      ) : null}

      <View style={styles.submitSection}>
        <AppText variant="caption" muted>
          Поля, отмеченные{' '}
          <AppText variant="caption" color={colors.danger}>
            *
          </AppText>
          , обязательны
        </AppText>
        <View style={styles.submitButton}>
          <SubmitButton
            label={submitLabel}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!isValid}
          />
        </View>
        {onCancel ? (
          <View style={styles.cancelButton}>
            <CancelButton onPress={onCancel} disabled={submitting} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gapSm: {
    marginTop: spacing.sm,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  submitSection: {
    marginTop: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  cancelButton: {
    marginTop: spacing.md,
  },
  timeRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  timeField: {
    flex: 1,
  },
});
