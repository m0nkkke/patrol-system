import { Ionicons } from '@expo/vector-icons';
import type { AnonymousAppealCategory } from '@patrol/shared';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { useCreateAnonymousAppeal } from '@/features/anonymous/queries';
import { SelectedShopSummary } from '@/features/shops/SelectedShopSummary';
import { useNetworkStatus } from '@/lib/use-network-status';
import { useAuthStore } from '@/store/auth-store';
import { colors, radius, screenInsets, spacing } from '@/theme';
import {
  AppDialog,
  AppText,
  AppToast,
  FormHeader,
  Header,
  Screen,
  Select,
  SubmitButton,
  TextField,
} from '@/ui';

const CATEGORIES = [
  { value: 'message', label: 'Сообщение' },
  { value: 'complaint', label: 'Жалоба' },
  { value: 'safety', label: 'Безопасность' },
  { value: 'other', label: 'Другое' },
] as const;

export default function AnonymousScreen(): React.ReactElement {
  const router = useRouter();
  const shopId = useAuthStore((state) => state.selectedShopId);
  const [category, setCategory] = useState<AnonymousAppealCategory>('message');
  const [message, setMessage] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const create = useCreateAnonymousAppeal();
  const networkStatus = useNetworkStatus();
  const error = localError ?? (create.isError ? describeError(create.error) : null);

  function submit(): void {
    const trimmedMessage = message.trim();
    if (!shopId) {
      setLocalError('Сначала выберите магазин.');
      return;
    }
    if (trimmedMessage.length < 5) {
      setLocalError('Введите сообщение длиной не менее 5 символов.');
      return;
    }
    if (networkStatus !== 'online') {
      setLocalError('Для отправки обращения требуется подключение к интернету.');
      return;
    }
    setLocalError(null);
    create.mutate(
      { shopId, category, message: trimmedMessage },
      { onSuccess: () => setSent(true) },
    );
  }

  return (
    <Screen padded={false}>
      <AppToast message={error} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header compact onBack={() => router.back()} right={<View />} />
          <FormHeader
            title="Анонимное обращение"
            subtitle="Сообщите о проблеме службе контроля"
          />

          <SelectedShopSummary shopId={shopId} />

          <View style={styles.privacyNotice}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
            <AppText variant="caption" muted style={styles.privacyText}>
              Служба контроля увидит выбранный магазин, но не ФИО сотрудника.
            </AppText>
          </View>

          <View style={styles.formSection}>
            <Select
              label="Категория"
              required
              icon="list-outline"
              title="Категория обращения"
              value={category}
              options={[...CATEGORIES]}
              onChange={(value) => setCategory(value as AnonymousAppealCategory)}
            />
            <View style={styles.gapLg}>
              <TextField
                label="Сообщение"
                required
                value={message}
                onChangeText={setMessage}
                placeholder="Опишите ситуацию или проблему"
                multiline
                maxLength={4000}
                style={styles.message}
              />
              <AppText variant="caption" muted style={styles.counter}>
                {message.length} / 4000
              </AppText>
            </View>
            <View style={styles.submitSection}>
              <SubmitButton
                label="Отправить обращение"
                icon="send-outline"
                onPress={submit}
                loading={create.isPending}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AppDialog
        visible={sent}
        title="Обращение отправлено"
        message="Служба контроля получила обращение и сможет изменить его статус после рассмотрения."
        tone="success"
        actions={[{ label: 'На главную', onPress: () => router.dismissTo('/') }]}
        onClose={() => router.dismissTo('/')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gapLg: { marginTop: spacing.lg },
  message: { minHeight: 160, textAlignVertical: 'top' },
  counter: { marginTop: spacing.xs, textAlign: 'right' },
  privacyNotice: {
    alignItems: 'center',
    backgroundColor: colors.controlSurface,
    borderColor: colors.controlBorder,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.md,
    padding: spacing.md,
  },
  privacyText: { flex: 1, marginLeft: spacing.md },
  formSection: { marginTop: spacing.xl },
  submitSection: { marginTop: spacing.xl },
  scroll: {
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
});
