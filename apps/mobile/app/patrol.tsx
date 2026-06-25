import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { describeError } from '@/api/error-messages';
import type { Patrol, RoutePoint } from '@/api/types';
import { getDeviceId } from '@/device/device-id';
import { getCurrentCoords } from '@/device/location';
import { patrolStatusLabel, patrolStatusTone } from '@/features/patrol/patrol-status';
import { createLocalEvent } from '@/features/patrol/offline/local-events';
import { requestSync } from '@/features/patrol/offline/sync-manager';
import { useLocalPatrolEvents } from '@/features/patrol/offline/use-local-events';
import { useActivePatrol, usePatrolRoute, useStartPatrol } from '@/features/patrol/queries';
import { nfcReader } from '@/nfc';
import { colors, spacing } from '@/theme';
import { AppText, Badge, Button, Card, Header, ProgressBar, Screen, TextField } from '@/ui';

export default function PatrolScreen(): React.ReactElement {
  const router = useRouter();
  const route = usePatrolRoute();
  const active = useActivePatrol();

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

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Header title="Обход" onBack={() => router.back()} />
          {active.data ? (
            <ActivePatrolView patrol={active.data} points={route.data} />
          ) : (
            <StartPatrolView />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function StartPatrolView(): React.ReactElement {
  const { mutate, isPending, isError, error } = useStartPatrol();

  return (
    <Card>
      <AppText variant="label">Обход не начат</AppText>
      <AppText variant="caption" muted style={styles.gapSm}>
        Начните обход, чтобы отмечать контрольные точки.
      </AppText>
      {isError ? (
        <AppText variant="caption" color={colors.danger} style={styles.gapSm}>
          {describeError(error)}
        </AppText>
      ) : null}
      <View style={styles.gapLg}>
        <Button label="Начать обход" onPress={() => mutate()} loading={isPending} />
      </View>
    </Card>
  );
}

function ActivePatrolView({
  patrol,
  points,
}: {
  patrol: Patrol;
  points: RoutePoint[];
}): React.ReactElement {
  const localEvents = useLocalPatrolEvents(patrol.id);

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
        {pendingCount > 0 ? (
          <AppText variant="caption" color={colors.warning} style={styles.gapSm}>
            Ожидают синхронизации: {pendingCount}
          </AppText>
        ) : null}
      </Card>

      <ScanAction patrol={patrol} points={points} scannedIds={scannedIds} />

      <View>
        <AppText variant="label" style={styles.gapLg}>
          Точки маршрута
        </AppText>
        {sortedPoints.map((point) => {
          const scanned = scannedIds.has(point.id);
          const isCurrent = !scanned && point.id === currentPoint?.id;
          return (
            <Card key={point.id} style={styles.pointCard}>
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
          );
        })}
      </View>
    </View>
  );
}

function ScanAction({
  patrol,
  points,
  scannedIds,
}: {
  patrol: Patrol;
  points: RoutePoint[];
  scannedIds: Set<string>;
}): React.ReactElement {
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [manualUid, setManualUid] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    const willComplete =
      !scannedIds.has(point.id) && scannedIds.size + 1 >= patrol.totalPoints;
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

    setManualUid('');
    requestSync();

    if (willComplete) {
      Alert.alert('Готово', 'Обход завершён.');
    }
  }

  async function handleScanNfc(): Promise<void> {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const uid = await nfcReader.readUid();
      await recordUid(uid);
    } catch {
      setError('Не удалось считать NFC-метку.');
    } finally {
      setBusy(false);
    }
  }

  async function handleManualSubmit(): Promise<void> {
    if (busy) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await recordUid(manualUid);
    } finally {
      setBusy(false);
    }
  }

  const manualValid = manualUid.trim().length >= 4 && manualUid.trim().length <= 32;

  return (
    <Card style={styles.gapLg}>
      {nfcAvailable ? (
        <Button label="Сканировать NFC" onPress={() => void handleScanNfc()} loading={busy} />
      ) : (
        <View>
          <TextField
            label="UID метки"
            value={manualUid}
            onChangeText={setManualUid}
            placeholder="04a1b2c3d4e5f6"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.gapLg}>
            <Button
              label="Отметить"
              onPress={() => void handleManualSubmit()}
              loading={busy}
              disabled={!manualValid}
            />
          </View>
        </View>
      )}
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
  gapLg: {
    marginTop: spacing.lg,
  },
  pointCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
  },
  pointName: {
    flex: 1,
    marginRight: spacing.md,
  },
});
