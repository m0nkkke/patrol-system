import { loadShopOptions } from '../lib/shop-options';
import { PlanFactPanel } from '../components/plan-fact-panel';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  FileSpreadsheet,
  Gauge,
  LoaderCircle,
  Route,
  Store,
  TrendingUp,
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { api, getApiErrorMessage } from '../lib/api';
import type {
  ManagementBreakdown,
  ManagementMetrics,
  ManagementScorecards,
  ManagementTrends,
} from '../types/api';

type TrendBucket = 'day' | 'week' | 'month';
type BreakdownGroup = 'routeCategory' | 'period';
type ExportSection = 'metrics' | 'trends' | 'breakdown' | 'scorecards';
type ExportFormat = 'csv' | 'xlsx';

const SCORECARD_PAGE_SIZE = 20;

export function ManagementPage(): React.JSX.Element {
  const navigate = useNavigate();
  const initialDates = useMemo(() => defaultDateRange(), []);
  const [from, setFrom] = useState(initialDates.from);
  const [to, setTo] = useState(initialDates.to);
  const [shopId, setShopId] = useState('');
  const [bucket, setBucket] = useState<TrendBucket>('day');
  const [groupBy, setGroupBy] = useState<BreakdownGroup>('routeCategory');
  const [scorecardPage, setScorecardPage] = useState(1);
  const [scorecardSort, setScorecardSort] = useState('completionRate:desc');
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const commonParams = useMemo(() => ({
    from: toStartOfDay(from),
    shopId: shopId || undefined,
    to: toEndOfDay(to),
  }), [from, shopId, to]);

  const shopsQuery = useQuery({
    queryKey: ['shops', 'options'],
    queryFn: () => loadShopOptions(),
  });
  const metricsQuery = useQuery({
    queryKey: ['management-metrics', commonParams],
    queryFn: async () => (await api.get<ManagementMetrics>('/management/metrics', { params: commonParams })).data,
  });
  const trendsQuery = useQuery({
    queryKey: ['management-trends', commonParams, bucket],
    queryFn: async () => (await api.get<ManagementTrends>('/management/metrics/trends', {
      params: { ...commonParams, bucket },
    })).data,
  });
  const breakdownQuery = useQuery({
    queryKey: ['management-breakdown', commonParams, groupBy],
    queryFn: async () => (await api.get<ManagementBreakdown>('/management/metrics/breakdown', {
      params: { ...commonParams, groupBy },
    })).data,
  });
  const scorecardsQuery = useQuery({
    queryKey: ['management-scorecards', commonParams, scorecardPage, scorecardSort],
    queryFn: async () => (await api.get<ManagementScorecards>('/management/scorecards/shops', {
      params: {
        ...commonParams,
        limit: SCORECARD_PAGE_SIZE,
        page: scorecardPage,
        sort: scorecardSort,
      },
    })).data,
  });

  const downloadExport = async (section: ExportSection, format: ExportFormat): Promise<void> => {
    const exportKey = `${section}-${format}`;
    setExporting(exportKey);
    setExportError(null);
    const paths: Record<ExportSection, string> = {
      breakdown: '/management/metrics/breakdown',
      metrics: '/management/metrics',
      scorecards: '/management/scorecards/shops',
      trends: '/management/metrics/trends',
    };
    const extraParams = section === 'trends'
      ? { bucket }
      : section === 'breakdown'
        ? { groupBy }
        : section === 'scorecards'
          ? { sort: scorecardSort }
          : {};
    try {
      const response = await api.get<Blob>(`${paths[section]}/export.${format}`, {
        params: { ...commonParams, ...extraParams },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `management-${section}.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(getApiErrorMessage(error));
    } finally {
      setExporting(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil((scorecardsQuery.data?.meta.total ?? 0) / SCORECARD_PAGE_SIZE));
  const metrics = metricsQuery.data?.metrics;

  return <main className="workspace management-workspace">
    <header className="workspace-header">
      <div><p className="eyebrow">Руководство</p><h1>Показатели обходов</h1></div>
      <div className="header-actions">
        <button className="secondary-button" disabled={exporting !== null} onClick={() => void downloadExport('metrics', 'csv')} type="button"><Download size={16} />CSV</button>
        <button className="secondary-button" disabled={exporting !== null} onClick={() => void downloadExport('metrics', 'xlsx')} type="button"><FileSpreadsheet size={16} />XLSX</button>
      </div>
    </header>

    <section className="management-filters" aria-label="Период управленческой отчетности">
      <FilterField label="Магазин"><select onChange={(event) => { setShopId(event.target.value); setScorecardPage(1); }} value={shopId}><option value="">Все магазины</option>{(shopsQuery.data?.items ?? []).map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</select></FilterField>
      <FilterField label="С даты (UTC)"><input max={to} onChange={(event) => { setFrom(event.target.value); setScorecardPage(1); }} type="date" value={from} /></FilterField>
      <FilterField label="По дату (UTC)"><input min={from} onChange={(event) => { setTo(event.target.value); setScorecardPage(1); }} type="date" value={to} /></FilterField>
      <span className="management-period-caption">По зарегистрированным обходам. Неначатые окна расписания не входят в расчёт.</span>
    </section>

    {exportError === null ? null : <div className="export-error"><AlertTriangle size={15} />{exportError}</div>}

    <div className="management-content">
      <PlanFactPanel params={commonParams} />
      {metricsQuery.isLoading ? <StateBlock label="Расчет показателей" loading /> : null}
      {metricsQuery.isError ? <StateBlock error={metricsQuery.error} label="Не удалось загрузить показатели" /> : null}
      {metrics === undefined ? null : <section className="management-kpis" aria-label="Ключевые показатели">
        <Kpi icon={<Route />} label="Зарегистрировано обходов" value={String(metrics.registeredPatrols)} />
        <Kpi icon={<CheckCircle2 />} label="Выполнено" tone="positive" value={metrics.registeredPatrols ? formatPercent(metrics.completionRate) : '—'} />
        <Kpi icon={<Clock3 />} label="Выполнено вовремя" tone="positive" value={metrics.completedPatrols ? formatPercent(metrics.onTimeRate) : '—'} />
        <Kpi icon={<Gauge />} label="Без замечаний" tone="positive" value={metrics.completedPatrols ? formatPercent(metrics.cleanPatrolRate) : '—'} />
        <Kpi icon={<TrendingUp />} label="Средняя длительность" value={formatDuration(metrics.averageCompletionSeconds)} />
        <Kpi icon={<Store />} label="Магазинов в зеленой зоне" tone="positive" value={String(metrics.greenShopCount)} />
      </section>}

      <section className="management-section">
        <SectionHeader icon={<TrendingUp />} title="Динамика">
          <SegmentedControl<TrendBucket> onChange={setBucket} options={[['day', 'Дни'], ['week', 'Недели'], ['month', 'Месяцы']]} value={bucket} />
          <ExportButtons disabled={exporting !== null} onExport={(format) => void downloadExport('trends', format)} />
        </SectionHeader>
        {trendsQuery.isLoading ? <StateBlock label="Загрузка динамики" loading /> : null}
        {trendsQuery.isError ? <StateBlock error={trendsQuery.error} label="Не удалось загрузить динамику" /> : null}
        {trendsQuery.data !== undefined ? <TrendView data={trendsQuery.data} /> : null}
      </section>

      <section className="management-section">
        <SectionHeader icon={<BarChart3 />} title="Разрез показателей">
          <SegmentedControl<BreakdownGroup> onChange={setGroupBy} options={[['routeCategory', 'Маршруты'], ['period', 'Периоды']]} value={groupBy} />
          <ExportButtons disabled={exporting !== null} onExport={(format) => void downloadExport('breakdown', format)} />
        </SectionHeader>
        {breakdownQuery.isLoading ? <StateBlock label="Загрузка разреза" loading /> : null}
        {breakdownQuery.isError ? <StateBlock error={breakdownQuery.error} label="Не удалось загрузить разрез" /> : null}
        {breakdownQuery.data !== undefined ? <BreakdownView data={breakdownQuery.data} /> : null}
      </section>

      <section className="management-section">
        <SectionHeader icon={<Store />} title="Магазины" count={scorecardsQuery.data?.meta.total}>
          <label className="compact-select"><span>Сортировка</span><select onChange={(event) => { setScorecardSort(event.target.value); setScorecardPage(1); }} value={scorecardSort}><option value="completionRate:desc">Выполнение</option><option value="onTimeRate:desc">Своевременность</option><option value="cleanPatrolRate:desc">Без замечаний</option><option value="attentionRate:desc">Требуют внимания</option><option value="shopName:asc">По названию</option></select></label>
          <ExportButtons disabled={exporting !== null} onExport={(format) => void downloadExport('scorecards', format)} />
        </SectionHeader>
        {scorecardsQuery.isLoading ? <StateBlock label="Загрузка магазинов" loading /> : null}
        {scorecardsQuery.isError ? <StateBlock error={scorecardsQuery.error} label="Не удалось загрузить магазины" /> : null}
        {scorecardsQuery.data !== undefined ? <div className="management-table-wrap"><table className="management-table"><thead><tr><th>Магазин</th><th>Состояние</th><th>Обходы</th><th>Выполнение</th><th>Вовремя</th><th>Без замечаний</th><th>Среднее время</th><th>Отчеты</th><th /></tr></thead><tbody>{scorecardsQuery.data.items.map((item) => <tr key={item.shopId} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }} onClick={() => void navigate({ to: '/shops/$shopId', params: { shopId: item.shopId } })}><td><strong>{item.shopName}</strong></td><td><span className={`score-status score-status--${item.status}`}>{item.status === 'green' ? 'Без отклонений' : item.status === 'no_data' ? 'Нет данных' : 'Требует внимания'}</span></td><td>{item.metrics.registeredPatrols}</td><td><RateCell rate={item.metrics.completionRate} /></td><td><RateCell rate={item.metrics.onTimeRate} /></td><td><RateCell rate={item.metrics.cleanPatrolRate} /></td><td>{formatDuration(item.metrics.averageCompletionSeconds)}</td><td>{item.metrics.submittedReports}</td><td><ChevronRight size={16} /></td></tr>)}</tbody></table>{scorecardsQuery.data.items.length === 0 ? <div className="empty-inline">За выбранный период данных нет</div> : null}</div> : null}
        {totalPages > 1 ? <footer className="pagination"><button className="icon-button" disabled={scorecardPage === 1} onClick={() => setScorecardPage((value) => value - 1)} title="Предыдущая страница"><ChevronLeft size={18} /></button><span>Страница {scorecardPage} из {totalPages}</span><button className="icon-button" disabled={scorecardPage >= totalPages} onClick={() => setScorecardPage((value) => value + 1)} title="Следующая страница"><ChevronRight size={18} /></button></footer> : null}
      </section>
    </div>
  </main>;
}

function TrendView({ data }: { data: ManagementTrends }): React.JSX.Element {
  if (data.items.length === 0) return <div className="empty-inline">За выбранный период данных нет</div>;
  return <div className="trend-view"><div className="chart-legend"><span><i className="legend-dot legend-dot--completion" />Выполнение</span><span><i className="legend-dot legend-dot--ontime" />Вовремя</span><span><i className="legend-dot legend-dot--clean" />Без замечаний</span></div><div className="trend-list">{data.items.map((item) => <div className="trend-row" key={item.bucketStart}><time>{formatBucket(item.bucketStart, data.bucket)}</time><MetricBar label="Выполнение" rate={item.metrics.completionRate} tone="completion" /><MetricBar label="Вовремя" rate={item.metrics.onTimeRate} tone="ontime" /><MetricBar label="Без замечаний" rate={item.metrics.cleanPatrolRate} tone="clean" /><span className="trend-volume">{item.metrics.completedPatrols}/{item.metrics.registeredPatrols}</span></div>)}</div></div>;
}

function BreakdownView({ data }: { data: ManagementBreakdown }): React.JSX.Element {
  return <div className="breakdown-grid">{data.items.map((item) => <article className="breakdown-item" key={item.groupKey}><header><strong>{breakdownLabel(item.groupKey)}</strong><span>{item.metrics.completedPatrols} из {item.metrics.registeredPatrols}</span></header><MetricBar label="Выполнение" rate={item.metrics.completionRate} tone="completion" /><dl><div><dt>Вовремя</dt><dd>{formatPercent(item.metrics.onTimeRate)}</dd></div><div><dt>Без замечаний</dt><dd>{formatPercent(item.metrics.cleanPatrolRate)}</dd></div><div><dt>Среднее время</dt><dd>{formatDuration(item.metrics.averageCompletionSeconds)}</dd></div><div><dt>Отчеты</dt><dd>{item.metrics.submittedReports}</dd></div></dl></article>)}</div>;
}

function MetricBar({ label, rate, tone }: { label: string; rate: number; tone: 'clean' | 'completion' | 'ontime' }): React.JSX.Element {
  return <span className="metric-bar" title={`${label}: ${formatPercent(rate)}`}><i className={`metric-bar__fill metric-bar__fill--${tone}`} style={{ width: `${Math.min(100, Math.max(0, rate * 100))}%` }} /></span>;
}

function RateCell({ rate }: { rate: number }): React.JSX.Element { return <span className="rate-cell"><span className="metric-bar"><i className="metric-bar__fill metric-bar__fill--completion" style={{ width: `${Math.min(100, Math.max(0, rate * 100))}%` }} /></span><strong>{formatPercent(rate)}</strong></span>; }
function Kpi({ icon, label, tone = 'neutral', value }: { icon: React.ReactNode; label: string; tone?: 'neutral' | 'positive'; value: string }): React.JSX.Element { return <div className={`management-kpi management-kpi--${tone}`}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>; }
function FilterField({ children, label }: { children: React.ReactNode; label: string }): React.JSX.Element { return <label className="filter-field"><span>{label}</span>{children}</label>; }
function SectionHeader({ children, count, icon, title }: { children: React.ReactNode; count?: number; icon: React.ReactNode; title: string }): React.JSX.Element { return <header className="management-section__header"><span className="section-title-icon">{icon}</span><h2>{title}</h2>{count === undefined ? null : <small>{count}</small>}<div className="section-actions">{children}</div></header>; }
function ExportButtons({ disabled, onExport }: { disabled: boolean; onExport: (format: ExportFormat) => void }): React.JSX.Element { return <span className="icon-actions"><button className="icon-button" disabled={disabled} onClick={() => onExport('csv')} title="Скачать CSV" type="button"><Download size={16} /></button><button className="icon-button" disabled={disabled} onClick={() => onExport('xlsx')} title="Скачать XLSX" type="button"><FileSpreadsheet size={16} /></button></span>; }
function SegmentedControl<T extends string>({ onChange, options, value }: { onChange: (value: T) => void; options: Array<[T, string]>; value: T }): React.JSX.Element { return <span className="segmented-control">{options.map(([key, label]) => <button className={value === key ? 'is-active' : undefined} key={key} onClick={() => onChange(key)} type="button">{label}</button>)}</span>; }
function StateBlock({ error, label, loading = false }: { error?: unknown; label: string; loading?: boolean }): React.JSX.Element { return <div className={`state-block${error === undefined ? '' : ' state-block--error'}`}>{loading ? <LoaderCircle className="spin" size={20} /> : <AlertTriangle size={20} />}<span>{error === undefined ? label : getApiErrorMessage(error)}</span></div>; }

function defaultDateRange(): { from: string; to: string } { const to = new Date(); const from = new Date(to); from.setDate(from.getDate() - 13); return { from: formatInputDate(from), to: formatInputDate(to) }; }
function formatInputDate(date: Date): string { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, '0'); const day = String(date.getDate()).padStart(2, '0'); return `${year}-${month}-${day}`; }
function toStartOfDay(value: string): string { return new Date(`${value}T00:00:00Z`).toISOString(); }
function toEndOfDay(value: string): string { return new Date(`${value}T23:59:59.999Z`).toISOString(); }
function formatPercent(value: number): string { return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1, style: 'percent' }).format(value); }
function formatDuration(seconds: number | null): string { if (seconds === null) return 'Нет данных'; const minutes = Math.floor(seconds / 60); const rest = seconds % 60; return minutes === 0 ? `${rest} сек` : `${minutes} мин ${rest > 0 ? `${rest} сек` : ''}`.trim(); }
function formatBucket(value: string, bucket: TrendBucket): string { return new Intl.DateTimeFormat('ru-RU', bucket === 'month' ? { month: 'long', year: 'numeric' } : { day: '2-digit', month: 'short' }).format(new Date(value)); }
function breakdownLabel(value: string): string { return ({ evening: 'Вечер', external: 'Внешние маршруты', internal: 'Внутренние маршруты', morning: 'Утро', noon: 'Полдень' } as Record<string, string>)[value] ?? value; }
