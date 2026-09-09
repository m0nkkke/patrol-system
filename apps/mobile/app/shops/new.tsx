import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { ApiError } from '@/api/errors';
import type { Shop } from '@/api/types';
import { useCreateShop } from '@/features/shops/queries';
import { RUSSIAN_TIMEZONES, timezoneCurrentTime } from '@/lib/timezones';
import { useNetworkStatus } from '@/lib/use-network-status';
import { colors, radius, screenInsets, spacing } from '@/theme';
import {
  AppText,
  Button,
  CompactTextIcon,
  FormHeader,
  Header,
  ResultHeader,
  ResultScreen,
  Screen,
  Select,
  SubmitButton,
  TextField,
} from '@/ui';

const DEFAULT_TIMEZONE = 'Asia/Irkutsk';

export default function CreateShopScreen(): React.ReactElement {
  const router = useRouter();
  const [name, setName] = useState('');
  const [externalId, setExternalId] = useState('');
  const [address, setAddress] = useState('');
  const [timezone, setTimezone] = useState(DEFAULT_TIMEZONE);
  const [createdShop, setCreatedShop] = useState<Shop | null>(null);
  const networkStatus = useNetworkStatus();

  const { mutate, isPending, isError, error } = useCreateShop();

  const externalIdError =
    isError && error instanceof ApiError && error.code === 'SHOP_EXTERNAL_ID_TAKEN'
      ? describeError(error)
      : null;

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
      <CreatedShopResult
        shop={createdShop}
        onCreateMore={resetForm}
        onOpen={() =>
          router.dismissTo({ pathname: '/shops/[id]', params: { id: createdShop.id } })
        }
        onDone={() => router.dismissTo('/shops')}
      />
    );
  }

  const isValid = name.trim().length >= 2;

  function handleSubmit(): void {
    if (!isValid || isPending || networkStatus !== 'online') {
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
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header onBack={() => router.back()} />
          <FormHeader
            icon="storefront-outline"
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
            iconText="ID"
            value={externalId}
            onChangeText={setExternalId}
            placeholder="00234343"
            autoCapitalize="none"
            autoCorrect={false}
            error={externalIdError}
          />
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

          {isError && !externalIdError ? (
            <AppText variant="caption" color={colors.danger} style={styles.gapLg}>
              {describeError(error)}
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
            {networkStatus === 'offline' ? (
              <AppText variant="caption" color={colors.warning} style={styles.offlineHint}>
                Для создания магазина требуется подключение к интернету.
              </AppText>
            ) : null}
            <View style={styles.submitButton}>
              <SubmitButton
                label="Создать магазин"
                onPress={handleSubmit}
                loading={isPending}
                disabled={!isValid || networkStatus !== 'online'}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function CreatedShopResult({
  shop,
  onCreateMore,
  onOpen,
  onDone,
}: {
  shop: Shop;
  onCreateMore: () => void;
  onOpen: () => void;
  onDone: () => void;
}): React.ReactElement {
  const timezone = RUSSIAN_TIMEZONES.find((item) => item.value === shop.timezone);
  const timezoneLabel = timezone ? `${timezone.city} · ${timezone.offset}` : shop.timezone;

  return (
    <ResultScreen
      footer={
        <>
          <Button label="Создать ещё" onPress={onCreateMore} />
          <View style={styles.gapMd}>
            <Button
              label="Перейти в магазин"
              variant="secondary"
              icon="storefront-outline"
              onPress={onOpen}
            />
          </View>
          <View style={styles.gapSm}>
            <Button label="Готово" icon="checkmark-outline" variant="ghost" onPress={onDone} />
          </View>
        </>
      }
    >
      <ResultHeader
        icon="checkmark"
        iconColor={colors.success}
        iconBackground={colors.successBackground}
        title="Магазин создан!"
        celebration
      />

      <View style={styles.shopCard}>
        <View style={styles.shopHeading}>
          <View style={styles.shopIcon}>
            <Ionicons name="storefront-outline" size={24} color={colors.primary} />
          </View>
          <AppText variant="heading" numberOfLines={2} style={styles.shopName}>
            {shop.name}
          </AppText>
        </View>

        <View style={styles.shopDetails}>
          <ShopResultRow
            iconText="ID"
            label="ID магазина"
            value={shop.externalId ?? '—'}
            first
          />
          <ShopResultRow icon="location-outline" label="Адрес" value={shop.address ?? '—'} />
          <ShopResultRow icon="time-outline" label="Часовой пояс" value={timezoneLabel} />
        </View>
      </View>

      <View style={styles.successNotice}>
        <Ionicons name="checkmark-circle-outline" size={24} color={colors.success} />
        <AppText variant="body" style={styles.successNoticeText}>
          Информация о магазине сохранена и готова к настройке
        </AppText>
      </View>
    </ResultScreen>
  );
}

function ShopResultRow({
  first = false,
  icon,
  iconText,
  label,
  value,
}: {
  first?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  iconText?: string;
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <View style={[styles.shopDetailRow, first && styles.shopDetailRowFirst]}>
      <View style={styles.shopDetailLabel}>
        {iconText ? (
          <CompactTextIcon label={iconText} />
        ) : icon ? (
          <Ionicons name={icon} size={20} color={colors.textMuted} />
        ) : null}
        <AppText variant="caption" muted style={styles.shopDetailLabelText}>
          {label}
        </AppText>
      </View>
      <AppText variant="body" numberOfLines={3} style={styles.shopDetailValue}>
        {value}
      </AppText>
    </View>
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
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.lg,
  },
  shopHeading: {
    alignItems: 'center',
    flexDirection: 'row',
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
  shopName: {
    flex: 1,
    minWidth: 0,
  },
  shopDetails: {
    marginTop: spacing.lg,
  },
  shopDetailRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    minHeight: 64,
    paddingVertical: spacing.md,
  },
  shopDetailRowFirst: {
    borderTopWidth: 0,
  },
  shopDetailLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    width: '46%',
  },
  shopDetailLabelText: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  shopDetailValue: {
    flex: 1,
    marginLeft: spacing.md,
    textAlign: 'right',
  },
  successNotice: {
    alignItems: 'center',
    backgroundColor: colors.successBackground,
    borderRadius: radius.md,
    flexDirection: 'row',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  successNoticeText: {
    flex: 1,
    marginLeft: spacing.md,
  },
  gapSm: {
    marginTop: spacing.sm,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  gapMd: {
    marginTop: spacing.md,
  },
  submitSection: {
    marginTop: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  offlineHint: {
    marginTop: spacing.sm,
  },
});
