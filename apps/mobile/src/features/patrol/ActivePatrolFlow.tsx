import { Ionicons } from '@expo/vector-icons';
import type { NfcWaitStateDto, PatrolScanAction } from '@patrol/shared';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, ScrollView, StyleSheet, Vibration, View } from 'react-native';

import { describeError } from '@/api/error-messages';
import type { MobileRoutePoint } from '@/api/patrols.api';
import type { Patrol } from '@/api/types';
import { getDeviceId } from '@/device/device-id';
import { getCurrentCoords } from '@/device/location';
import { createLocalEvent } from '@/features/patrol/offline/local-events';
import { createLocalMissedPointAttempt } from '@/features/patrol/offline/local-missed-point-attempts';
import { projectLocalNfcEvents } from '@/features/patrol/offline/project-wait-state';
import { syncPendingEvents } from '@/features/patrol/offline/sync';
import { useLocalPatrolEvents } from '@/features/patrol/offline/use-local-events';
import { usePendingEventCount } from '@/features/patrol/offline/use-pending-events';
import { patrolStatusLabel, patrolStatusTone } from '@/features/patrol/patrol-status';
import { usePatrolNfcWaitState } from '@/features/patrol/queries';
import { formatScheduleTime } from '@/features/schedules/format';
import { nfcReader } from '@/nfc';
import { useAuthStore } from '@/store/auth-store';
import { appIcons, colors, radius, spacing } from '@/theme';
import {
  AppDialog,
  AppText,
  AppToast,
  Button,
  Card,
  EntityIcon,
  ProgressBar,
  ProtectedImage,
  SectionHeading,
  StatusLabel,
} from '@/ui';

type DialogState = {
  title: string;
  message: string;
  tone: 'danger' | 'info' | 'success' | 'warning';
  actions: Array<{
    label: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  }>;
};

export function ActivePatrolFlow({
  patrol,
  points,
  onAllScanned,
}: {
  patrol: Patrol;
  points: MobileRoutePoint[];
  onAllScanned: (patrol: Patrol) => void;
}): React.ReactElement {
  const waitState = usePatrolNfcWaitState(patrol.id);
  const localEvents = useLocalPatrolEvents(patrol.id);
  const pendingCount = usePendingEventCount(patrol.id);
  const pointsScrollRef = useRef<ScrollView>(null);
  const pointOffsetsRef = useRef(new Map<string, number>());
  const [pointLayoutVersion, setPointLayoutVersion] = useState(0);

  const sortedPoints = useMemo(
    () => [...points].sort((left, right) => left.sortOrder - right.sortOrder),
    [points],
  );
  const state = useMemo(
    () =>
      waitState.data
        ? projectLocalNfcEvents(waitState.data, sortedPoints, localEvents)
        : undefined,
    [localEvents, sortedPoints, waitState.data],
  );
  const expectedPoint = state?.expectedPoint;
  const completed = state?.mode === 'completed';

  useEffect(() => {
    if (completed) {
      onAllScanned(patrol);
    }
  }, [completed, onAllScanned, patrol]);

  useEffect(() => {
    if (!expectedPoint) {
      return undefined;
    }
    const offset = pointOffsetsRef.current.get(expectedPoint.id);
    if (offset === undefined) {
      return undefined;
    }
    const timeout = setTimeout(() => {
      pointsScrollRef.current?.scrollTo({ animated: true, y: Math.max(0, offset - 88) });
    }, 80);
    return () => clearTimeout(timeout);
  }, [expectedPoint, pointLayoutVersion]);

  if (waitState.isPending) {
    return (
      <Card style={styles.sectionGap}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="caption" muted style={styles.smallGap}>
            Загружаем состояние обхода...
          </AppText>
        </View>
      </Card>
    );
  }

  if (!state) {
    return (
      <Card style={styles.sectionGap}>
        <AppText variant="label">Не удалось загрузить текущую точку</AppText>
        <AppText variant="caption" color={colors.danger} style={styles.smallGap}>
          {describeError(waitState.error)}
        </AppText>
        <View style={styles.mediumGap}>
          <Button label="Повторить" icon="refresh-outline" onPress={() => void waitState.refetch()} />
        </View>
      </Card>
    );
  }

  return (
    <View>
      <Card style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <EntityIcon icon={appIcons.patrol} />
          <View style={styles.summaryCopy}>
            <AppText variant="label">Обход выполняется</AppText>
            <AppText variant="caption" muted style={styles.smallGap}>
              {patrol.shop?.name ?? patrol.schedule?.name ?? 'Маршрут магазина'}
            </AppText>
          </View>
          <StatusLabel
            label={patrolStatusLabel(patrol.status)}
            tone={patrolStatusTone(patrol.status)}
          />
        </View>
        <View style={styles.progressHeader}>
          <AppText variant="caption" muted>
            Прогресс маршрута
          </AppText>
          <AppText variant="caption">
            {state.scannedPoints} из {state.totalPoints}
          </AppText>
        </View>
        <ProgressBar value={state.scannedPoints} max={state.totalPoints} />
        {patrol.schedule ? (
          <View style={styles.dueRow}>
            <Ionicons name="time-outline" size={15} color={colors.textMuted} />
            <AppText variant="caption" muted style={styles.dueText}>
              Завершить до {formatScheduleTime(patrol.schedule.endTime)}
            </AppText>
          </View>
        ) : null}
        {pendingCount > 0 ? (
          <View style={styles.syncNotice}>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.warning} />
            <AppText variant="caption" color={colors.warning} style={styles.syncText}>
              Сохранено на телефоне, ожидает отправки: {pendingCount}
            </AppText>
          </View>
        ) : null}
      </Card>

      {completed || !expectedPoint ? null : (
        <NfcPointScanner
          patrol={patrol}
          points={points}
          waitState={state}
          onRefresh={waitState.refetch}
        />
      )}

      <View style={styles.routeSection}>
        <SectionHeading
          title="Маршрут"
          subtitle={`${state.scannedPoints} из ${state.totalPoints} точек пройдено`}
        />
        <Card style={styles.routeCard}>
          <ScrollView
            ref={pointsScrollRef}
            style={styles.pointsScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={sortedPoints.length > 4}
          >
            {sortedPoints.map((point, index) => {
              const isCurrent = point.id === expectedPoint?.id && !completed;
              const isDone =
                completed ||
                (expectedPoint !== undefined && point.sortOrder < expectedPoint.sortOrder);
              const isAtPoint = isCurrent && state.expectedScanAction === 'depart';
              const statusLabel = isDone
                ? 'Пройдена'
                : isAtPoint
                  ? 'На точке'
                  : isCurrent
                    ? 'Следующая'
                    : 'Ожидает';
              return (
                <View
                  key={point.id}
                  onLayout={(event) => {
                    const nextOffset = event.nativeEvent.layout.y;
                    if (pointOffsetsRef.current.get(point.id) !== nextOffset) {
                      pointOffsetsRef.current.set(point.id, nextOffset);
                      setPointLayoutVersion((version) => version + 1);
                    }
                  }}
                  style={[
                    styles.pointRow,
                    index > 0 ? styles.pointBorder : undefined,
                    isCurrent ? styles.currentPointRow : undefined,
                  ]}
                >
                  <View
                    style={[
                      styles.pointOrder,
                      isDone ? styles.donePointOrder : undefined,
                      isCurrent ? styles.currentPointOrder : undefined,
                    ]}
                  >
                    {isDone ? (
                      <Ionicons name="checkmark" size={17} color={colors.success} />
                    ) : (
                      <AppText
                        variant="caption"
                        color={isCurrent ? colors.primary : colors.textMuted}
                        style={styles.pointOrderText}
                      >
                        {point.sortOrder}
                      </AppText>
                    )}
                  </View>
                  <AppText variant="body" style={styles.pointName} numberOfLines={2}>
                    {point.name}
                  </AppText>
                  <StatusLabel
                    label={statusLabel}
                    tone={isDone ? 'success' : isCurrent ? 'warning' : 'neutral'}
                  />
                </View>
              );
            })}
          </ScrollView>
        </Card>
      </View>
    </View>
  );
}

function NfcPointScanner({
  patrol,
  points,
  waitState,
  onRefresh,
}: {
  patrol: Patrol;
  points: MobileRoutePoint[];
  waitState: NfcWaitStateDto;
  onRefresh: () => ReturnType<ReturnType<typeof usePatrolNfcWaitState>['refetch']>;
}): React.ReactElement {
  const userId = useAuthStore((authState) => authState.user?.id);
  const [now, setNow] = useState(Date.now());
  const [paused, setPaused] = useState(false);
  const [waitingForSync, setWaitingForSync] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [queuedScan, setQueuedScan] = useState<{
    action: PatrolScanAction;
    pointId: string;
  } | null>(null);
  const [listenCycle, setListenCycle] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const expectedPoint = waitState.expectedPoint;
  const expectedPointId = expectedPoint?.id;
  const scanAction = waitState.expectedScanAction;
  const lockedUntilMs = waitState.lockedUntil
    ? new Date(String(waitState.lockedUntil)).getTime()
    : null;
  const remainingSeconds = lockedUntilMs
    ? Math.max(0, Math.ceil((lockedUntilMs - now) / 1000))
    : (waitState.remainingLockSeconds ?? 0);
  const waitingAtPoint = scanAction === 'depart' && remainingSeconds > 0;
  const readyToListen =
    expectedPointId !== undefined &&
    scanAction !== undefined &&
    waitState.canAcceptNfc &&
    !waitingAtPoint &&
    queuedScan === null &&
    !paused &&
    !waitingForSync &&
    !processing;

  useEffect(() => {
    if (!waitingAtPoint) {
      return undefined;
    }
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [waitingAtPoint]);

  useEffect(() => {
    if (
      queuedScan !== null &&
      (queuedScan.pointId !== expectedPointId || queuedScan.action !== scanAction)
    ) {
      setQueuedScan(null);
    }
  }, [expectedPointId, queuedScan, scanAction]);

  useEffect(() => {
    if (!readyToListen || !expectedPointId || !scanAction) {
      return undefined;
    }

    const currentExpectedPointId = expectedPointId;
    const currentScanAction = scanAction;
    let cancelled = false;

    async function listen(): Promise<void> {
      const supported = await nfcReader.isAvailable();
      if (cancelled) {
        return;
      }
      if (!supported) {
        setPaused(true);
        setError('NFC недоступен на этом устройстве.');
        return;
      }

      const enabled = await nfcReader.isEnabled();
      if (cancelled) {
        return;
      }
      if (!enabled) {
        setPaused(true);
        setDialog({
          title: 'NFC выключен',
          message: 'Включите NFC в настройках телефона, затем продолжите сканирование.',
          tone: 'warning',
          actions: [
            {
              label: 'Открыть настройки',
              onPress: () => {
                setDialog(null);
                void nfcReader.openSettings();
              },
            },
            { label: 'Закрыть', onPress: () => setDialog(null), variant: 'ghost' },
          ],
        });
        return;
      }

      setScanning(true);
      try {
        const uid = await nfcReader.readUid();
        if (!cancelled) {
          await handleUid(uid, currentExpectedPointId, currentScanAction);
        }
      } catch {
        if (!cancelled) {
          setError('Не удалось считать NFC-метку. Запустите ожидание ещё раз.');
          setPaused(true);
        }
      } finally {
        if (!cancelled) {
          setScanning(false);
          setListenCycle((cycle) => cycle + 1);
        }
      }
    }

    async function handleUid(
      rawUid: string,
      expectedPointId: string,
      action: PatrolScanAction,
    ): Promise<void> {
      if (!userId) {
        setPaused(true);
        setError('Сессия пользователя недоступна. Войдите в приложение повторно.');
        return;
      }
      const normalizedUid = rawUid.trim().toLowerCase();
      const scannedPoint = points.find((point) => point.nfcTag?.uid === normalizedUid);
      const currentPoint = points.find((point) => point.id === expectedPointId);

      if (!scannedPoint) {
        setPaused(true);
        setDialog({
          title: 'Неизвестная метка',
          message: 'Эта NFC-метка не относится к текущему маршруту.',
          tone: 'warning',
          actions: [{ label: 'Продолжить', onPress: resumeScanning }],
        });
        return;
      }

      if (scannedPoint.id !== expectedPointId) {
        setPaused(true);
        setDialog({
          title: 'Вернитесь к маршруту',
          message: `Сейчас нужна точка ${currentPoint?.sortOrder ?? ''}. ${currentPoint?.name ?? ''}. Точка ${scannedPoint.sortOrder}. ${scannedPoint.name} не засчитана.`,
          tone: 'warning',
          actions: [{ label: 'Продолжить', onPress: resumeScanning }],
        });
        try {
          await createLocalMissedPointAttempt({
            userId,
            attemptedPatrolPointId: scannedPoint.id,
            deviceId: await getDeviceId(),
            expectedPatrolPointId: expectedPointId,
            nfcUid: normalizedUid,
            patrolId: patrol.id,
            scannedAt: new Date().toISOString(),
          });
          void syncPendingEvents(userId);
        } catch {
          setError('Не удалось сохранить попытку пропуска на телефоне. Освободите место и повторите сканирование.');
        }
        return;
      }

      setProcessing(true);
      setWaitingForSync(true);
      setQueuedScan({ action, pointId: expectedPointId });
      setError(null);
      try {
        const deviceId = await getDeviceId();
        const coords = await getCurrentCoords();
        await createLocalEvent({
          userId,
          patrolId: patrol.id,
          patrolPointId: expectedPointId,
          nfcUid: normalizedUid,
          deviceId,
          scannedAt: new Date().toISOString(),
          lat: coords?.lat,
          lng: coords?.lng,
          gpsAccuracy: coords?.gpsAccuracy,
          scanAction: action,
        });
        Vibration.vibrate(80);
        const synced = await syncPendingEvents(userId);
        if (synced) {
          const result = await onRefresh();
          if (result.isError) {
            setQueuedScan(null);
            setPaused(true);
            setError(
              'Скан отправлен, но состояние обхода не загрузилось. Продолжите после восстановления связи.',
            );
          } else {
            setPaused(false);
          }
        } else {
          setError('Нет связи с сервером. Скан сохранён на телефоне, можно продолжать обход офлайн.');
        }
      } catch {
        setQueuedScan(null);
        setPaused(true);
        setError(
          'Не удалось сохранить NFC-скан на телефоне. Освободите место и повторите сканирование.',
        );
      } finally {
        setWaitingForSync(false);
        setProcessing(false);
      }
    }

    function resumeScanning(): void {
      setDialog(null);
      setError(null);
      setPaused(false);
      setListenCycle((cycle) => cycle + 1);
    }

    void listen();
    return () => {
      cancelled = true;
      void nfcReader.cancel();
    };
  }, [expectedPointId, listenCycle, onRefresh, patrol.id, points, readyToListen, scanAction, userId]);

  function resume(): void {
    setDialog(null);
    setError(null);
    setPaused(false);
    setListenCycle((cycle) => cycle + 1);
  }

  return (
    <Card style={styles.sectionGap}>
      <AppToast message={error} />
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

      <View style={styles.scannerHeader}>
        <EntityIcon icon="scan-outline" />
        <View style={styles.scannerCopy}>
          <AppText variant="caption" muted>
            Текущая точка
          </AppText>
          <AppText variant="label" style={styles.smallGap}>
            {expectedPoint?.sortOrder}. {expectedPoint?.name}
          </AppText>
        </View>
        <StatusLabel
          label={
            scanAction === 'depart'
              ? waitingAtPoint
                ? 'На точке'
                : 'Уход'
              : 'Прибытие'
          }
          tone={scanAction === 'depart' ? 'warning' : 'neutral'}
        />
      </View>
      {expectedPoint?.description ? (
        <AppText variant="caption" muted style={styles.description}>
          {expectedPoint.description}
        </AppText>
      ) : null}

      {expectedPoint?.photoFileId ? (
        <ProtectedImage
          fileId={expectedPoint.photoFileId}
          style={styles.pointPhoto}
          resizeMode="cover"
          accessibilityLabel={`Фото точки ${expectedPoint?.name ?? ''}`}
        />
      ) : null}

      {waitingAtPoint ? (
        <View style={styles.timerBlock}>
          <Ionicons name="timer-outline" size={24} color={colors.primary} />
          <View style={styles.timerText}>
            <AppText variant="label">Осмотрите точку</AppText>
            <AppText variant="heading" color={colors.primary} style={styles.smallGap}>
              {formatCountdown(remainingSeconds)}
            </AppText>
            <AppText variant="caption" muted style={styles.smallGap}>
              После таймера повторно отсканируйте эту же метку.
            </AppText>
          </View>
        </View>
      ) : processing || waitingForSync || queuedScan !== null ? (
        <View style={styles.processingRow}>
          <ActivityIndicator color={colors.primary} />
          <AppText variant="caption" muted style={styles.processingText}>
            Сохраняем результат сканирования...
          </AppText>
        </View>
      ) : paused ? (
        <View style={styles.mediumGap}>
          <Button label="Продолжить сканирование" icon="scan-outline" onPress={resume} />
        </View>
      ) : (
        <NfcListeningBar active={scanning} action={scanAction} />
      )}

      {error ? (
        <AppText variant="caption" color={colors.danger} style={styles.smallGap}>
          {error}
        </AppText>
      ) : null}
    </Card>
  );
}

function NfcListeningBar({
  active,
  action,
}: {
  active: boolean;
  action?: PatrolScanAction;
}): React.ReactElement {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return undefined;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { duration: 700, toValue: 1, useNativeDriver: true }),
        Animated.timing(pulse, { duration: 700, toValue: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, pulse]);

  return (
    <View
      accessibilityLabel={
        active
          ? 'Автоматическое NFC-сканирование активно'
          : 'Подготовка автоматического NFC-сканирования'
      }
      accessibilityRole="text"
      style={styles.listeningBar}
    >
      <View style={styles.listeningIndicator}>
        <Animated.View
          style={[
            styles.listeningPulse,
            {
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.08] }),
              transform: [
                { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.7] }) },
              ],
            },
          ]}
        />
        <View style={styles.listeningDot} />
      </View>
      <View style={styles.listeningCopy}>
        <AppText variant="label" color={colors.success}>
          {active ? 'NFC-сканирование активно' : 'Запускаем NFC-сканирование'}
        </AppText>
        <AppText variant="caption" muted style={styles.listeningHint}>
          {action === 'depart'
            ? 'Повторно приложите телефон к метке этой точки'
            : 'Приложите телефон к метке текущей точки'}
        </AppText>
      </View>
      <Ionicons name="scan-outline" size={22} color={colors.success} />
    </View>
  );
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: spacing.lg },
  dueRow: { alignItems: 'center', flexDirection: 'row', marginTop: spacing.sm },
  dueText: { marginLeft: spacing.xs },
  listeningBar: {
    alignItems: 'center',
    backgroundColor: colors.successBackground,
    borderRadius: radius.sm,
    flexDirection: 'row',
    marginTop: spacing.lg,
    padding: spacing.md,
  },
  listeningCopy: { flex: 1, marginHorizontal: spacing.md, minWidth: 0 },
  listeningDot: {
    backgroundColor: colors.success,
    borderRadius: radius.full,
    height: 10,
    width: 10,
  },
  listeningHint: { marginTop: 2 },
  listeningIndicator: {
    alignItems: 'center',
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  listeningPulse: {
    backgroundColor: colors.success,
    borderRadius: radius.full,
    height: 18,
    position: 'absolute',
    width: 18,
  },
  mediumGap: { marginTop: spacing.md },
  summaryCard: { padding: spacing.lg },
  summaryHeader: { alignItems: 'center', flexDirection: 'row' },
  summaryCopy: { flex: 1, marginHorizontal: spacing.md, minWidth: 0 },
  progressHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  syncNotice: {
    alignItems: 'center',
    backgroundColor: colors.iconOrangeBackground,
    borderRadius: radius.sm,
    flexDirection: 'row',
    marginTop: spacing.md,
    padding: spacing.md,
  },
  syncText: { flex: 1, marginLeft: spacing.sm },
  scannerHeader: { alignItems: 'center', flexDirection: 'row' },
  scannerCopy: { flex: 1, marginHorizontal: spacing.md, minWidth: 0 },
  description: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
  },
  routeSection: { marginTop: spacing.xl },
  routeCard: { overflow: 'hidden', padding: 0 },
  pointRow: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pointBorder: { borderTopColor: colors.border, borderTopWidth: 1 },
  currentPointRow: { backgroundColor: colors.controlSurface },
  pointOrder: {
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.full,
    height: 32,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 32,
  },
  donePointOrder: { backgroundColor: colors.successBackground },
  currentPointOrder: { backgroundColor: colors.iconBlueBackground },
  pointOrderText: { fontWeight: '600' },
  pointName: { flex: 1, marginRight: spacing.sm },
  pointPhoto: { borderRadius: 6, height: 190, marginTop: spacing.lg, width: '100%' },
  pointsScroll: { maxHeight: 360 },
  processingRow: { alignItems: 'center', flexDirection: 'row', marginTop: spacing.lg },
  processingText: { marginLeft: spacing.sm },
  sectionGap: { marginTop: spacing.lg },
  smallGap: { marginTop: spacing.sm },
  timerBlock: {
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    flexDirection: 'row',
    marginTop: spacing.lg,
    padding: spacing.lg,
  },
  timerText: { flex: 1, marginLeft: spacing.md },
});
