import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { Shop } from '@/api/types';
import { useCreateShop } from '@/features/shops/queries';
import { RUSSIAN_TIMEZONES, timezoneCurrentTime } from '@/lib/timezones';
import { colors, radius, spacing } from '@/theme';
import {
  AppText,
  Button,
  FormHeader,
  Header,
  ResultHeader,
  ResultScreen,
  Screen,
  Select,
  TextField,
} from '@/ui';

const DEFAULT_TIMEZONE = 'Europe/Moscow';

export default function CreateShopScreen(): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [createdShop, setCreatedShop] = useState<Shop | null>(null);

  const { mutate, isPending, isError, error } = useCreateShop();

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

  function resetForm(): void {
    setName('');
    setExternalId('');
    setAddress('');
    setTimezone(DEFAULT_TIMEZONE);
    setCreatedShop(null);
  }

  if (createdShop) {
    return (
      <CreatedShopResult shop={createdShop} onCreateMore={resetForm} onDone={() => router.back()} />
    );
  }

  const isValid = name.trim().length >= 2;

  function handleSubmit(): void {
    if (!isValid || isPending) {
      return;
    }
    mutate(
      {
        name: name.trim(),
        externalId: externalId.trim() || undefined,
        address: address.trim() || undefined,
        timezone,
      },
      { onSuccess: setCreatedShop },
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header onBack={() => router.back()} />
          <FormHeader
            icon="business"
            title="Новый магазин"
            subtitle="Заполните информацию о точке"
          />

          <TextField
            label="Название"
            required
            icon="list-outline"
            value={name}
            onChangeText={setName}
            placeholder="Магазин №42"
          />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <AppText variant="caption" muted style={styles.dividerText}>
              ДОПОЛНИТЕЛЬНО
            </AppText>
            <View style={styles.dividerLine} />
          </View>

          <TextField
            label="ID магазина"
            icon="pricetag-outline"
            value={externalId}
            onChangeText={setExternalId}
            placeholder="00234343"
            autoCapitalize="none"
            autoCorrect={false}
          />
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

          {isError ? (
            <AppText variant="caption" color={colors.danger} style={styles.gapLg}>
              {describeError(error)}
            </AppText>
          ) : null}

          <View style={styles.gapXl}>
            <Button
              label="Создать магазин"
              icon="checkmark-circle-outline"
              onPress={handleSubmit}
              loading={isPending}
              disabled={!isValid}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function CreatedShopResult({
  shop,
  onCreateMore,
  onDone,
}: {
  shop: Shop;
  onCreateMore: () => void;
  onDone: () => void;
}): React.ReactElement {
  return (
    <ResultScreen
      onBack={onDone}
      footer={
        <>
          <Button label="Создать ещё" icon="add-outline" onPress={onCreateMore} />
          <View style={styles.gapSm}>
            <Button label="Готово" variant="ghost" onPress={onDone} />
          </View>
        </>
      }
    >
      <ResultHeader
        icon="checkmark"
        iconColor={colors.success}
        iconBackground={colors.successBackground}
        title="Магазин создан!"
        subtitle="Магазин добавлен в систему"
      />

      <View style={styles.shopCard}>
        <View style={styles.shopIcon}>
          <Ionicons name="storefront-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.shopInfo}>
          <AppText variant="heading">{shop.name}</AppText>
          {shop.externalId ? (
            <AppText variant="caption" muted style={styles.shopMeta}>
              ID: {shop.externalId}
            </AppText>
          ) : null}
          {shop.address ? (
            <AppText variant="caption" muted style={styles.shopMeta}>
              {shop.address}
            </AppText>
          ) : null}
        </View>
      </View>
    </ResultScreen>
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
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    backgroundColor: colors.border,
    flex: 1,
    height: 1,
  },
  dividerText: {
    letterSpacing: 0.6,
    marginHorizontal: spacing.md,
  },
  shopCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    padding: spacing.lg,
  },
  shopIcon: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.md,
    height: 48,
    justifyContent: 'center',
    marginRight: spacing.lg,
    width: 48,
  },
  shopInfo: {
    flex: 1,
  },
  shopMeta: {
    marginTop: spacing.xs,
  },
  gapSm: {
    marginTop: spacing.sm,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  gapXl: {
    marginTop: spacing.xl,
  },
});
