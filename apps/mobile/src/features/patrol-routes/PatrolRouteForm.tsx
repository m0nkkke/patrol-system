import { Ionicons } from '@expo/vector-icons';
import type { PatrolRouteCategory, PatrolRoutePointSettingDto } from '@patrol/shared';
import { useMemo, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import type { RoutePoint } from '@/api/types';
import { appIcons, colors, radius, spacing } from '@/theme';
import {
  AppText,
  Card,
  EntityIcon,
  FieldLabel,
  SectionHeading,
  SegmentedControl,
  SubmitButton,
  TextField,
} from '@/ui';

import {
  buildPointSettings,
  DEFAULT_PATROL_POINT_DWELL_SECONDS,
  MAX_PATROL_POINT_DWELL_SECONDS,
  MIN_PATROL_POINT_DWELL_SECONDS,
  normalizeDwellSeconds,
} from './route-point-settings';

export type PatrolRouteFormValues = {
  category: PatrolRouteCategory;
  name: string;
  patrolPointIds: string[];
  pointSettings: PatrolRoutePointSettingDto[];
};

type PatrolRouteFormProps = {
  points: RoutePoint[];
  initial?: Partial<PatrolRouteFormValues>;
  submitLabel: string;
  submitting: boolean;
  error?: string | null;
  onSubmit: (values: PatrolRouteFormValues) => void;
};

const CATEGORY_OPTIONS = [
  { value: 'internal' as const, label: 'Внутренний', icon: 'business-outline' as const },
  { value: 'external' as const, label: 'Внешний', icon: appIcons.externalRoute },
];

export function PatrolRouteForm({
  points,
  initial,
  submitLabel,
  submitting,
  error,
  onSubmit,
}: PatrolRouteFormProps): React.ReactElement {
  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<PatrolRouteCategory>(initial?.category ?? 'internal');
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.patrolPointIds ?? []);
  const [dwellByPointId, setDwellByPointId] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      (initial?.pointSettings ?? []).map((setting) => [
        setting.patrolPointId,
        normalizeDwellSeconds(setting.dwellSeconds),
      ]),
    ),
  );

  const pointById = useMemo(() => new Map(points.map((point) => [point.id, point])), [points]);
  const selectedPoints = selectedIds
    .map((id) => pointById.get(id))
    .filter((point): point is RoutePoint => point !== undefined);
  const availablePoints = [...points]
    .filter((point) => point.isActive && !selectedIds.includes(point.id))
    .sort((left, right) => left.name.localeCompare(right.name, 'ru-RU'));
  const nameError =
    name.trim().length > 0 && name.trim().length < 2
      ? 'Название должно содержать минимум 2 символа.'
      : null;
  const valid = name.trim().length >= 2 && selectedIds.length > 0;

  function addPoint(pointId: string): void {
    setSelectedIds((current) => [...current, pointId]);
    setDwellByPointId((current) => ({
      ...current,
      [pointId]: current[pointId] ?? DEFAULT_PATROL_POINT_DWELL_SECONDS,
    }));
  }

  function removePoint(pointId: string): void {
    setSelectedIds((current) => current.filter((id) => id !== pointId));
  }

  function setPointDwell(pointId: string, dwellSeconds: number): void {
    setDwellByPointId((current) => ({
      ...current,
      [pointId]: normalizeDwellSeconds(dwellSeconds),
    }));
  }

  function movePoint(index: number, direction: -1 | 1): void {
    const target = index + direction;
    if (target < 0 || target >= selectedIds.length) return;

    setSelectedIds((current) => {
      const reordered = [...current];
      [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
      return reordered;
    });
  }

  function handleSubmit(): void {
    if (!valid || submitting) return;

    onSubmit({
      category,
      name: name.trim(),
      patrolPointIds: selectedIds,
      pointSettings: buildPointSettings(selectedIds, dwellByPointId),
    });
  }

  return (
    <View>
      <TextField
        label="Название маршрута"
        required
        value={name}
        onChangeText={setName}
        placeholder="Например, вечерний обход"
        icon="git-network-outline"
        maxLength={200}
        error={nameError}
      />

      <View style={styles.section}>
        <FieldLabel label="Тип маршрута" required />
        <SegmentedControl options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
      </View>

      <View style={styles.section}>
        <SectionHeading
          title="Точки маршрута"
          subtitle="Порядок прохождения и выдержка на каждой точке"
          trailing={
            <View style={styles.countBadge}>
              <AppText variant="caption" color={colors.primary}>
                {selectedPoints.length}
              </AppText>
            </View>
          }
        />

        {selectedPoints.length === 0 ? (
          <View style={styles.emptySelection}>
            <EntityIcon icon="location-outline" tone="neutral" />
            <View style={styles.emptyCopy}>
              <AppText variant="label">Маршрут пока пуст</AppText>
              <AppText variant="caption" muted style={styles.pointMeta}>
                Выберите хотя бы одну контрольную точку ниже.
              </AppText>
            </View>
          </View>
        ) : (
          selectedPoints.map((point, index) => (
            <Card key={point.id} style={styles.pointCard}>
              <View style={styles.pointHeader}>
                <View style={styles.orderBadge}>
                  <AppText variant="label" color={colors.primary}>
                    {index + 1}
                  </AppText>
                </View>
                <View style={styles.pointContent}>
                  <AppText variant="label" numberOfLines={2}>
                    {point.name}
                  </AppText>
                  {!point.isActive ? (
                    <AppText variant="caption" color={colors.warning} style={styles.pointMeta}>
                      Точка находится в архиве
                    </AppText>
                  ) : point.description ? (
                    <AppText variant="caption" muted numberOfLines={2} style={styles.pointMeta}>
                      {point.description}
                    </AppText>
                  ) : null}
                </View>
                <IconAction
                  icon="trash-outline"
                  label={`Убрать точку ${point.name} из маршрута`}
                  danger
                  onPress={() => removePoint(point.id)}
                />
              </View>

              <View style={styles.orderControls}>
                <AppText variant="caption" muted style={styles.orderLabel}>
                  Позиция {index + 1} из {selectedPoints.length}
                </AppText>
                <IconAction
                  icon="arrow-up"
                  label="Переместить точку выше"
                  disabled={index === 0}
                  onPress={() => movePoint(index, -1)}
                />
                <IconAction
                  icon="arrow-down"
                  label="Переместить точку ниже"
                  disabled={index === selectedPoints.length - 1}
                  onPress={() => movePoint(index, 1)}
                />
              </View>

              <DwellTimeControl
                value={dwellByPointId[point.id] ?? DEFAULT_PATROL_POINT_DWELL_SECONDS}
                onChange={(value) => setPointDwell(point.id, value)}
              />
            </Card>
          ))
        )}
      </View>

      <View style={styles.section}>
        <SectionHeading
          title="Доступные точки"
          subtitle={
            availablePoints.length > 0
              ? `Можно добавить: ${availablePoints.length}`
              : 'Все активные точки уже используются'
          }
        />
        {availablePoints.map((point) => (
          <TouchableOpacity
            key={point.id}
            style={styles.availablePoint}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel={`Добавить точку ${point.name}`}
            onPress={() => addPoint(point.id)}
          >
            <EntityIcon icon="location-outline" size="small" />
            <View style={styles.availableContent}>
              <AppText variant="body" numberOfLines={2}>
                {point.name}
              </AppText>
              {point.description ? (
                <AppText variant="caption" muted numberOfLines={1} style={styles.pointMeta}>
                  {point.description}
                </AppText>
              ) : null}
            </View>
            <Ionicons name="add-circle-outline" size={26} color={colors.primary} />
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.error}>
          {error}
        </AppText>
      ) : null}

      <View style={styles.submit}>
        <AppText variant="caption" muted>
          Поля, отмеченные <AppText variant="caption" color={colors.danger}>*</AppText>, обязательны
        </AppText>
        <View style={styles.submitButton}>
          <SubmitButton
            label={submitLabel}
            loading={submitting}
            disabled={!valid}
            onPress={handleSubmit}
          />
        </View>
      </View>
    </View>
  );
}

function DwellTimeControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}): React.ReactElement {
  const step = 15;

  return (
    <View style={styles.dwellRow}>
      <View style={styles.dwellCopy}>
        <AppText variant="caption">Выдержка на точке</AppText>
        <AppText variant="caption" muted style={styles.dwellHint}>
          до повторного сканирования
        </AppText>
      </View>
      <View style={styles.stepper}>
        <IconAction
          icon="remove"
          label="Уменьшить выдержку на 15 секунд"
          disabled={value <= MIN_PATROL_POINT_DWELL_SECONDS}
          onPress={() => onChange(value - step)}
        />
        <TextInput
          accessibilityLabel="Выдержка на точке в секундах"
          keyboardType="number-pad"
          maxLength={3}
          selectTextOnFocus
          style={styles.dwellInput}
          value={String(value)}
          onChangeText={(text) => onChange(Number(text.replace(/\D/g, '')))}
        />
        <AppText variant="caption" muted style={styles.secondsLabel}>
          сек.
        </AppText>
        <IconAction
          icon="add"
          label="Увеличить выдержку на 15 секунд"
          disabled={value >= MAX_PATROL_POINT_DWELL_SECONDS}
          onPress={() => onChange(value + step)}
        />
      </View>
    </View>
  );
}

function IconAction({
  icon,
  label,
  onPress,
  disabled = false,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}): React.ReactElement {
  return (
    <TouchableOpacity
      style={[styles.iconAction, disabled && styles.iconActionDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.primary} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xl,
  },
  countBadge: {
    alignItems: 'center',
    backgroundColor: colors.chipBackground,
    borderRadius: radius.full,
    justifyContent: 'center',
    minHeight: 26,
    minWidth: 26,
    paddingHorizontal: spacing.sm,
  },
  emptySelection: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.lg,
  },
  emptyCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  pointCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  pointHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  orderBadge: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.full,
    height: 36,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 36,
  },
  pointContent: {
    flex: 1,
    minWidth: 0,
  },
  pointMeta: {
    marginTop: spacing.xs,
  },
  orderControls: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
  },
  orderLabel: {
    flex: 1,
  },
  dwellRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    paddingTop: spacing.md,
  },
  dwellCopy: {
    flex: 1,
    marginRight: spacing.sm,
  },
  dwellHint: {
    fontSize: 12,
    marginTop: 2,
  },
  stepper: {
    alignItems: 'center',
    backgroundColor: colors.controlSurface,
    borderColor: colors.controlBorder,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    height: 40,
  },
  dwellInput: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    paddingHorizontal: 0,
    textAlign: 'right',
    width: 32,
  },
  secondsLabel: {
    marginLeft: 2,
  },
  iconAction: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconActionDisabled: {
    opacity: 0.25,
  },
  availablePoint: {
    alignItems: 'center',
    backgroundColor: colors.controlSurface,
    borderColor: colors.controlBorder,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.sm,
    minHeight: 64,
    padding: spacing.md,
  },
  availableContent: {
    flex: 1,
    marginHorizontal: spacing.md,
    minWidth: 0,
  },
  error: {
    marginTop: spacing.lg,
  },
  submit: {
    marginTop: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.md,
  },
});
