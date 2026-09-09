import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import { useShop, useUpdateShop } from '@/features/route-setup/queries';
import { RUSSIAN_TIMEZONES, timezoneCurrentTime } from '@/lib/timezones';
import { colors, screenInsets, spacing } from '@/theme';
import {
  AppText,
  AsyncStateScreen,
  CancelButton,
  FormHeader,
  Header,
  InfoCallout,
  Screen,
  Select,
  StatusToggleCard,
  SubmitButton,
  TextField,
} from '@/ui';

export default function EditShopScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: shop, isPending, isError, error, refetch } = useShop(id);
  const { mutate, isPending: isSaving, isError: isSaveError, error: saveError } = useUpdateShop(id);

  const [name, setName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState('Asia/Irkutsk');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (shop) {
      setName(shop.name);
      setExternalId(shop.externalId ?? '');
      setAddress(shop.address ?? '');
      setTimezone(shop.timezone);
      setIsActive(shop.isActive);
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
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }

  if (isError || !shop) {
    return (
      <AsyncStateScreen
        message={describeError(error)}
        onBack={() => router.back()}
        onRetry={() => void refetch()}
      />
    );
  }

  const isValid = name.trim().length >= 2;

  function handleSubmit(): void {
    if (!isValid || isSaving) {
      return;
    }
    mutate(
      {
        name: name.trim(),
        externalId: externalId.trim() || undefined,
        address: address.trim() || undefined,
        timezone,
        isActive,
      },
      { onSuccess: () => router.back() },
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header onBack={() => router.back()} right={<View />} />
          <FormHeader
            icon="storefront-outline"
            title="Редактирование"
            subtitle="Изменение данных магазина"
          />

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
              iconText="ID"
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
              placeholder="Улан-Удэ, ул. Ленина, 1"
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
            />
          </View>
          <View style={styles.gapLg}>
            <StatusToggleCard
              label="Статус магазина"
              value={isActive}
              onChange={setIsActive}
              activeLabel="Магазин активен"
              inactiveLabel="Магазин неактивен"
              activeDescription="Магазин доступен назначенным пользователям"
              inactiveDescription="Неактивный магазин недоступен пользователям"
            />
          </View>

          {isSaveError ? (
            <AppText variant="caption" color={colors.danger} style={styles.gapLg}>
              {describeError(saveError)}
            </AppText>
          ) : null}

          <View style={styles.info}>
            <InfoCallout text="История изменений сохраняется в системе" />
          </View>

          <View style={styles.actions}>
            <SubmitButton
              label="Сохранить изменения"
              onPress={handleSubmit}
              loading={isSaving}
              disabled={!isValid}
            />
            <View style={styles.cancelButton}>
              <CancelButton onPress={() => router.back()} />
            </View>
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
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
    paddingBottom: screenInsets.bottom,
  },
  centerText: {
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  info: {
    marginTop: spacing.xl,
  },
  actions: {
    marginTop: spacing.lg,
  },
  cancelButton: {
    marginTop: spacing.md,
  },
});
