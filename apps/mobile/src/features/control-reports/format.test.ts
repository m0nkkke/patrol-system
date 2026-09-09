import {
  formatReportField,
  reportFieldLabel,
  REPORT_STATUS_LABELS,
  REPORT_TYPE_LABELS,
  reportTypeIcon,
} from './format';

describe('control report formatting', () => {
  it('uses Russian labels for report types and statuses', () => {
    expect(REPORT_TYPE_LABELS.photo_report).toBe('Фотоотчёт');
    expect(REPORT_STATUS_LABELS.submitted).toBe('Отправлен');
  });

  it('uses a relevant icon for each report type', () => {
    expect(reportTypeIcon('photo_report')).toBe('images-outline');
    expect(reportTypeIcon('evacuation')).toBe('exit-outline');
  });

  it('formats known and arbitrary field names', () => {
    expect(reportFieldLabel('entranceClean')).toBe('Входная зона чистая');
    expect(reportFieldLabel('door_closed')).toBe('Door closed');
  });

  it('formats field values for display', () => {
    expect(formatReportField(true)).toBe('Да');
    expect(formatReportField(false)).toBe('Нет');
    expect(formatReportField(null)).toBe('—');
    expect(formatReportField({ checked: true })).toBe('{\n  "checked": true\n}');
  });
});
