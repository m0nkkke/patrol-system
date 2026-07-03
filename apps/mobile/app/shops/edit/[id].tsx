import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import { useDeleteShop, useShop, useUpdateShop } from '@/features/route-setup/queries';
import { RUSSIAN_TIMEZONES, timezoneCurrentTime } from '@/lib/timezones';
import { colors, spacing } from '@/theme';
import {
  AppText,
  AppDialog,
  Button,
  FieldLabel,
  FormHeader,
  Header,
  Screen,
  SegmentedControl,
  type SegmentOption,
  Select,
  TextField,
} from '@/ui';

type StatusValue = 'active' | 'inactive';

const STATUS_SEGMENTS: SegmentOption<StatusValue>[] = [
  { value: 'active', label: 'Активен', icon: 'checkmark-circle-outline' },
  { value: 'inactive', label: 'Неактивен', icon: 'close-circle-outline' },
];

export default function EditShopScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: shop, isPending, isError, error, refetch } = useShop(id);
  const { mutate, isPending: isSaving, isError: isSaveError, error: saveError } = useUpdateShop(id);
  const {
    mutate: deleteShop,
    isPending: isDeleting,
    isError: isDeleteError,
    error: deleteError,
  } = useDeleteShop(id);

  const [name, setName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('Asia/Irkutsk');
  const [status, setStatus] = useState<StatusValue>('active');
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);

  useEffect(() => {
    if (shop) {
      setName(shop.name);
      setExternalId(shop.externalId ?? '');
      setAddress(shop.address ?? '');
      setTimezone(shop.timezone);
      setStatus(shop.isActive ? 'active' : 'inactive');
    }
  }, [shop]);

  const timezoneOptions = useMemo(
    () =>
      RUSSIAN_TIMEZONES.map((zone) => {
        const time = timezoneCurrentTime(zone.value);
        return {
          value: zone.value,
          label: `${zone.city} · ${zone.offset}`,
          hint: time ? `Сейчас ${time}` : zone.value,
        };
      }),
    [],
  );

  if (isPending) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (isError || !shop) {
    return (
      <Screen centered>
        <AppText muted style={styles.centerText}>
          {describeError(error)}
        </AppText>
        <Button label="Повторить" variant="secondary" onPress={() => void refetch()} />
      </Screen>
    );
  }

  const isValid = name.trim().length >= 2;

  function handleSubmit(): void {
    if (!isValid || isSaving || isDeleting) {
      return;
    }
    mutate(
      {
        name: name.trim(),
        externalId: externalId.trim() || undefined,
        address: address.trim() || undefined,
        timezone,
        isActive: status === 'active',
      },
      { onSuccess: () => router.back() },
    );
  }

  function handleDelete(): void {
    if (isDeleting) {
      return;
    }
    deleteShop(undefined, {
      onSuccess: () => router.replace('/shops'),
      onSettled: () => setDeleteDialogVisible(false),
    });
  }

  return (
    <Screen padded={false}>
      <AppDialog
        visible={deleteDialogVisible}
        title="Удалить магазин?"
        message="Магазин исчезнет из приложения и обычных списков. История обходов и связанные данные останутся в базе."
        tone="danger"
        actions={[
          {
            label: isDeleting ? 'Удаление...' : 'Удалить',
            variant: 'danger',
            onPress: handleDelete,
          },
          {
            label: 'Отмена',
            variant: 'ghost',
            onPress: () => setDeleteDialogVisible(false),
          },
        ]}
        onClose={() => setDeleteDialogVisible(false)}
      />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header onBack={() => router.back()} />
          <FormHeader icon="business" title="Редактирование" subtitle="Изменение данных магазина" />

          <TextField
            label="Название"
            required
            icon="list-outline"
            value={name}
            onChangeText={setName}
            placeholder="Магазин №42"
          />

          <View style={styles.gapLg}>
            <TextField
              label="ID магазина"
              icon="pricetag-outline"
              value={externalId}
              onChangeText={setExternalId}
              placeholder="00234343"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.gapLg}>
            <TextField
              label="Адрес"
              icon="location-outline"
              value={address}
              onChangeText={setAddress}
              placeholder="Красноярск, ул. Мира, 1"
            />
          </View>
          <View style={styles.gapLg}>
            <Select
              label="Часовой пояс"
              icon="time-outline"
              title="Часовой пояс"
              value={timezone}
              options={timezoneOptions}
              onChange={setTimezone}
              searchable
            />
          </View>
          <View style={styles.gapLg}>
            <FieldLabel label="Статус" />
            <SegmentedControl options={STATUS_SEGMENTS} value={status} onChange={setStatus} />
          </View>

          {isSaveError || isDeleteError ? (
            <AppText variant="caption" color={colors.danger} style={styles.gapLg}>
              {describeError(saveError ?? deleteError)}
            </AppText>
          ) : null}

          <View style={styles.gapXl}>
            <Button
              label="Сохранить"
              icon="checkmark-circle-outline"
              onPress={handleSubmit}
              loading={isSaving}
              disabled={!isValid || isDeleting}
            />
          </View>
          <View style={styles.gapMd}>
            <Button
              label="Удалить магазин"
              icon="trash-outline"
              variant="dangerSecondary"
              onPress={() => setDeleteDialogVisible(true)}
              loading={isDeleting}
              disabled={isSaving}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  centerText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  gapMd: {
    marginTop: spacing.md,
  },
  gapXl: {
    marginTop: spacing.xl,
  },
});
