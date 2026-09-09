import { loadShopOptions } from '../lib/shop-options';
import { useUrlFilters } from '../lib/use-url-filters';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleSlash2,
  Download,
  FileSpreadsheet,
  FilterX,
  LoaderCircle,
  MapPin,
  Radio,
  Route,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';

import { api, getApiErrorMessage } from '../lib/api';
import { incidentDescription } from '../lib/incident-description';
import type {
  ControlIncident,
  IncidentSeverity,
  PaginatedResponse,
  PatrolIncidentType,
} from '../types/api';

type IncidentFilters = {
  from: string;
  search: string;
  severity: '' | IncidentSeverity;
  shopId: string;
  sort: 'createdAt:desc' | 'createdAt:asc' | 'type:asc' | 'type:desc';
  to: string;
  type: '' | PatrolIncidentType;
};

const DEFAULT_FILTERS: IncidentFilters = {
  from: '',
  search: '',
  severity: '',
  shopId: '',
  sort: 'createdAt:desc',
  to: '',
  type: '',
};

const PAGE_SIZE = 20;

export function IncidentsPage(): React.JSX.Element {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const [filters, setFilters] = useUrlFilters<IncidentFilters>('incidents', DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(filters.search.trim());

  const shopsQuery = useQuery({
    queryKey: ['shops', 'options'],
    queryFn: () => loadShopOptions(),
  });

  const requestParams = useMemo(() => buildRequestParams(filters, deferredSearch), [filters, deferredSearch]);
  const incidentsQuery = useQuery({
    queryKey: ['control-incidents', requestParams, page],
    queryFn: async () => (await api.get<PaginatedResponse<ControlIncident>>('/control/incidents', {
      params: { ...requestParams, limit: PAGE_SIZE, page },
    })).data,
  });

  const detailQuery = useQuery({
    enabled: params.incidentId !== undefined,
    queryKey: ['control-incident', params.incidentId],
    queryFn: async () => (await api.get<ControlIncident>(`/control/incidents/${params.incidentId}`)).data,
  });

  const totalPages = Math.max(1, Math.ceil((incidentsQuery.data?.total ?? 0) / PAGE_SIZE));
  const updateFilter = <Key extends keyof IncidentFilters>(key: Key, value: IncidentFilters[Key]): void => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const openIncident = async (incidentId: string): Promise<void> => {
    await navigate({ search: true, to: '/incidents/$incidentId', params: { incidentId } });
  };

  const closeIncident = async (): Promise<void> => {
    await navigate({ to: '/incidents' });
  };

  const downloadExport = async (format: 'csv' | 'xlsx'): Promise<void> => {
    setExporting(format);
    setExportError(null);
    try {
      const response = await api.get<Blob>(`/control/incidents/export.${format}`, {
        params: requestParams,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `control-incidents.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(getApiErrorMessage(error));
    } finally {
      setExporting(null);
    }
  };

  return (
    <main className="workspace incidents-workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Служба контроля</p>
          <h1>Инциденты</h1>
        </div>
        <div className="header-actions">
          <span className="header-count">{incidentsQuery.data?.total ?? 0} событий</span>
          <button className="secondary-button" disabled={exporting !== null} onClick={() => void downloadExport('csv')} type="button">
            <Download size={16} aria-hidden="true" /> CSV
          </button>
          <button className="secondary-button" disabled={exporting !== null} onClick={() => void downloadExport('xlsx')} type="button">
            <FileSpreadsheet size={16} aria-hidden="true" /> XLSX
          </button>
        </div>
      </header>

      <section className="incident-filters" aria-label="Фильтры инцидентов">
        <label className="filter-field filter-field--search">
          <span>Поиск</span>
          <span className="filter-control"><Search size={16} /><input onChange={(event) => updateFilter('search', event.target.value)} placeholder="Сообщение, магазин, сотрудник" value={filters.search} /></span>
        </label>
        <label className="filter-field">
          <span>Магазин</span>
          <select onChange={(event) => updateFilter('shopId', event.target.value)} value={filters.shopId}>
            <option value="">Все доступные</option>
            {(shopsQuery.data?.items ?? []).map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>Критичность</span>
          <select onChange={(event) => updateFilter('severity', event.target.value as IncidentFilters['severity'])} value={filters.severity}>
            <option value="">Все уровни</option>
            <option value="critical">Критический</option>
            <option value="warning">Предупреждение</option>
            <option value="info">Информация</option>
          </select>
        </label>
        <label className="filter-field">
          <span>Тип</span>
          <select onChange={(event) => updateFilter('type', event.target.value as IncidentFilters['type'])} value={filters.type}>
            <option value="">Все типы</option>
            {INCIDENT_TYPES.map((type) => <option key={type} value={type}>{incidentTypeLabel(type)}</option>)}
          </select>
        </label>
        <label className="filter-field">
          <span>С даты</span>
          <input max={filters.to || undefined} onChange={(event) => updateFilter('from', event.target.value)} type="date" value={filters.from} />
        </label>
        <label className="filter-field">
          <span>По дату</span>
          <input min={filters.from || undefined} onChange={(event) => updateFilter('to', event.target.value)} type="date" value={filters.to} />
        </label>
        <label className="filter-field">
          <span>Сортировка</span>
          <select onChange={(event) => updateFilter('sort', event.target.value as IncidentFilters['sort'])} value={filters.sort}>
            <option value="createdAt:desc">Сначала новые</option>
            <option value="createdAt:asc">Сначала старые</option>
            <option value="type:asc">По типу А-Я</option>
            <option value="type:desc">По типу Я-А</option>
          </select>
        </label>
        <button className="icon-button filter-reset" onClick={() => { setPage(1); setFilters(DEFAULT_FILTERS); }} title="Сбросить фильтры" type="button">
          <FilterX size={18} aria-hidden="true" />
        </button>
      </section>
      {exportError === null ? null : <div className="export-error"><AlertTriangle size={15} />{exportError}</div>}

      <div className={`incidents-layout${params.incidentId === undefined ? '' : ' incidents-layout--detail'}`}>
        <section className="incidents-list-panel" aria-label="Список инцидентов">
          {incidentsQuery.isLoading ? <StateBlock label="Загрузка инцидентов" loading /> : null}
          {incidentsQuery.isError ? <StateBlock error={incidentsQuery.error} label="Не удалось загрузить инциденты" /> : null}
          {!incidentsQuery.isLoading && incidentsQuery.data?.items.length === 0 ? <StateBlock label="По выбранным фильтрам инцидентов нет" /> : null}
          <div className="incidents-table-wrap">
            <table className="incidents-table">
              <thead><tr><th>Уровень</th><th>Событие</th><th>Магазин</th><th>Ответственный</th><th>Время</th><th /></tr></thead>
              <tbody>{incidentsQuery.data?.items.map((incident) => (
                <tr className={params.incidentId === incident.id ? 'is-selected' : undefined} key={incident.id} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }} onClick={() => void openIncident(incident.id)}>
                  <td><SeverityBadge severity={incident.severity} /></td>
                  <td><strong>{incidentTypeLabel(incident.type)}</strong><small>{incidentDescription(incident)}</small></td>
                  <td>{incident.shop.name ?? 'Без названия'}<small>{incident.patrol.routeName ?? 'Маршрут не указан'}</small></td>
                  <td>{incident.employee.fullName ?? 'Не указан'}</td>
                  <td><time>{formatDateTime(incident.createdAt)}</time></td>
                  <td><ChevronRight size={17} aria-hidden="true" /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {(incidentsQuery.data?.total ?? 0) > PAGE_SIZE ? (
            <footer className="pagination">
              <button className="icon-button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} title="Предыдущая страница" type="button"><ChevronLeft size={18} /></button>
              <span>Страница {page} из {totalPages}</span>
              <button className="icon-button" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} title="Следующая страница" type="button"><ChevronRight size={18} /></button>
            </footer>
          ) : null}
        </section>

        {params.incidentId === undefined ? <InvestigationPlaceholder /> : (
          <aside className="investigation-panel" aria-label="Карточка расследования">
            <button className="back-button" onClick={() => void closeIncident()} type="button"><ArrowLeft size={17} /> К списку</button>
            {detailQuery.isLoading ? <StateBlock label="Загрузка карточки" loading /> : null}
            {detailQuery.isError ? <StateBlock error={detailQuery.error} label="Не удалось загрузить карточку" /> : null}
            {detailQuery.data !== undefined ? <InvestigationCard incident={detailQuery.data} /> : null}
          </aside>
        )}
      </div>
    </main>
  );
}

function InvestigationCard({ incident }: { incident: ControlIncident }): React.JSX.Element {
  const timingDelta = incident.actualSeconds !== null && incident.expectedSeconds !== null
    ? incident.actualSeconds - incident.expectedSeconds
    : null;

  return (
    <div className="investigation-card">
      <header className="investigation-heading">
        <SeverityBadge severity={incident.severity} />
        <h2>{incidentTypeLabel(incident.type)}</h2>
        <time>{formatDateTime(incident.createdAt, true)}</time>
      </header>
      <p className="incident-message">{incidentDescription(incident)}</p>

      <section className="investigation-section">
        <h3><MapPin size={16} /> Контекст</h3>
        <DefinitionList items={[
          ['Магазин', incident.shop.name ?? 'Без названия'],
          ['Ответственный', incident.employee.fullName ?? 'Не указан'],
          ['Маршрут', incident.patrol.routeName ?? 'Не указан'],
          ['Категория', routeCategoryLabel(incident.patrol.routeCategory)],
          ['Период', periodLabel(incident.patrol.period)],
          ['Статус обхода', patrolStatusLabel(incident.patrol.status)],
        ]} />
      </section>

      <section className="investigation-section">
        <h3><Route size={16} /> Участок маршрута</h3>
        <div className="point-transition">
          <PointLabel fallback="Начальная точка не определена" point={incident.fromPatrolPoint} />
          <ChevronRight size={18} aria-hidden="true" />
          <PointLabel fallback="Конечная точка не определена" point={incident.toPatrolPoint} />
        </div>
        <div className="timing-comparison">
          <TimingValue label="Норматив" seconds={incident.expectedSeconds} />
          <TimingValue label="Фактически" seconds={incident.actualSeconds} />
          <TimingValue label="Отклонение" seconds={timingDelta} signed />
        </div>
      </section>

      <section className="investigation-section">
        <h3><CalendarDays size={16} /> Хронология обхода</h3>
        <DefinitionList items={[
          ['Начало', formatNullableDate(incident.patrol.startedAt)],
          ['Плановый срок', formatNullableDate(incident.patrol.dueAt)],
          ['Завершение', formatNullableDate(incident.patrol.completedAt)],
          ['ID обхода', incident.patrol.id],
        ]} monoLast />
      </section>

      <section className="investigation-section">
        <h3><Radio size={16} /> NFC-событие</h3>
        {incident.patrolEvent === null ? <p className="section-empty">Связанное NFC-событие отсутствует</p> : (
          <DefinitionList items={[
            ['Сканирование', formatDateTime(incident.patrolEvent.scannedAt, true)],
            ['NFC UID', incident.patrolEvent.nfcUid],
            ['Устройство', incident.patrolEvent.deviceId],
            ['Поздняя синхронизация', yesNo(incident.patrolEvent.lateSync)],
            ['Точка деактивирована', yesNo(incident.patrolEvent.pointDeactivatedAfterScan)],
          ]} />
        )}
      </section>

      <footer className="investigation-footer">
        <span><ShieldAlert size={15} /> ID инцидента</span>
        <code>{incident.id}</code>
      </footer>
    </div>
  );
}

function DefinitionList({ items, monoLast = false }: { items: Array<[string, string]>; monoLast?: boolean }): React.JSX.Element {
  return <dl className="definition-list">{items.map(([label, value], index) => <div key={label}><dt>{label}</dt><dd className={monoLast && index === items.length - 1 ? 'mono-value' : undefined}>{value}</dd></div>)}</dl>;
}

function PointLabel({ fallback, point }: { fallback: string; point: ControlIncident['fromPatrolPoint'] }): React.JSX.Element {
  return <span><small>{point === null ? '—' : `Точка ${point.sortOrder}`}</small><strong>{point?.name ?? fallback}</strong></span>;
}

function TimingValue({ label, seconds, signed = false }: { label: string; seconds: number | null; signed?: boolean }): React.JSX.Element {
  return <span><small>{label}</small><strong>{seconds === null ? '—' : `${signed && seconds > 0 ? '+' : ''}${formatDuration(seconds)}`}</strong></span>;
}

function InvestigationPlaceholder(): React.JSX.Element {
  return <aside className="investigation-placeholder"><ShieldAlert size={30} /><strong>Выберите инцидент</strong><span>Здесь появятся факты для расследования</span></aside>;
}

function SeverityBadge({ severity }: { severity: IncidentSeverity }): React.JSX.Element {
  return <span className={`severity-badge severity-badge--${severity}`}><AlertTriangle size={13} />{severityLabel(severity)}</span>;
}

function StateBlock({ error, label, loading = false }: { error?: unknown; label: string; loading?: boolean }): React.JSX.Element {
  return <div className={`state-block${error === undefined ? '' : ' state-block--error'}`}>{loading ? <LoaderCircle className="spin" size={20} /> : error === undefined ? <CircleSlash2 size={20} /> : <AlertTriangle size={20} />}<span>{error === undefined ? label : getApiErrorMessage(error)}</span></div>;
}

function buildRequestParams(filters: IncidentFilters, search: string): Record<string, string | undefined> {
  return {
    from: filters.from === '' ? undefined : new Date(`${filters.from}T00:00:00Z`).toISOString(),
    search: search || undefined,
    severity: filters.severity || undefined,
    shopId: filters.shopId || undefined,
    sort: filters.sort,
    to: filters.to === '' ? undefined : new Date(`${filters.to}T23:59:59.999Z`).toISOString(),
    type: filters.type || undefined,
  };
}

const INCIDENT_TYPES: PatrolIncidentType[] = [
  'patrol_overdue', 'missed_point', 'schedule_deviation', 'route_suspiciously_fast',
  'route_too_fast', 'route_too_slow', 'point_dwell_too_short', 'short_interval', 'long_interval',
];

const INCIDENT_LABELS: Record<PatrolIncidentType, string> = {
  long_interval: 'Долгий интервал',
  missed_point: 'Пропуск точки',
  patrol_overdue: 'Обход не выполнен',
  point_dwell_too_short: 'Недостаточное ожидание на точке',
  route_suspiciously_fast: 'Подозрительно быстрый обход',
  route_too_fast: 'Слишком быстрый обход',
  route_too_slow: 'Слишком долгий обход',
  schedule_deviation: 'Отклонение от графика',
  short_interval: 'Короткий интервал',
};

function incidentTypeLabel(type: PatrolIncidentType): string { return INCIDENT_LABELS[type]; }
function severityLabel(severity: IncidentSeverity): string { return ({ critical: 'Критический', info: 'Информация', warning: 'Предупреждение' })[severity]; }
function routeCategoryLabel(category: ControlIncident['patrol']['routeCategory']): string { return category === 'internal' ? 'Внутренний' : category === 'external' ? 'Внешний' : 'Не указана'; }
function periodLabel(period: string | null): string { return ({ evening: 'Вечер', morning: 'Утро', noon: 'Полдень' } as Record<string, string>)[period ?? ''] ?? 'Не указан'; }
function patrolStatusLabel(status: ControlIncident['patrol']['status']): string { return ({ cancelled: 'Отменен', completed: 'Выполнен', in_progress: 'В процессе', overdue: 'Просрочен', pending: 'Запланирован' })[status]; }
function yesNo(value: boolean): string { return value ? 'Да' : 'Нет'; }
function formatNullableDate(value: string | null): string { return value === null ? 'Не зафиксировано' : formatDateTime(value, true); }
function formatDateTime(value: string, withYear = false): string { return new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', day: '2-digit', hour: '2-digit', minute: '2-digit', month: 'short', year: withYear ? 'numeric' : undefined }).format(new Date(value)); }
function formatDuration(seconds: number): string {
  const sign = seconds < 0 ? '-' : '';
  const absolute = Math.abs(seconds);
  const minutes = Math.floor(absolute / 60);
  const remainingSeconds = absolute % 60;
  return `${sign}${minutes > 0 ? `${minutes} мин ` : ''}${remainingSeconds} сек`;
}
