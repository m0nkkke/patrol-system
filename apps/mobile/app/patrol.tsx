import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import type { KeyboardEvent } from 'react-native';

import { describeError } from '@/api/error-messages';
import { ApiError } from '@/api/errors';
import type { Patrol } from '@/api/types';
import { ActivePatrolFlow } from '@/features/patrol/ActivePatrolFlow';
import { usePendingEventCount } from '@/features/patrol/offline/use-pending-events';
import { PatrolStartPanel } from '@/features/patrol/PatrolStartPanel';
import {
  useActivePatrol,
  useCancelPatrol,
  useCompletePatrol,
  usePatrolRoute,
} from '@/features/patrol/queries';
import { useAuthStore } from '@/store/auth-store';
import { colors, radius, screenInsets, spacing } from '@/theme';
import {
  AppText,
  AppDialog,
  AsyncStateScreen,
  Button,
  Card,
  EntityIcon,
  Header,
  Screen,
  TextField,
} from '@/ui';

export default function PatrolScreen(): React.ReactElement {
  const router = useRouter();
  const selectedShopId = useAuthStore((state) => state.selectedShopId);
  const active = useActivePatrol();
  const route = usePatrolRoute(active.data);
  const cancel = useCancelPatrol();
  const [finishing, setFinishing] = useState<Patrol | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const activePatrol = active.data;

  function handleCancel(reason?: string): void {
    if (!activePatrol) {
      return;
    }
    cancel.mutate(
      { patrolId: activePatrol.id, reason },
      {
        onSuccess: () => {
          setCancelOpen(false);
          router.dismissTo('/');
        },
      },
    );
  }

  if (active.isPending || (active.data && route.isPending)) {
    return <AsyncStateScreen loading onBack={() => router.dismissTo('/')} />;
  }

  if (active.isError || (active.data && (route.isError || !route.data))) {
    const error = active.error ?? route.error;
    const legacyPatrol =
      error instanceof ApiError && error.code === 'PATROL_ROUTE_SNAPSHOT_UNAVAILABLE';

    return (
      <Screen padded={false}>
        <View style={styles.errorScreen}>
          <Header
            compact
            title="Обход недоступен"
            onBack={() => router.dismissTo('/')}
            right={<View />}
          />
          <Card style={styles.errorCard}>
            <View style={styles.errorHeader}>
              <EntityIcon icon="alert-circle-outline" tone="warning" />
              <View style={styles.errorCopy}>
                <AppText variant="label">
                  {legacyPatrol ? 'Нужно начать новый обход' : 'Не удалось загрузить обход'}
                </AppText>
                <AppText variant="caption" muted style={styles.gapSm}>
                  {legacyPatrol
                    ? 'Этот обход создан до обновления маршрутов и не может быть безопасно продолжен. Отмените его, затем начните новый.'
                    : describeError(error)}
                </AppText>
              </View>
            </View>
            <View style={styles.gapLg}>
              <Button
                label="Повторить"
                icon="refresh-outline"
                variant="secondary"
                onPress={() => {
                  void route.refetch();
                  void active.refetch();
                }}
              />
            </View>
            {activePatrol ? (
              <View style={styles.gapSm}>
                <Button
                  label="Отменить этот обход"
                  icon="close-circle-outline"
                  variant="dangerOutline"
                  onPress={() => setCancelOpen(true)}
                />
              </View>
            ) : null}
            <View style={styles.gapSm}>
              <Button label="На главную" variant="ghost" onPress={() => router.dismissTo('/')} />
            </View>
          </Card>
        </View>
        <ReportModal
          visible={cancelOpen}
          title="Отменить обход"
          subtitle="После отмены можно будет начать новый обход с актуальным маршрутом."
          placeholder="Причина отмены (необязательно)"
          confirmLabel="Отменить обход"
          confirmVariant="danger"
          loading={cancel.isPending}
          error={cancel.isError ? describeError(cancel.error) : null}
          onConfirm={handleCancel}
          onClose={() => setCancelOpen(false)}
        />
      </Screen>
    );
  }

  const isScanning = Boolean(activePatrol) && finishing === null;

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {finishing ? null : (
            <Header
              compact
              title={activePatrol ? 'Текущий обход' : 'Обход'}
              subtitle={
                activePatrol
                  ? (activePatrol.schedule?.name ?? activePatrol.shop?.name ?? 'Маршрут магазина')
                  : 'Начните обход в доступное окно расписания'
              }
            />
          )}
          {isScanning ? (
            <View style={styles.cancelRow}>
              <TouchableOpacity
                style={styles.cancelAction}
                onPress={() => setCancelOpen(true)}
                hitSlop={12}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                <AppText variant="body" color={colors.danger} style={styles.cancelActionText}>
                  Отменить обход
                </AppText>
              </TouchableOpacity>
            </View>
          ) : null}
          {finishing ? (
            <CompletionView patrol={finishing} onDone={() => router.dismissTo('/')} />
          ) : activePatrol && route.data ? (
            <ActivePatrolFlow
              patrol={activePatrol}
              points={route.data}
              onAllScanned={setFinishing}
            />
          ) : (
            <PatrolStartPanel
              shopId={selectedShopId}
              onOpenPlan={() => router.push('/schedule-plan')}
              onSelectShop={() => router.push('/select-shop')}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <ReportModal
        visible={cancelOpen}
        title="Отменить обход"
        subtitle="Укажите причину отмены (необязательно)."
        placeholder="Например: срочно вызвали, начну заново позже"
        confirmLabel="Отменить обход"
        confirmVariant="danger"
        loading={cancel.isPending}
        error={cancel.isError ? describeError(cancel.error) : null}
        onConfirm={handleCancel}
        onClose={() => setCancelOpen(false)}
      />
    </Screen>
  );
}

function ReportModal({
  visible,
  title,
  subtitle,
  placeholder,
  confirmLabel,
  confirmVariant = 'primary',
  loading,
  error,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  subtitle: string;
  placeholder: string;
  confirmLabel: string;
  confirmVariant?: 'primary' | 'danger';
  loading: boolean;
  error: string | null;
  onConfirm: (text?: string) => void;
  onClose: () => void;
}): React.ReactElement {
  const [text, setText] = useState('');
  const [keyboardBottom, setKeyboardBottom] = useState(0);

  useEffect(() => {
    if (!visible) {
      setText('');
      setKeyboardBottom(0);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return undefined;
    }

    const showSubscription = Keyboard.addListener('keyboardDidShow', (event: KeyboardEvent) => {
      setKeyboardBottom(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardBottom(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  function handleClose(): void {
    Keyboard.dismiss();
    onClose();
  }

  function handleConfirm(): void {
    Keyboard.dismiss();
    onConfirm(text.trim() || undefined);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={[
          styles.backdrop,
          Platform.OS === 'android' && keyboardBottom > 0
            ? { paddingBottom: keyboardBottom }
            : null,
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <TouchableOpacity style={styles.backdropFill} activeOpacity={1} onPress={handleClose} />
        <ScrollView
          contentContainerStyle={styles.sheetScroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.sheet}>
            <AppText variant="label">{title}</AppText>
            <AppText variant="caption" muted style={styles.gapSm}>
              {subtitle}
            </AppText>
            <View style={styles.gapLg}>
              <TextField
                value={text}
                onChangeText={setText}
                placeholder={placeholder}
                multiline
                style={styles.reportInput}
              />
            </View>
            {error ? (
              <AppText variant="caption" color={colors.danger} style={styles.gapSm}>
                {error}
              </AppText>
            ) : null}
            <View style={styles.gapLg}>
              <Button
                label={confirmLabel}
                variant={confirmVariant}
                loading={loading}
                onPress={handleConfirm}
              />
            </View>
            <View style={styles.gapSm}>
              <Button label="Закрыть" variant="ghost" onPress={handleClose} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CompletionView({
  patrol,
  onDone,
}: {
  patrol: Patrol;
  onDone: () => void;
}): React.ReactElement {
  const pendingCount = usePendingEventCount(patrol.id);
  const complete = useCompletePatrol();
  const [report, setReport] = useState('');
  const [doneDialogVisible, setDoneDialogVisible] = useState(false);

  function finish(): void {
    const completionReport = report.trim();
    complete.mutate(
      { patrolId: patrol.id, report: completionReport || undefined },
      {
        onSuccess: () => {
          if (completionReport) {
            setDoneDialogVisible(true);
          } else {
            onDone();
          }
        },
      },
    );
  }

  return (
    <Card style={styles.completionCard}>
      <AppDialog
        visible={doneDialogVisible}
        tone="success"
        title="Комментарий сохранён"
        message="Проверяющий увидит его в истории завершённого обхода."
        actions={[{ label: 'На главную', onPress: onDone }]}
        onClose={onDone}
      />
      <View style={styles.completeHeader}>
        <EntityIcon icon="checkmark" tone="success" />
        <View style={styles.completeCopy}>
          <AppText variant="label">Обход завершён</AppText>
          <AppText variant="caption" muted style={styles.gapSm}>
            Последняя точка зафиксирована. При желании добавьте комментарий.
          </AppText>
        </View>
      </View>
      <View style={styles.gapLg}>
        <TextField
          label="Комментарий к обходу"
          value={report}
          onChangeText={setReport}
          placeholder="Опишите задержки или замечания"
          multiline
          style={styles.reportInput}
        />
      </View>
      {complete.isError ? (
        <AppText variant="caption" color={colors.danger} style={styles.gapSm}>
          {describeError(complete.error)}
        </AppText>
      ) : null}
      <View style={styles.gapLg}>
        <Button
          label={report.trim() ? 'Сохранить комментарий' : 'Готово'}
          icon={report.trim() ? 'save-outline' : 'checkmark-outline'}
          onPress={finish}
          loading={complete.isPending}
          disabled={pendingCount > 0}
        />
        {pendingCount > 0 ? (
          <AppText variant="caption" muted style={styles.gapSm}>
            Синхронизируем данные обхода…
          </AppText>
        ) : null}
      </View>
    </Card>
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
  errorScreen: {
    flex: 1,
    paddingBottom: screenInsets.bottom,
    paddingHorizontal: screenInsets.horizontal,
    paddingTop: screenInsets.top,
  },
  errorCard: {
    padding: spacing.lg,
  },
  errorHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  errorCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  gapSm: {
    marginTop: spacing.sm,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.35)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropFill: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  sheetScroll: {
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  reportInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  completeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  completionCard: {
    padding: spacing.lg,
  },
  completeCopy: {
    flex: 1,
    marginLeft: spacing.md,
  },
  cancelRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  cancelAction: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  cancelActionText: {
    marginLeft: spacing.xs,
  },
});
