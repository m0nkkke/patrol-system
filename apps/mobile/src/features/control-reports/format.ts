import type { PatrolPeriod, PatrolReportStatus, PatrolReportType } from '@patrol/shared';

export const REPORT_TYPE_LABELS: Record<PatrolReportType, string> = {
  photo_report: 'Фотоотчёт',
  morning: 'Утренний отчёт',
  closing: 'Отчёт закрытия',
  sunday: 'Воскресный отчёт',
  heating: 'Отчёт отопительного периода',
  evacuation: 'Эвакуационный отчёт',
};

export const REPORT_STATUS_LABELS: Record<PatrolReportStatus, string> = {
  draft: 'Черновик',
  submitted: 'Отправлен',
  cancelled: 'Отменён',
};

export const REPORT_PERIOD_LABELS: Record<PatrolPeriod, string> = {
  morning: 'Утро',
  noon: 'День',
  evening: 'Вечер',
};

export const REPORT_STATUS_TONES: Record<
  PatrolReportStatus,
  'danger' | 'neutral' | 'success'
> = {
  draft: 'neutral',
  submitted: 'success',
  cancelled: 'danger',
};

export function reportTypeIcon(
  type: PatrolReportType,
):
  | 'calendar-outline'
  | 'document-text-outline'
  | 'exit-outline'
  | 'flame-outline'
  | 'images-outline'
  | 'lock-closed-outline'
  | 'sunny-outline' {
  switch (type) {
    case 'photo_report':
      return 'images-outline';
    case 'morning':
      return 'sunny-outline';
    case 'closing':
      return 'lock-closed-outline';
    case 'sunday':
      return 'calendar-outline';
    case 'heating':
      return 'flame-outline';
    case 'evacuation':
      return 'exit-outline';
    default:
      return 'document-text-outline';
  }
}

const REPORT_FIELD_LABELS: Record<string, string> = {
  cancellationReason: 'Причина отмены',
  checklistComplete: 'Проверка завершена',
  entranceClean: 'Входная зона чистая',
  seed: 'Тестовые данные',
};

export function reportFieldLabel(key: string): string {
  const knownLabel = REPORT_FIELD_LABELS[key];
  if (knownLabel) {
    return knownLabel;
  }

  const readable = key.replace(/_/g, ' ').replace(/([a-zа-я])([A-ZА-Я])/g, '$1 $2').trim();
  return readable.length > 0 ? readable.charAt(0).toUpperCase() + readable.slice(1) : key;
}

export function formatReportField(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return '—';
  }
  if (typeof value === 'boolean') {
    return value ? 'Да' : 'Нет';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}
