import type { PatrolPointVisitStatus, PatrolStatus } from '@patrol/shared';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import type { ControlPatrolDetail } from '@/api/control-patrols.api';
import { describeError } from '@/api/error-messages';
import { REPORT_STATUS_LABELS, REPORT_TYPE_LABELS } from '@/features/control-reports/format';
import { useControlPatrol } from '@/features/control-patrols/queries';
import {
  controlIncidentDescription,
  incidentSeverityTone,
  incidentTypeLabel,
} from '@/features/incidents/incident-type';
import { patrolStatusLabel, patrolStatusTone } from '@/features/patrol/patrol-status';
import { formatClockSeconds, formatDateTime } from '@/lib/format';
import { useAuthStore } from '@/store/auth-store';
import { appIcons, colors, radius, spacing } from '@/theme';
import {
  AppText,
  AsyncStateScreen,
  Badge,
  Card,
  DetailRow,
  Header,
  ProgressBar,
  Screen,
} from '@/ui';

type MessageTone = 'danger' | 'info' | 'warning';

export function ControlPatrolDetailsScreen(): React.ReactElement {
  const router = useRouter();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const role = useAuthStore((state) => state.user?.role);
  const patrol = useControlPatrol(id);

  if (patrol.isPending) {
    return <AsyncStateScreen loading onBack={() => router.back()} />;
  }
  if (patrol.isError || !patrol.data) {
    return (
      <AsyncStateScreen
        message={describeError(patrol.error)}
        onBack={() => router.back()}
        onRetry={() => void patrol.refetch()}
      />
    );
  }

  const item = patrol.data;
  const canOpenAdministration = role === 'admin';
  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header title="Обход" onBack={() => router.back()} />
        <PatrolSummary patrol={item} />
        <PatrolContext
          patrol={item}
          onOpenEmployee={canOpenAdministration ? () => router.push({ pathname: '/users/[id]', params: { id: item.employee.id } }) : undefined}
          onOpenShop={canOpenAdministration ? () => router.push({ pathname: '/shops/[id]', params: { id: item.shop.id } }) : undefined}
        />
        <PatrolTimeline patrol={item} />
        {item.cancellationReason ? <MessageCard icon="close-circle-outline" title="Причина отмены" text={item.cancellationReason} tone="danger" /> : null}
        {item.completionReport ? <MessageCard icon="document-text-outline" title="Итоговый отчёт" text={item.completionReport} tone="info" /> : null}
        {item.notes ? <MessageCard icon="information-circle-outline" title="Заметки" text={item.notes} tone="warning" /> : null}
        <VisitsSection patrol={item} />
        <IncidentsSection patrol={item} onOpen={(incidentId) => router.navigate({ pathname: '/incident/[id]', params: { id: incidentId } })} />
        <ReportsSection patrol={item} onOpen={(reportId) => router.navigate({ pathname: '/control-reports/[id]', params: { id: reportId } })} />
        {item.timingProfile ? <TimingSection patrol={item} /> : null}
        <TechnicalEvents patrol={item} />
      </ScrollView>
    </Screen>
  );
}

function PatrolSummary({ patrol }: { patrol: ControlPatrolDetail }): React.ReactElement {
  const presentation = statusPresentation(patrol.status);
  const scanned = Math.min(patrol.progress.scannedPoints, patrol.progress.totalPoints);
  return (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryHeading}>
        <View style={[styles.statusIcon, { backgroundColor: presentation.background }]}>
          <Ionicons name={presentation.icon} size={26} color={presentation.color} />
        </View>
        <View style={styles.summaryCopy}>
          <AppText variant="heading">{presentation.title}</AppText>
          <AppText variant="caption" muted style={styles.gapXs}>{formatDateTime(patrol.startedAt ?? undefined)}</AppText>
        </View>
        <Badge compact icon={presentation.icon} label={patrolStatusLabel(patrol.status)} tone={patrolStatusTone(patrol.status)} />
      </View>
      <View style={styles.progressWrap}>
        <ProgressBar value={scanned} max={patrol.progress.totalPoints} />
        <View style={styles.progressCaption}>
          <AppText variant="caption" muted>Пройдено точек</AppText>
          <AppText variant="caption" style={styles.strongCaption}>{scanned} из {patrol.progress.totalPoints}</AppText>
        </View>
      </View>
      {(patrol.incidentCount > 0 || patrol.reportCount > 0) ? (
        <View style={styles.summaryCounters}>
          <SummaryCounter icon="warning-outline" label={`Нарушения: ${patrol.incidentCount}`} warning={patrol.incidentCount > 0} />
          <SummaryCounter icon="document-text-outline" label={`Отчёты: ${patrol.reportCount}`} />
        </View>
      ) : null}
    </Card>
  );
}

function SummaryCounter({ icon, label, warning = false }: { icon: keyof typeof Ionicons.glyphMap; label: string; warning?: boolean }): React.ReactElement {
  const color = warning ? colors.danger : colors.textMuted;
  return <View style={styles.summaryCounter}><Ionicons name={icon} size={15} color={color} /><AppText variant="caption" color={color} style={styles.counterText}>{label}</AppText></View>;
}

function PatrolContext({ onOpenEmployee, onOpenShop, patrol }: { onOpenEmployee?: () => void; onOpenShop?: () => void; patrol: ControlPatrolDetail }): React.ReactElement {
  return (
    <Card style={styles.detailsCard}>
      <DetailRow first icon="person-outline" label="Сотрудник" value={patrol.employee.fullName ?? 'Не указан'} actionIcon={onOpenEmployee ? 'chevron-forward' : undefined} actionLabel="Открыть пользователя" onAction={onOpenEmployee} />
      <DetailRow icon="storefront-outline" label="Магазин" value={patrol.shop.name ?? 'Не указан'} actionIcon={onOpenShop ? 'chevron-forward' : undefined} actionLabel="Открыть магазин" onAction={onOpenShop} />
      <DetailRow icon="map-outline" label="Маршрут" value={patrol.route.name ?? 'Не указан'} />
      {patrol.route.category ? <DetailRow icon="navigate-outline" label="Категория маршрута" value={patrol.route.category === 'internal' ? 'Внутренний' : 'Внешний'} /> : null}
      {patrol.period ? <DetailRow icon="calendar-outline" label="Период" value={periodLabel(patrol.period)} /> : null}
    </Card>
  );
}

function PatrolTimeline({ patrol }: { patrol: ControlPatrolDetail }): React.ReactElement {
  const finishedAt = resolveFinishedAt(patrol);
  return (
    <Card style={styles.detailsCard}>
      <DetailRow first icon="play-circle-outline" label="Начало" value={formatDateTime(patrol.startedAt ?? undefined)} />
      {finishedAt ? <DetailRow icon={patrol.status === 'cancelled' ? 'close-circle-outline' : 'checkmark-circle-outline'} label={patrol.status === 'cancelled' ? 'Отмена' : 'Завершение'} value={formatDateTime(finishedAt)} /> : null}
      <DetailRow icon="time-outline" label={patrol.durationIsFinal ? 'Точная длительность' : 'Текущая длительность'} value={formatClockSeconds(patrol.durationSeconds)} />
      {patrol.dueAt ? <DetailRow icon="alarm-outline" label="Срок завершения" value={formatDateTime(patrol.dueAt)} /> : null}
      {patrol.expectedSeconds !== null ? <DetailRow icon="speedometer-outline" label="Средний норматив" value={formatClockSeconds(patrol.expectedSeconds)} /> : null}
    </Card>
  );
}

function MessageCard({ icon, text, title, tone }: { icon: keyof typeof Ionicons.glyphMap; text: string; title: string; tone: MessageTone }): React.ReactElement {
  const palette = messagePalette(tone);
  return (
    <View style={[styles.messageCard, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <Ionicons name={icon} size={21} color={palette.icon} />
      <View style={styles.messageContent}><AppText variant="label">{title}</AppText><AppText variant="body" style={styles.messageText}>{text}</AppText></View>
    </View>
  );
}

function VisitsSection({ patrol }: { patrol: ControlPatrolDetail }): React.ReactElement {
  const visits = useMemo(() => [...patrol.visits].sort((left, right) => (left.patrolPoint?.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.patrolPoint?.sortOrder ?? Number.MAX_SAFE_INTEGER)), [patrol.visits]);
  return (
    <Section title="Маршрут обхода" subtitle="Посещение и время на каждой точке" badge={`${patrol.progress.scannedPoints} / ${patrol.progress.totalPoints}`}>
      <Card style={styles.listPanel}>
        {visits.length === 0 ? <EmptyRow text="Посещения контрольных точек не зафиксированы." /> : visits.map((visit, index) => <VisitRow key={visit.id} first={index === 0} visit={visit} />)}
      </Card>
    </Section>
  );
}

function VisitRow({ first, visit }: { first: boolean; visit: ControlPatrolDetail['visits'][number] }): React.ReactElement {
  const pointName = visit.patrolPoint ? `${visit.patrolPoint.sortOrder}. ${visit.patrolPoint.name}` : 'Контрольная точка';
  const completed = visit.status === 'completed';
  return (
    <View style={[styles.visitRow, !first && styles.rowBorder]}>
      <View style={[styles.visitIcon, completed && styles.visitIconCompleted]}><Ionicons name={completed ? 'checkmark' : 'ellipse-outline'} size={18} color={completed ? colors.success : colors.textMuted} /></View>
      <View style={styles.flexContent}>
        <AppText variant="label" numberOfLines={2}>{pointName}</AppText>
        <AppText variant="caption" muted style={styles.gapXs}>Прибытие: {formatDateTime(visit.arrivedAt)}</AppText>
        <AppText variant="caption" muted style={styles.gapXs}>Убытие: {visit.departedAt ? formatDateTime(visit.departedAt) : 'не зафиксировано'}</AppText>
      </View>
      <View style={styles.visitMeta}><Badge compact label={visitStatusLabel(visit.status)} tone={visitStatusTone(visit.status)} /><AppText variant="caption" style={styles.visitDuration}>{formatClockSeconds(visit.dwellSeconds)}</AppText></View>
    </View>
  );
}

function IncidentsSection({ onOpen, patrol }: { onOpen: (id: string) => void; patrol: ControlPatrolDetail }): React.ReactElement {
  return (
    <Section title="Нарушения" subtitle="Отклонения, зафиксированные в этом обходе" badge={String(patrol.incidents.length)} badgeTone={patrol.incidents.length > 0 ? 'danger' : 'success'}>
      {patrol.incidents.length === 0 ? <SuccessEmpty text="Нарушений не зафиксировано" /> : patrol.incidents.map((incident) => (
        <Card key={incident.id} style={styles.actionCard} onPress={() => onOpen(incident.id)}>
          <View style={styles.actionHeader}><Badge compact label={incidentTypeLabel(incident.type)} tone={incidentSeverityTone(incident.severity)} /><Ionicons name="chevron-forward" size={20} color={colors.textMuted} /></View>
          <AppText variant="body" style={styles.actionMessage}>
            {controlIncidentDescription(incident)}
          </AppText>
          <View style={styles.actionMeta}>
            <AppText variant="caption" muted>{formatDateTime(incident.createdAt)}</AppText>
            {incident.actualSeconds !== null ? <AppText variant="caption" muted>Факт: {formatClockSeconds(incident.actualSeconds)}{incident.expectedSeconds === null ? '' : ` · норматив: ${formatClockSeconds(incident.expectedSeconds)}`}</AppText> : null}
          </View>
        </Card>
      ))}
    </Section>
  );
}

function ReportsSection({ onOpen, patrol }: { onOpen: (id: string) => void; patrol: ControlPatrolDetail }): React.ReactElement {
  return (
    <Section title="Операционные отчёты" subtitle="Отчёты, созданные в рамках этого обхода" badge={String(patrol.reports.length)}>
      {patrol.reports.length === 0 ? <NeutralEmpty text="Связанных операционных отчётов нет" /> : patrol.reports.map((report) => (
        <Card key={report.id} style={styles.actionCard} onPress={() => onOpen(report.id)}>
          <View style={styles.reportRow}>
            <View style={styles.reportIcon}><Ionicons name="document-text-outline" size={22} color={colors.primary} /></View>
            <View style={styles.flexContent}><AppText variant="label">{REPORT_TYPE_LABELS[report.reportType]}</AppText><AppText variant="caption" muted style={styles.gapXs}>Фотографий: {report.fileCount}{report.submittedAt ? ` · ${formatDateTime(report.submittedAt)}` : ''}</AppText></View>
            <Badge compact label={REPORT_STATUS_LABELS[report.status]} />
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </View>
        </Card>
      ))}
    </Section>
  );
}

function TimingSection({ patrol }: { patrol: ControlPatrolDetail }): React.ReactElement | null {
  const profile = patrol.timingProfile;
  if (!profile) return null;
  return (
    <Section title="Нормативы времени" subtitle="Основание для оценки длительности обхода">
      <Card style={styles.detailsCardFlat}>
        <DetailRow first icon="analytics-outline" label="Средняя длительность" value={formatClockSeconds(profile.averageTotalSeconds)} />
        <DetailRow icon="flash-outline" label="Быстрый обход" value={`до ${formatClockSeconds(profile.fastSeconds)}`} />
        <DetailRow icon="warning-outline" label="Подозрительно быстрый" value={`до ${formatClockSeconds(profile.suspiciousFastSeconds)}`} />
        <DetailRow icon="hourglass-outline" label="Длительный обход" value={`от ${formatClockSeconds(profile.slowSeconds)}`} />
        <DetailRow icon="layers-outline" label="Обходов в расчёте" value={String(profile.sampleCount)} />
      </Card>
    </Section>
  );
}

function TechnicalEvents({ patrol }: { patrol: ControlPatrolDetail }): React.ReactElement {
  const [expanded, setExpanded] = useState(false);
  return (
    <Section title="Технические данные" subtitle="NFC-события, координаты и синхронизация" badge={String(patrol.events.length)}>
      <TouchableOpacity accessibilityRole="button" activeOpacity={0.7} onPress={() => setExpanded((value) => !value)} style={styles.technicalToggle}>
        <Ionicons name="radio-outline" size={21} color={colors.primary} />
        <AppText variant="label" style={styles.technicalToggleText}>{expanded ? 'Скрыть NFC-события' : 'Показать NFC-события'}</AppText>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.primary} />
      </TouchableOpacity>
      {expanded ? (patrol.events.length === 0 ? <NeutralEmpty text="NFC-события отсутствуют" /> : patrol.events.map((event) => (
        <Card key={event.id} style={styles.technicalCard}>
          <View style={styles.actionHeader}>
            <View style={styles.flexContent}><AppText variant="label">{event.scanAction === 'arrive' ? 'Прибытие' : 'Убытие'} · {event.patrolPoint?.name ?? 'Контрольная точка'}</AppText><AppText variant="caption" muted style={styles.gapXs}>{formatDateTime(event.scannedAt)}</AppText></View>
            <Badge compact label={event.accepted ? 'Принято' : 'Отклонено'} tone={event.accepted ? 'success' : 'danger'} />
          </View>
          <TechnicalValue label="UID метки" value={event.nfcUid} />
          <TechnicalValue label="Устройство" value={event.deviceId} />
          <TechnicalValue label="Получено сервером" value={formatDateTime(event.receivedAt)} />
          {event.lat !== null && event.lng !== null ? <TechnicalValue label="Координаты" value={`${event.lat.toFixed(6)}, ${event.lng.toFixed(6)}${event.gpsAccuracy === null ? '' : ` · ±${Math.round(event.gpsAccuracy)} м`}`} /> : null}
          {event.rejectionReason ? <TechnicalValue label="Причина отклонения" value={event.rejectionReason} danger /> : null}
          {event.suspicionReason ? <TechnicalValue label="Причина подозрения" value={event.suspicionReason} danger /> : null}
          {(event.lateSync || event.isSuspicious) ? <View style={styles.eventFlags}>{event.lateSync ? <Badge compact label="Поздняя синхронизация" /> : null}{event.isSuspicious ? <Badge compact label="Подозрительное событие" tone="warning" /> : null}</View> : null}
        </Card>
      ))) : null}
    </Section>
  );
}

function TechnicalValue({ danger = false, label, value }: { danger?: boolean; label: string; value: string }): React.ReactElement {
  return <View style={styles.technicalValue}><AppText variant="caption" muted>{label}</AppText><AppText variant="caption" color={danger ? colors.danger : colors.text} selectable>{value}</AppText></View>;
}

function Section({ badge, badgeTone = 'neutral', children, subtitle, title }: { badge?: string; badgeTone?: 'neutral' | 'success' | 'warning' | 'danger'; children: React.ReactNode; subtitle: string; title: string }): React.ReactElement {
  return <View style={styles.section}><View style={styles.sectionHeading}><View style={styles.flexContent}><AppText variant="label">{title}</AppText><AppText variant="caption" muted style={styles.gapXs}>{subtitle}</AppText></View>{badge ? <Badge compact label={badge} tone={badgeTone} /> : null}</View>{children}</View>;
}

function EmptyRow({ text }: { text: string }): React.ReactElement {
  return <AppText variant="caption" muted style={styles.emptyText}>{text}</AppText>;
}

function SuccessEmpty({ text }: { text: string }): React.ReactElement {
  return <View style={[styles.emptyState, styles.successEmpty]}><Ionicons name="checkmark-circle-outline" size={20} color={colors.success} /><AppText variant="body" style={styles.emptyStateText}>{text}</AppText></View>;
}

function NeutralEmpty({ text }: { text: string }): React.ReactElement {
  return <View style={styles.emptyState}><Ionicons name="information-circle-outline" size={20} color={colors.textMuted} /><AppText variant="body" muted style={styles.emptyStateText}>{text}</AppText></View>;
}

function resolveFinishedAt(patrol: ControlPatrolDetail): string | undefined {
  if (patrol.completedAt) return patrol.completedAt;
  if (!patrol.durationIsFinal || patrol.startedAt === null || patrol.durationSeconds === null) return undefined;
  return new Date(new Date(patrol.startedAt).getTime() + patrol.durationSeconds * 1000).toISOString();
}

function periodLabel(period: string): string {
  if (period === 'morning') return 'Утро';
  if (period === 'noon') return 'День';
  if (period === 'evening') return 'Вечер';
  return period;
}

function visitStatusLabel(status: PatrolPointVisitStatus): string {
  if (status === 'arrived') return 'Прибыл';
  if (status === 'ready_to_depart') return 'Можно уходить';
  if (status === 'completed') return 'Завершена';
  return 'Ожидает';
}

function visitStatusTone(status: PatrolPointVisitStatus): 'neutral' | 'success' | 'warning' {
  return status === 'completed' ? 'success' : status === 'ready_to_depart' ? 'warning' : 'neutral';
}

function statusPresentation(status: PatrolStatus): { background: string; color: string; icon: keyof typeof Ionicons.glyphMap; title: string } {
  if (status === 'completed') return { background: colors.successBackground, color: colors.success, icon: 'checkmark-circle-outline', title: 'Обход завершён' };
  if (status === 'cancelled') return { background: colors.dangerSurface, color: colors.danger, icon: 'close-circle-outline', title: 'Обход отменён' };
  if (status === 'overdue') return { background: '#fef3c7', color: colors.warning, icon: 'time-outline', title: 'Срок обхода истёк' };
  if (status === 'in_progress') return { background: colors.iconBlueBackground, color: colors.primary, icon: appIcons.patrol, title: 'Обход выполняется' };
  return { background: colors.surfaceMuted, color: colors.textMuted, icon: 'hourglass-outline', title: 'Обход ожидает начала' };
}

function messagePalette(tone: MessageTone): { background: string; border: string; icon: string } {
  if (tone === 'danger') return { background: colors.dangerSurface, border: '#fecaca', icon: colors.danger };
  if (tone === 'warning') return { background: '#fffbeb', border: '#fde68a', icon: colors.warning };
  return { background: colors.controlSurface, border: colors.controlBorder, icon: colors.primary };
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  errorText: { marginBottom: spacing.lg, textAlign: 'center' },
  summaryCard: { padding: spacing.lg },
  summaryHeading: { alignItems: 'center', flexDirection: 'row' },
  statusIcon: { alignItems: 'center', borderRadius: radius.md, height: 52, justifyContent: 'center', marginRight: spacing.md, width: 52 },
  summaryCopy: { flex: 1, marginRight: spacing.sm, minWidth: 0 },
  gapXs: { marginTop: spacing.xs },
  progressWrap: { marginTop: spacing.lg },
  progressCaption: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  strongCaption: { fontWeight: '600' },
  summaryCounters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  summaryCounter: { alignItems: 'center', flexDirection: 'row' },
  counterText: { marginLeft: spacing.xs },
  detailsCard: { marginTop: spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: 0 },
  detailsCardFlat: { paddingHorizontal: spacing.lg, paddingVertical: 0 },
  messageCard: { alignItems: 'flex-start', borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', marginTop: spacing.lg, padding: spacing.lg },
  messageContent: { flex: 1, marginLeft: spacing.md, minWidth: 0 },
  messageText: { marginTop: spacing.sm },
  section: { marginTop: spacing.xl },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', marginBottom: spacing.md },
  flexContent: { flex: 1, minWidth: 0 },
  listPanel: { paddingHorizontal: spacing.lg, paddingVertical: 0 },
  emptyText: { paddingVertical: spacing.lg, textAlign: 'center' },
  visitRow: { alignItems: 'center', flexDirection: 'row', minHeight: 94, paddingVertical: spacing.md },
  rowBorder: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth },
  visitIcon: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, height: 34, justifyContent: 'center', marginRight: spacing.md, width: 34 },
  visitIconCompleted: { backgroundColor: colors.successBackground },
  visitMeta: { alignItems: 'flex-end', marginLeft: spacing.sm },
  visitDuration: { fontWeight: '600', marginTop: spacing.sm },
  actionCard: { marginBottom: spacing.sm, padding: spacing.lg },
  actionHeader: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between' },
  actionMessage: { marginTop: spacing.md },
  actionMeta: { gap: spacing.xs, marginTop: spacing.md },
  reportRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  reportIcon: { alignItems: 'center', backgroundColor: colors.iconBlueBackground, borderRadius: radius.sm, height: 40, justifyContent: 'center', width: 40 },
  emptyState: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', padding: spacing.lg },
  successEmpty: { backgroundColor: colors.successBackground, borderColor: '#bbf7d0' },
  emptyStateText: { flex: 1, marginLeft: spacing.sm },
  technicalToggle: { alignItems: 'center', backgroundColor: colors.controlSurface, borderColor: colors.controlBorder, borderRadius: radius.md, borderWidth: 1, flexDirection: 'row', minHeight: 52, paddingHorizontal: spacing.lg },
  technicalToggleText: { color: colors.primary, flex: 1, marginLeft: spacing.sm },
  technicalCard: { marginTop: spacing.sm, padding: spacing.lg },
  technicalValue: { borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.xs, marginTop: spacing.md, paddingTop: spacing.md },
  eventFlags: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
});
