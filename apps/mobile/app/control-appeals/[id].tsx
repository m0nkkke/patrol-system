import type { AnonymousAppealCategory, AnonymousAppealStatus } from '@patrol/shared';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import {
  APPEAL_CATEGORY_LABELS,
  APPEAL_STATUS_LABELS,
  appealCategoryIcon,
  appealStatusTone,
} from '@/features/anonymous/format';
import { useAnonymousAppeal, useUpdateAnonymousAppeal } from '@/features/anonymous/queries';
import { formatDateTime } from '@/lib/format';
import { colors, radius, screenInsets, spacing } from '@/theme';
import {
  AppDialog,
  AppText,
  AppToast,
  AsyncStateScreen,
  Badge,
  Card,
  DetailRow,
  Header,
  Screen,
  Select,
  SubmitButton,
} from '@/ui';

const STATUS_OPTIONS = Object.entries(APPEAL_STATUS_LABELS).map(([value, label]) => ({
  value,
  label,
}));

export default function ControlAppealDetailsScreen(): React.ReactElement {
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const appeal = useAnonymousAppeal(id);
  const update = useUpdateAnonymousAppeal(id);
  const [status, setStatus] = useState<AnonymousAppealStatus>('new');
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (appeal.data) {
      setStatus(appeal.data.status);
    }
  }, [appeal.data]);

  if (appeal.isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }
  if (appeal.isError || !appeal.data) {
    return (
      <AsyncStateScreen
        message={describeError(appeal.error)}
        onBack={() => router.back()}
        onRetry={() => void appeal.refetch()}
      />
    );
  }

  const item = appeal.data;
  const hasStatusChange = status !== item.status;
  const presentation = appealCategoryPresentation(item.category);
  const toastMessage = update.isError
    ? describeError(update.error)
    : update.isSuccess
      ? 'Статус обращения обновлён'
      : null;

  function applyStatus(): void {
    update.mutate(status, { onSuccess: () => setConfirmOpen(false) });
  }

  return (
    <Screen padded={false}>
      <AppToast message={toastMessage} tone={update.isSuccess ? 'success' : 'danger'} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Header title="Анонимное обращение" onBack={() => router.back()} />

        <Card style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={[styles.heroIcon, { backgroundColor: presentation.background }]}>
              <Ionicons
                name={appealCategoryIcon(item.category)}
                size={28}
                color={presentation.color}
              />
            </View>
            <View style={styles.heroContent}>
              <AppText variant="heading" numberOfLines={2}>
                {APPEAL_CATEGORY_LABELS[item.category]}
              </AppText>
              <AppText variant="caption" muted style={styles.heroDate}>
                Получено {formatDateTime(item.createdAt)}
              </AppText>
              <View style={styles.heroBadge}>
                <Badge
                  compact
                  label={APPEAL_STATUS_LABELS[item.status]}
                  tone={appealStatusTone(item.status)}
                />
              </View>
            </View>
          </View>
        </Card>

        <SectionTitle title="Текст обращения" />
        <Card style={styles.messageCard}>
          <Ionicons name="chatbox-ellipses-outline" size={22} color={colors.primary} />
          <AppText variant="body" style={styles.message} selectable>
            {item.message}
          </AppText>
        </Card>

        <SectionTitle title="Основные данные" />
        <Card style={styles.detailsCard}>
          <DetailRow
            first
            icon="storefront-outline"
            label="Магазин"
            value={item.shop?.name ?? 'Не указан'}
          />
          {item.shop?.address ? (
            <DetailRow icon="location-outline" label="Адрес" value={item.shop.address} />
          ) : null}
          <DetailRow
            icon="calendar-outline"
            label="Получено"
            value={formatDateTime(item.createdAt)}
          />
          <DetailRow
            icon="time-outline"
            label="Последнее изменение"
            value={formatDateTime(item.updatedAt)}
          />
        </Card>

        <SectionTitle title="Обработка обращения" />
        <Card style={styles.statusCard}>
          <Select
            label="Статус обращения"
            icon="flag-outline"
            title="Статус обращения"
            value={status}
            options={STATUS_OPTIONS}
            onChange={(value) => {
              update.reset();
              setStatus(value as AnonymousAppealStatus);
            }}
          />
          <View style={styles.button}>
            <SubmitButton
              label="Сохранить статус"
              onPress={() => setConfirmOpen(true)}
              disabled={!hasStatusChange}
              loading={update.isPending}
            />
          </View>
        </Card>
      </ScrollView>

      <AppDialog
        visible={confirmOpen}
        title="Изменить статус обращения?"
        message={`Новый статус: ${APPEAL_STATUS_LABELS[status]}.`}
        tone="info"
        actions={[
          { label: 'Подтвердить', onPress: applyStatus },
          { label: 'Отмена', onPress: () => setConfirmOpen(false), variant: 'ghost' },
        ]}
        onClose={() => setConfirmOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  errorText: { marginBottom: spacing.lg, textAlign: 'center' },
  heroCard: { padding: spacing.lg },
  heroRow: { alignItems: 'center', flexDirection: 'row' },
  heroIcon: {
    alignItems: 'center',
    borderRadius: radius.md,
    height: 58,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 58,
  },
  heroContent: { flex: 1, minWidth: 0 },
  heroDate: { marginTop: spacing.xs },
  heroBadge: { marginTop: spacing.sm },
  sectionTitle: { marginBottom: spacing.sm, marginTop: spacing.xl },
  messageCard: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    padding: spacing.lg,
  },
  message: { flex: 1, marginLeft: spacing.md },
  detailsCard: { paddingHorizontal: spacing.lg, paddingVertical: 0 },
  statusCard: { padding: spacing.lg },
  button: { marginTop: spacing.lg },
});

function SectionTitle({ title }: { title: string }): React.ReactElement {
  return (
    <AppText variant="label" style={styles.sectionTitle}>
      {title}
    </AppText>
  );
}

function appealCategoryPresentation(category: AnonymousAppealCategory): {
  background: string;
  color: string;
} {
  if (category === 'complaint') {
    return { background: colors.iconOrangeBackground, color: colors.iconOrange };
  }
  if (category === 'safety') {
    return { background: colors.dangerSurface, color: colors.danger };
  }
  if (category === 'other') {
    return { background: colors.iconSlateBackground, color: colors.iconSlate };
  }
  return { background: colors.iconBlueBackground, color: colors.primary };
}
