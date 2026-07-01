import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { reportMissedPointAttempt } from '@/api/patrols.api';
import type { Patrol, RoutePoint } from '@/api/types';
import { getDeviceId } from '@/device/device-id';
import { getCurrentCoords } from '@/device/location';
import { patrolStatusLabel, patrolStatusTone } from '@/features/patrol/patrol-status';
import { createLocalEvent } from '@/features/patrol/offline/local-events';
import { requestSync } from '@/features/patrol/offline/sync-manager';
import { useLocalPatrolEvents } from '@/features/patrol/offline/use-local-events';
import { PlannedScheduleList } from '@/features/patrol/PlannedScheduleList';
import {
  useActivePatrol,
  useAvailableSchedules,
  useCancelPatrol,
  useCompletePatrol,
  usePatrolRoute,
  useStartPatrol,
} from '@/features/patrol/queries';
import { formatScheduleTime } from '@/features/schedules/format';
import { nfcReader } from '@/nfc';
import { colors, radius, spacing } from '@/theme';
import {
  AppText,
  AppDialog,
  AppToast,
  Badge,
  Button,
  Card,
  Header,
  NfcScanOverlay,
  ProgressBar,
  Screen,
  TextField,
} from '@/ui';

export default function PatrolScreen(): React.ReactElement {
  const router = useRouter();
  const route = usePatrolRoute();
  const active = useActivePatrol();
  const cancel = useCancelPatrol();
  const [finishing, setFinishing] = useState<Patrol | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (route.isPending || active.isPending) {
    return (
      <Screen centered>
        <ActivityIndicator size="large" color={colors.primary} />
      </Screen>
    );
  }

  if (route.isError || !route.data) {
    return (
      <Screen centered>
        <AppText muted style={styles.centerText}>
          {describeError(route.error ?? active.error)}
        </AppText>
        <Button
          label="Повторить"
          variant="secondary"
          onPress={() => {
            void route.refetch();
            void active.refetch();
          }}
        />
      </Screen>
    );
  }

  const activePatrol = active.data;
  const isScanning = Boolean(activePatrol) && finishing === null;

  function handleCancel(reason?: string): void {
    if (!activePatrol) {
      return;
    }
    cancel.mutate(
      { patrolId: activePatrol.id, reason },
      {
        onSuccess: () => {
          setCancelOpen(false);
          router.replace('/');
        },
      },
    );
  }

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {finishing ? null : <Header />}
          <View style={styles.titleRow}>
            <AppText variant="heading">Обход</AppText>
            {isScanning ? (
              <TouchableOpacity
                style={styles.cancelAction}
                onPress={() => setCancelOpen(true)}
                hitSlop={12}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                <AppText variant="body" color={colors.danger} style={styles.cancelActionText}>
                  Отменить
                </AppText>
              </TouchableOpacity>
            ) : null}
          </View>
          {finishing ? (
            <CompletionView patrol={finishing} onDone={() => router.replace('/')} />
          ) : activePatrol ? (
            <ActivePatrolView
              patrol={activePatrol}
              points={route.data}
              onAllScanned={setFinishing}
            />
          ) : (
            <StartPatrolView />
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

function StartPatrolView(): React.ReactElement {
  const schedules = useAvailableSchedules();
  const { mutate, isPending, isError, error } = useStartPatrol();
  const toastError = schedules.isError
    ? describeError(schedules.error)
    : isError
      ? describeError(error)
      : null;

  if (schedules.isPending) {
    return (
      <Card>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </Card>
    );
  }

  const scheduleItems = schedules.data ?? [];
  const current = scheduleItems.find((schedule) => schedule.isAvailable);
  const planned = scheduleItems.filter((schedule) => !schedule.isAvailable);

  if (!current) {
    return (
      <Card>
        <AppToast message={toastError} />
        <AppText variant="label">Обход пока недоступен</AppText>
        <AppText variant="caption" muted style={styles.gapSm}>
          Ближайшие плановые обходы:
        </AppText>
        <PlannedScheduleList schedules={planned.length > 0 ? planned : scheduleItems} />
        {scheduleItems.length === 0 ? (
          <AppText variant="caption" muted style={styles.gapSm}>
            Плановых обходов пока нет.
          </AppText>
        ) : null}
        {schedules.isError ? (
          <AppText variant="caption" color={colors.danger} style={styles.gapSm}>
            {describeError(schedules.error)}
          </AppText>
        ) : null}
        <View style={styles.gapLg}>
          <Button label="Начать обход" disabled onPress={() => undefined} />
        </View>
        <View style={styles.gapSm}>
          <Button
            label="Обновить"
            icon="refresh-outline"
            variant="secondary"
            onPress={() => void schedules.refetch()}
            loading={schedules.isFetching}
          />
        </View>
      </Card>
    );
  }

  return (
    <Card>
      <AppToast message={toastError} />
      <AppText variant="label">{current.name}</AppText>
      <View style={styles.windowRow}>
        <Ionicons name="time-outline" size={15} color={colors.textMuted} />
        <AppText variant="caption" muted style={styles.windowText}>
          Доступно с {formatScheduleTime(current.startTime)} до {formatScheduleTime(current.endTime)}
        </AppText>
      </View>
      {isError ? (
        <AppText variant="caption" color={colors.danger} style={styles.gapSm}>
          {describeError(error)}
        </AppText>
      ) : null}
      <View style={styles.gapLg}>
        <Button label="Начать обход" onPress={() => mutate(current.id)} loading={isPending} />
      </View>
      <View style={styles.gapSm}>
        <Button
          label="Обновить"
          icon="refresh-outline"
          variant="secondary"
          onPress={() => void schedules.refetch()}
          loading={schedules.isFetching}
        />
      </View>
    </Card>
  );
}

function ActivePatrolView({
  patrol,
  points,
  onAllScanned,
}: {
  patrol: Patrol;
  points: RoutePoint[];
  onAllScanned: (patrol: Patrol) => void;
}): React.ReactElement {
  const localEvents = useLocalPatrolEvents(patrol.id);
  const pointsScrollRef = useRef<ScrollView>(null);
  const pointOffsetsRef = useRef(new Map<string, number>());
  const [pointLayoutVersion, setPointLayoutVersion] = useState(0);

  const scannedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const event of patrol.events ?? []) {
      ids.add(event.patrolPointId);
    }
    for (const event of localEvents) {
      ids.add(event.patrolPointId);
    }
    return ids;
  }, [patrol.events, localEvents]);

  const pendingCount = useMemo(
    () => localEvents.filter((event) => event.syncStatus === 'pending').length,
    [localEvents],
  );

  const sortedPoints = useMemo(
    () => [...points].sort((a, b) => a.sortOrder - b.sortOrder),
    [points],
  );

  const scannedCount = Math.min(scannedIds.size, patrol.totalPoints);
  const currentPoint = sortedPoints.find((point) => !scannedIds.has(point.id));
  const allScanned = scannedCount >= patrol.totalPoints;

  useEffect(() => {
    if (!currentPoint) {
      return undefined;
    }

    const currentOffset = pointOffsetsRef.current.get(currentPoint.id);
    if (currentOffset === undefined) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      pointsScrollRef.current?.scrollTo({
        animated: true,
        y: Math.max(0, currentOffset - 88),
      });
    }, 80);

    return () => clearTimeout(timeout);
  }, [currentPoint, pointLayoutVersion]);

  useEffect(() => {
    if (allScanned) {
      onAllScanned(patrol);
    }
  }, [allScanned, onAllScanned, patrol]);

  return (
    <View>
      <Card style={styles.gapLg}>
        <View style={styles.row}>
          <AppText variant="label">
            {scannedCount} / {patrol.totalPoints} точек
          </AppText>
          <Badge label={patrolStatusLabel(patrol.status)} tone={patrolStatusTone(patrol.status)} />
        </View>
        <View style={styles.gapSm}>
          <ProgressBar value={scannedCount} max={patrol.totalPoints} />
        </View>
        {patrol.schedule ? (
          <View style={styles.dueRow}>
            <Ionicons name="time-outline" size={15} color={colors.textMuted} />
            <AppText variant="caption" muted style={styles.dueText}>
              Завершить до {formatScheduleTime(patrol.schedule.endTime)}
            </AppText>
          </View>
        ) : null}
        {pendingCount > 0 ? (
          <AppText variant="caption" color={colors.warning} style={styles.gapSm}>
            Ожидают синхронизации: {pendingCount}
          </AppText>
        ) : null}
      </Card>

      {allScanned ? null : (
        <ScanAction
          patrol={patrol}
          points={points}
          scannedIds={scannedIds}
          currentPoint={currentPoint}
        />
      )}

      <View>
        <AppText variant="label" style={styles.gapLg}>
          Точки маршрута
        </AppText>
        <ScrollView
          ref={pointsScrollRef}
          style={styles.pointsScroll}
          contentContainerStyle={styles.pointsScrollContent}
          nestedScrollEnabled
          showsVerticalScrollIndicator={sortedPoints.length > 4}
        >
          {sortedPoints.map((point) => {
            const scanned = scannedIds.has(point.id);
            const isCurrent = !scanned && point.id === currentPoint?.id;
            return (
              <View
                key={point.id}
                onLayout={(event) => {
                  const nextOffset = event.nativeEvent.layout.y;
                  const previousOffset = pointOffsetsRef.current.get(point.id);
                  if (previousOffset !== nextOffset) {
                    pointOffsetsRef.current.set(point.id, nextOffset);
                    setPointLayoutVersion((version) => version + 1);
                  }
                }}
              >
                <Card style={styles.pointCard}>
                  <View style={styles.row}>
                    <AppText variant="body" style={styles.pointName}>
                      {point.sortOrder}. {point.name}
                    </AppText>
                    <Badge
                      label={scanned ? 'Отмечена' : isCurrent ? 'Текущая' : 'Ожидает'}
                      tone={scanned ? 'success' : isCurrent ? 'warning' : 'neutral'}
                    />
                  </View>
                </Card>
              </View>
            );
          })}
        </ScrollView>
      </View>

    </View>
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
  const localEvents = useLocalPatrolEvents(patrol.id);
  const complete = useCompletePatrol();
  const [report, setReport] = useState('');
  const [doneDialogVisible, setDoneDialogVisible] = useState(false);

  const pendingCount = useMemo(
    () => localEvents.filter((event) => event.syncStatus === 'pending').length,
    [localEvents],
  );

  function finish(): void {
    complete.mutate(
      { patrolId: patrol.id, report: report.trim() || undefined },
      {
        onSuccess: () => {
          setDoneDialogVisible(true);
        },
      },
    );
  }

  return (
    <Card>
      <AppDialog
        visible={doneDialogVisible}
        tone="success"
        title="Обход завершён"
        message="Отчёт сохранён. Проверяющий увидит результат в истории обходов."
        actions={[{ label: 'На главную', onPress: onDone }]}
        onClose={onDone}
      />
      <View style={styles.completeHeader}>
        <Ionicons name="checkmark-circle" size={28} color={colors.success} />
        <AppText variant="label" style={styles.completeTitle}>
          Все точки пройдены
        </AppText>
      </View>
      <AppText variant="caption" muted style={styles.gapSm}>
        Опишите задержки или замечания (необязательно). Это увидит проверяющий.
      </AppText>
      <View style={styles.gapLg}>
        <TextField
          value={report}
          onChangeText={setReport}
          placeholder="Например: задержка на точке 3 — помогал покупателю"
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
          label="Завершить обход"
          icon="checkmark-done-outline"
          onPress={finish}
          loading={complete.isPending}
          disabled={pendingCount > 0}
        />
        {pendingCount > 0 ? (
          <AppText variant="caption" muted style={styles.gapSm}>
            Синхронизируем отмеченные точки…
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}

function ScanAction({
  patrol,
  points,
  scannedIds,
  currentPoint,
}: {
  patrol: Patrol;
  points: RoutePoint[];
  scannedIds: Set<string>;
  currentPoint?: RoutePoint;
}): React.ReactElement {
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    actions: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }[];
    message: string;
    title: string;
    tone: 'danger' | 'info' | 'success' | 'warning';
  } | null>(null);

  useEffect(() => {
    void nfcReader.isAvailable().then(setNfcAvailable);
  }, []);

  async function recordUid(rawUid: string): Promise<void> {
    const normalizedUid = rawUid.trim().toLowerCase();
    const point = points.find((candidate) => candidate.nfcTag?.uid === normalizedUid);
    if (!point) {
      setError('Метка не принадлежит этому маршруту.');
      return;
    }
    if (scannedIds.has(point.id)) {
      setError('Эта точка уже отмечена.');
      return;
    }
    if (currentPoint && point.id !== currentPoint.id) {
      setDialog({
        actions: [{ label: 'Понятно', onPress: () => setDialog(null) }],
        message: `Сейчас нужно отсканировать точку ${currentPoint.sortOrder}. ${currentPoint.name}. Точка ${point.sortOrder}. ${point.name} не отмечена.`,
        title: 'Вернитесь к маршруту',
        tone: 'warning',
      });
      void reportMissedPointAttempt(patrol.id, {
        attemptedPatrolPointId: point.id,
        deviceId: await getDeviceId(),
        expectedPatrolPointId: currentPoint.id,
        nfcUid: normalizedUid,
        scannedAt: new Date().toISOString(),
      }).catch(() => undefined);
      return;
    }

    const deviceId = await getDeviceId();
    const coords = await getCurrentCoords();

    await createLocalEvent({
      patrolId: patrol.id,
      patrolPointId: point.id,
      nfcUid: normalizedUid,
      deviceId,
      scannedAt: new Date().toISOString(),
      lat: coords?.lat,
      lng: coords?.lng,
      gpsAccuracy: coords?.gpsAccuracy,
    });

    requestSync();
  }

  async function handleScanNfc(): Promise<void> {
    if (busy) {
      return;
    }
    setError(null);
    const supported = await nfcReader.isAvailable();
    setNfcAvailable(supported);
    if (!supported) {
      setError('NFC недоступен на этом устройстве.');
      return;
    }

    const enabled = await nfcReader.isEnabled();
    if (!enabled) {
      setDialog({
        actions: [
          {
            label: 'Открыть настройки',
            onPress: () => {
              setDialog(null);
              void nfcReader.openSettings();
            },
          },
          { label: 'Позже', onPress: () => setDialog(null), variant: 'ghost' },
        ],
        message: 'Включите NFC в настройках телефона и повторите сканирование.',
        title: 'NFC выключен',
        tone: 'warning',
      });
      return;
    }

    setBusy(true);
    setScanning(true);
    try {
      const uid = await nfcReader.readUid();
      await recordUid(uid);
    } catch {
      setError('Не удалось считать NFC-метку.');
    } finally {
      setScanning(false);
      setBusy(false);
    }
  }

  return (
    <Card style={styles.gapLg}>
      <AppToast message={error} />
      <NfcScanOverlay
        visible={scanning}
        title="Сканируем метку"
        subtitle="Поднесите телефон к NFC-метке контрольной точки."
        onCancel={() => void nfcReader.cancel()}
      />
      {dialog ? (
        <AppDialog
          visible
          title={dialog.title}
          message={dialog.message}
          tone={dialog.tone}
          actions={dialog.actions}
          onClose={() => setDialog(null)}
        />
      ) : null}
      <Button
        label="Сканировать NFC"
        icon="scan-outline"
        onPress={() => void handleScanNfc()}
        disabled={busy}
      />
      {!nfcAvailable ? (
        <AppText variant="caption" muted style={styles.gapSm}>
          При нажатии проверим NFC и подскажем, если его нужно включить.
        </AppText>
      ) : null}

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.gapSm}>
          {error}
        </AppText>
      ) : null}
    </Card>
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
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gapSm: {
    marginTop: spacing.sm,
  },
  gapMd: {
    marginTop: spacing.md,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
  center: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  windowRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  windowText: {
    marginLeft: spacing.xs,
  },
  dueRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginTop: spacing.sm,
  },
  dueText: {
    marginLeft: spacing.xs,
  },
  pointsScroll: {
    maxHeight: 360,
  },
  pointsScrollContent: {
    paddingBottom: spacing.md,
  },
  pointCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  pointName: {
    flex: 1,
    marginRight: spacing.md,
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
  completeTitle: {
    marginLeft: spacing.sm,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  cancelAction: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  cancelActionText: {
    marginLeft: spacing.xs,
  },
});
