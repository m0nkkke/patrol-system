import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import { useUpdateUser, useUser } from '@/features/users/queries';
import { canChangeUserStatus } from '@/features/users/user-detail-capabilities';
import { useAuthStore } from '@/store/auth-store';
import { colors, screenInsets, spacing } from '@/theme';
import {
  AppText,
  AsyncStateScreen,
  CancelButton,
  FormHeader,
  Header,
  InfoCallout,
  Screen,
  StatusToggleCard,
  SubmitButton,
  TextField,
} from '@/ui';

export default function EditUserScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const { data: user, isPending, isError, error, refetch } = useUser(id);
  const update = useUpdateUser(id);

  const [fullName, setFullName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!user || seeded) {
      return;
    }

    setFullName(user.fullName);
    setIsActive(user.isActive);
    setSeeded(true);
  }, [seeded, user]);

  if (isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }

  if (isError || !user) {
    return (
      <AsyncStateScreen
        message={describeError(error)}
        onBack={() => router.back()}
        onRetry={() => void refetch()}
      />
    );
  }

  const isValid = fullName.trim().length >= 2;
  const canChangeStatus = canChangeUserStatus(user.id, currentUserId);

  function handleSubmit(): void {
    if (!isValid || update.isPending) {
      return;
    }

    update.mutate(
      {
        fullName: fullName.trim(),
        ...(canChangeStatus ? { isActive } : {}),
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
            icon="create-outline"
            title="Редактирование"
            subtitle="Изменение данных пользователя"
          />

          <TextField
            label="ФИО"
            required
            icon="person-outline"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Иван Петров"
            autoCapitalize="words"
          />

          {canChangeStatus ? (
            <View style={styles.gapLg}>
              <StatusToggleCard
                label="Статус пользователя"
                value={isActive}
                onChange={setIsActive}
                activeLabel="Пользователь активен"
                inactiveLabel="Пользователь неактивен"
                activeDescription="Пользователь может входить и работать в системе"
                inactiveDescription="Неактивный пользователь не может войти в систему"
              />
            </View>
          ) : null}

          {update.isError ? (
            <AppText variant="caption" color={colors.danger} style={styles.gapLg}>
              {describeError(update.error)}
            </AppText>
          ) : null}

          <View style={styles.info}>
            <InfoCallout text="История изменений сохраняется в системе" />
          </View>

          <View style={styles.actions}>
            <SubmitButton
              label="Сохранить изменения"
              onPress={handleSubmit}
              loading={update.isPending}
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
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
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
