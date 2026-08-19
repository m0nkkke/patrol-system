import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  CircleSlash2,
  Clock3,
  FileText,
  FilterX,
  LoaderCircle,
  LogIn,
  LogOut,
  MapPin,
  Route,
  Search,
  ShieldAlert,
  Timer,
  UserRound,
} from 'lucide-react';
import { useDeferredValue, useMemo, useState } from 'react';

import { api, getApiErrorMessage } from '../lib/api';
import type {
  ControlPatrolDetail,
  ControlPatrolSummary,
  ControlShopOverview,
  PaginatedResponse,
  PatrolIncidentType,
  PatrolRouteOption,
  PatrolStatus,
  Shop,
} from '../types/api';

type PatrolFilters = {
  employeeId: string;
  from: string;
  routeId: string;
  search: string;
  shopId: string;
  sort: 'startedAt:desc' | 'startedAt:asc' | 'createdAt:desc' | 'createdAt:asc' | 'status:asc' | 'status:desc';
  status: '' | PatrolStatus;
  to: string;
};

const DEFAULT_FILTERS: PatrolFilters = {
  employeeId: '', from: '', routeId: '', search: '', shopId: '', sort: 'startedAt:desc', status: '', to: '',
};
const PAGE_SIZE = 20;

export function PatrolsPage(): React.JSX.Element {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const [filters, setFilters] = useState<PatrolFilters>(DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(filters.search.trim());

  const shopsQuery = useQuery({
    queryKey: ['shops', 'patrol-filter'],
    queryFn: async () => (await api.get<PaginatedResponse<Shop>>('/shops', { params: { limit: 100, page: 1, sort: 'name:asc' } })).data,
  });
  const shopContextQuery = useQuery({
    enabled: filters.shopId !== '',
    queryKey: ['control-shop-overview', filters.shopId, 'patrol-filter'],
    queryFn: async () => (await api.get<ControlShopOverview>(`/control/shops/${filters.shopId}/overview`)).data,
  });
  const routesQuery = useQuery({
    enabled: filters.shopId !== '',
    queryKey: ['patrol-routes', filters.shopId],
    queryFn: async () => (await api.get<PatrolRouteOption[]>(`/patrol-routes/shop/${filters.shopId}`)).data,
  });
  const requestParams = useMemo(() => buildRequestParams(filters, deferredSearch), [deferredSearch, filters]);
  const patrolsQuery = useQuery({
    queryKey: ['control-patrols', requestParams, page],
    queryFn: async () => (await api.get<PaginatedResponse<ControlPatrolSummary>>('/control/patrols', {
      params: { ...requestParams, limit: PAGE_SIZE, page },
    })).data,
  });
  const detailQuery = useQuery({
    enabled: params.patrolId !== undefined,
    queryKey: ['control-patrol', params.patrolId],
    queryFn: async () => (await api.get<ControlPatrolDetail>(`/control/patrols/${params.patrolId}`)).data,
  });

  const totalPages = Math.max(1, Math.ceil((patrolsQuery.data?.total ?? 0) / PAGE_SIZE));
  const updateFilter = <Key extends keyof PatrolFilters>(key: Key, value: PatrolFilters[Key]): void => {
    setPage(1);
    setFilters((current) => {
      if (key === 'shopId') return { ...current, employeeId: '', routeId: '', shopId: value };
      return { ...current, [key]: value };
    });
  };

  return (
    <main className="workspace patrols-workspace">
      <header className="workspace-header">
        <div><p className="eyebrow">Служба контроля</p><h1>История обходов</h1></div>
        <span className="header-count">{patrolsQuery.data?.total ?? 0} обходов</span>
      </header>

      <section className="patrol-filters" aria-label="Фильтры истории обходов">
        <FilterField label="Поиск" wide><span className="filter-control"><Search size={16} /><input onChange={(event) => updateFilter('search', event.target.value)} placeholder="Магазин, сотрудник, маршрут" value={filters.search} /></span></FilterField>
        <FilterField label="Магазин"><select onChange={(event) => updateFilter('shopId', event.target.value)} value={filters.shopId}><option value="">Все доступные</option>{(shopsQuery.data?.items ?? []).map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</select></FilterField>
        <FilterField label="Сотрудник"><select disabled={filters.shopId === ''} onChange={(event) => updateFilter('employeeId', event.target.value)} value={filters.employeeId}><option value="">Все сотрудники</option>{(shopContextQuery.data?.staff ?? []).filter((member) => member.role === 'security_guard').map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></FilterField>
        <FilterField label="Маршрут"><select disabled={filters.shopId === ''} onChange={(event) => updateFilter('routeId', event.target.value)} value={filters.routeId}><option value="">Все маршруты</option>{(routesQuery.data ?? []).map((route) => <option key={route.id} value={route.id}>{route.name}</option>)}</select></FilterField>
        <FilterField label="Статус"><select onChange={(event) => updateFilter('status', event.target.value as PatrolFilters['status'])} value={filters.status}><option value="">Все статусы</option>{PATROL_STATUSES.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></FilterField>
        <FilterField label="С даты"><input max={filters.to || undefined} onChange={(event) => updateFilter('from', event.target.value)} type="date" value={filters.from} /></FilterField>
        <FilterField label="По дату"><input min={filters.from || undefined} onChange={(event) => updateFilter('to', event.target.value)} type="date" value={filters.to} /></FilterField>
        <FilterField label="Сортировка"><select onChange={(event) => updateFilter('sort', event.target.value as PatrolFilters['sort'])} value={filters.sort}><option value="startedAt:desc">Сначала новые</option><option value="startedAt:asc">Сначала старые</option><option value="status:asc">По статусу А-Я</option><option value="status:desc">По статусу Я-А</option></select></FilterField>
        <button className="icon-button filter-reset" onClick={() => { setFilters(DEFAULT_FILTERS); setPage(1); }} title="Сбросить фильтры" type="button"><FilterX size={18} /></button>
      </section>

      <div className={`patrols-layout${params.patrolId === undefined ? '' : ' patrols-layout--detail'}`}>
        <section className="patrols-list-panel">
          {patrolsQuery.isLoading ? <StateBlock label="Загрузка истории" loading /> : null}
          {patrolsQuery.isError ? <StateBlock error={patrolsQuery.error} label="Не удалось загрузить историю" /> : null}
          {!patrolsQuery.isLoading && patrolsQuery.data?.items.length === 0 ? <StateBlock label="Обходы не найдены" /> : null}
          <div className="patrols-table-wrap">
            <table className="patrols-table">
              <thead><tr><th>Статус</th><th>Начало</th><th>Магазин</th><th>Ответственный</th><th>Маршрут</th><th>Время</th><th>Точки</th><th>Факты</th><th /></tr></thead>
              <tbody>{patrolsQuery.data?.items.map((patrol) => (
                <tr className={params.patrolId === patrol.id ? 'is-selected' : undefined} key={patrol.id} onClick={() => void navigate({ to: '/patrols/$patrolId', params: { patrolId: patrol.id } })}>
                  <td><StatusBadge status={patrol.status} /></td>
                  <td><time>{formatNullableDate(patrol.startedAt)}</time><small>{periodLabel(patrol.period)}</small></td>
                  <td><strong>{patrol.shop.name ?? 'Без названия'}</strong></td>
                  <td>{patrol.employee.fullName ?? 'Не указан'}</td>
                  <td>{patrol.route.name ?? 'Не указан'}<small>{routeCategoryLabel(patrol.route.category)}</small></td>
                  <td>{formatDuration(patrol.durationSeconds)}<small>{patrol.expectedSeconds === null ? 'Без норматива' : `Норма ${formatDuration(patrol.expectedSeconds)}`}</small></td>
                  <td>{patrol.progress.scannedPoints}/{patrol.progress.totalPoints}</td>
                  <td><span className={patrol.incidentCount > 0 ? 'fact-count fact-count--danger' : 'fact-count'}>{patrol.incidentCount} наруш.</span><small>{patrol.reportCount} отч.</small></td>
                  <td><ChevronRight size={17} /></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {(patrolsQuery.data?.total ?? 0) > PAGE_SIZE ? <footer className="pagination"><button className="icon-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)} title="Предыдущая страница"><ChevronLeft size={18} /></button><span>Страница {page} из {totalPages}</span><button className="icon-button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)} title="Следующая страница"><ChevronRight size={18} /></button></footer> : null}
        </section>

        {params.patrolId === undefined ? <PatrolPlaceholder /> : <aside className="patrol-detail-panel"><button className="back-button" onClick={() => void navigate({ to: '/patrols' })} type="button"><ArrowLeft size={17} /> К списку</button>{detailQuery.isLoading ? <StateBlock label="Загрузка обхода" loading /> : null}{detailQuery.isError ? <StateBlock error={detailQuery.error} label="Не удалось загрузить обход" /> : null}{detailQuery.data === undefined ? null : <PatrolCard patrol={detailQuery.data} />}</aside>}
      </div>
    </main>
  );
}

function PatrolCard({ patrol }: { patrol: ControlPatrolDetail }): React.JSX.Element {
  const navigate = useNavigate();
  return <div className="patrol-card">
    <header className="patrol-card__heading"><StatusBadge status={patrol.status} /><h2>{patrol.shop.name ?? 'Магазин без названия'}</h2><p><Route size={14} />{patrol.route.name ?? 'Маршрут не указан'} · {routeCategoryLabel(patrol.route.category)}</p><time>{formatNullableDate(patrol.startedAt, true)}</time></header>
    <div className="patrol-kpis"><Kpi label="Фактически" value={formatDuration(patrol.durationSeconds)} /><Kpi label="Норматив" value={formatDuration(patrol.expectedSeconds)} /><Kpi label="Точки" value={`${patrol.progress.scannedPoints}/${patrol.progress.totalPoints}`} /><Kpi danger={patrol.incidentCount > 0} label="Инциденты" value={String(patrol.incidentCount)} /></div>

    <DetailSection icon={<UserRound />} title="Контекст обхода"><DefinitionList items={[["Ответственный", patrol.employee.fullName ?? 'Не указан'], ["Период", periodLabel(patrol.period)], ["Начало", formatNullableDate(patrol.startedAt, true)], ["Плановый срок", formatNullableDate(patrol.dueAt, true)], ["Завершение", formatNullableDate(patrol.completedAt, true)]]} /></DetailSection>

    <DetailSection icon={<MapPin />} title="Посещения контрольных точек" count={patrol.visits.length}>
      <div className="visit-timeline">{patrol.visits.map((visit) => <article className="visit-row" key={visit.id}><span className={`visit-marker${visit.departedAt === null ? ' visit-marker--open' : ''}`}>{visit.patrolPoint?.sortOrder ?? '—'}</span><div className="visit-content"><header><strong>{visit.patrolPoint?.name ?? 'Точка удалена'}</strong><span>{visit.departedAt === null ? 'На точке' : formatDuration(visit.dwellSeconds)}</span></header><div className="visit-scans"><ScanFact event={visit.arrivalEvent} icon={<LogIn />} label="Прибыл" /><ScanFact event={visit.departureEvent} icon={<LogOut />} label="Ушел" /></div></div></article>)}</div>
      {patrol.visits.length === 0 ? <p className="section-empty">Посещения точек не зафиксированы</p> : null}
    </DetailSection>

    <DetailSection icon={<ShieldAlert />} title="Связанные инциденты" count={patrol.incidents.length}><div className="related-list">{patrol.incidents.map((incident) => <button key={incident.id} onClick={() => void navigate({ to: '/incidents/$incidentId', params: { incidentId: incident.id } })} type="button"><AlertTriangle size={15} /><span><strong>{incidentTypeLabel(incident.type)}</strong><small>{incident.message}</small></span><ChevronRight size={16} /></button>)}</div>{patrol.incidents.length === 0 ? <p className="section-empty">Нарушений не зафиксировано</p> : null}</DetailSection>

    <DetailSection icon={<FileText />} title="Связанные отчеты" count={patrol.reports.length}><div className="related-list">{patrol.reports.map((report) => <button key={report.id} onClick={() => void navigate({ to: '/reports/$reportId', params: { reportId: report.id } })} type="button"><FileText size={15} /><span><strong>{reportTypeLabel(report.reportType)}</strong><small>{report.fileCount} файлов · {reportStatusLabel(report.status)}</small></span><ChevronRight size={16} /></button>)}</div>{patrol.reports.length === 0 ? <p className="section-empty">Связанных отчетов нет</p> : null}</DetailSection>

    <DetailSection icon={<Timer />} title="Норматив маршрута">{patrol.timingProfile === null ? <p className="section-empty">Недостаточно данных для расчета норматива</p> : <><div className="threshold-grid"><Kpi label="Подозрительно" value={`< ${formatDuration(patrol.timingProfile.suspiciousFastSeconds)}`} /><Kpi label="Быстро" value={`< ${formatDuration(patrol.timingProfile.fastSeconds)}`} /><Kpi label="Среднее" value={formatDuration(patrol.timingProfile.averageTotalSeconds)} /><Kpi label="Долго" value={`> ${formatDuration(patrol.timingProfile.slowSeconds)}`} /></div><p className="profile-caption">Выборка: {patrol.timingProfile.sampleCount} обходов</p></>}</DetailSection>

    {patrol.notes !== null || patrol.completionReport !== null || patrol.cancellationReason !== null ? <DetailSection icon={<FileText />} title="Комментарии"><DefinitionList items={[["Заметка", patrol.notes ?? '—'], ["Завершение", patrol.completionReport ?? '—'], ["Причина отмены", patrol.cancellationReason ?? '—']]} /></DetailSection> : null}
    <footer className="patrol-card__footer"><span>ID обхода</span><code>{patrol.id}</code></footer>
  </div>;
}

function ScanFact({ event, icon, label }: { event: ControlPatrolDetail['visits'][number]['arrivalEvent']; icon: React.ReactNode; label: string }): React.JSX.Element {
  return <span className={event === null ? 'scan-fact scan-fact--empty' : 'scan-fact'}>{icon}<span><small>{label}</small><strong>{event === null ? 'Не зафиксировано' : formatTime(event.scannedAt)}</strong>{event === null ? null : <em>{event.lateSync ? 'Поздняя синхронизация' : event.deviceId}</em>}</span></span>;
}
function FilterField({ children, label, wide = false }: { children: React.ReactNode; label: string; wide?: boolean }): React.JSX.Element { return <label className={`filter-field${wide ? ' filter-field--wide' : ''}`}><span>{label}</span>{children}</label>; }
function DetailSection({ children, count, icon, title }: { children: React.ReactNode; count?: number; icon: React.ReactNode; title: string }): React.JSX.Element { return <section className="patrol-detail-section"><header>{icon}<h3>{title}</h3>{count === undefined ? null : <small>{count}</small>}</header>{children}</section>; }
function DefinitionList({ items }: { items: Array<[string, string]> }): React.JSX.Element { return <dl className="definition-list">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>; }
function Kpi({ danger = false, label, value }: { danger?: boolean; label: string; value: string }): React.JSX.Element { return <span className={danger ? 'patrol-kpi patrol-kpi--danger' : 'patrol-kpi'}><small>{label}</small><strong>{value}</strong></span>; }
function StatusBadge({ status }: { status: PatrolStatus }): React.JSX.Element { return <span className={`status-badge status-badge--${status}`}>{statusLabel(status)}</span>; }
function PatrolPlaceholder(): React.JSX.Element { return <aside className="patrol-placeholder"><Clock3 size={30} /><strong>Выберите обход</strong><span>Здесь появится маршрут и история сканирований</span></aside>; }
function StateBlock({ error, label, loading = false }: { error?: unknown; label: string; loading?: boolean }): React.JSX.Element { return <div className={`state-block${error === undefined ? '' : ' state-block--error'}`}>{loading ? <LoaderCircle className="spin" size={20} /> : error === undefined ? <CircleSlash2 size={20} /> : <AlertTriangle size={20} />}<span>{error === undefined ? label : getApiErrorMessage(error)}</span></div>; }

function buildRequestParams(filters: PatrolFilters, search: string): Record<string, string | undefined> { return { employeeId: filters.employeeId || undefined, from: toStartOfDay(filters.from), routeId: filters.routeId || undefined, search: search || undefined, shopId: filters.shopId || undefined, sort: filters.sort, status: filters.status || undefined, to: toEndOfDay(filters.to) }; }
function toStartOfDay(value: string): string | undefined { return value === '' ? undefined : new Date(`${value}T00:00:00`).toISOString(); }
function toEndOfDay(value: string): string | undefined { return value === '' ? undefined : new Date(`${value}T23:59:59.999`).toISOString(); }

const PATROL_STATUSES: PatrolStatus[] = ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'];
const STATUS_LABELS: Record<PatrolStatus, string> = { cancelled: 'Отменен', completed: 'Выполнен', in_progress: 'В процессе', overdue: 'Просрочен', pending: 'Запланирован' };
function statusLabel(status: PatrolStatus): string { return STATUS_LABELS[status]; }
function periodLabel(period: string | null): string { return ({ evening: 'Вечер', morning: 'Утро', noon: 'Полдень' } as Record<string, string>)[period ?? ''] ?? 'Период не указан'; }
function routeCategoryLabel(category: ControlPatrolSummary['route']['category']): string { return category === 'internal' ? 'Внутренний' : category === 'external' ? 'Внешний' : 'Категория не указана'; }
function formatNullableDate(value: string | null, withYear = false): string { return value === null ? 'Не зафиксировано' : new Intl.DateTimeFormat('ru-RU', { day: '2-digit', hour: '2-digit', minute: '2-digit', month: 'short', year: withYear ? 'numeric' : undefined }).format(new Date(value)); }
function formatTime(value: string): string { return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value)); }
function formatDuration(seconds: number | null): string { if (seconds === null) return '—'; const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); const rest = seconds % 60; return `${hours > 0 ? `${hours} ч ` : ''}${minutes > 0 ? `${minutes} мин ` : ''}${rest} сек`; }
function incidentTypeLabel(type: PatrolIncidentType): string { return ({ long_interval: 'Долгий интервал', missed_point: 'Пропуск точки', patrol_overdue: 'Обход не выполнен', point_dwell_too_short: 'Недостаточное ожидание', route_suspiciously_fast: 'Подозрительно быстро', route_too_fast: 'Слишком быстро', route_too_slow: 'Слишком долго', schedule_deviation: 'Отклонение от графика', short_interval: 'Короткий интервал' })[type]; }
function reportTypeLabel(type: string): string { return ({ closing: 'Закрытие', evacuation: 'Эвакуационный', heating: 'Отопительный', morning: 'Утренний', photo_report: 'Фотоотчет', sunday: 'Воскресный' } as Record<string, string>)[type] ?? type; }
function reportStatusLabel(status: string): string { return ({ cancelled: 'Отменен', draft: 'Черновик', submitted: 'Отправлен' } as Record<string, string>)[status] ?? status; }
