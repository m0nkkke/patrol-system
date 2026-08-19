import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  AlertTriangle, Building2, CalendarClock, Camera, CheckCircle2, ChevronRight,
  CircleSlash2, Clock3, FileText, LoaderCircle, MapPin, Search, ShieldAlert, Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { api, getApiErrorMessage } from '../lib/api';
import type { ControlShopOverview, PaginatedResponse, Shop, UserRole } from '../types/api';

export function ShopsPage({ selectedShopId }: { selectedShopId?: string }): React.JSX.Element {
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const shopsQuery = useQuery({
    queryKey: ['shops', search],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Shop>>('/shops', {
        params: { limit: 100, page: 1, search: search.trim() || undefined, sort: 'name:asc' },
      });
      return response.data;
    },
  });
  const shops = useMemo(() => shopsQuery.data?.items ?? [], [shopsQuery.data?.items]);

  useEffect(() => {
    const first = shops[0];
    if (selectedShopId === undefined && first !== undefined) {
      void navigate({ to: '/shops/$shopId', params: { shopId: first.id }, replace: true });
    }
  }, [navigate, selectedShopId, shops]);

  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Служба контроля</p>
          <h1>Магазины</h1>
        </div>
        <span className="header-count">{shopsQuery.data?.total ?? 0} объектов</span>
      </header>

      <div className="shop-workspace">
        <aside className="shop-list-panel" aria-label="Список магазинов">
          <label className="search-field">
            <Search size={17} aria-hidden="true" />
            <input aria-label="Поиск магазинов" onChange={(event) => setSearch(event.target.value)} placeholder="Название, адрес или код" value={search} />
          </label>

          <div className="shop-list">
            {shopsQuery.isLoading ? <LoadingBlock label="Загрузка магазинов" /> : null}
            {shopsQuery.isError ? <ErrorBlock error={shopsQuery.error} /> : null}
            {!shopsQuery.isLoading && shops.length === 0 ? <EmptyBlock label="Магазины не найдены" /> : null}
            {shops.map((shop) => (
              <button
                className={`shop-row${selectedShopId === shop.id ? ' shop-row--active' : ''}`}
                key={shop.id}
                onClick={() => void navigate({ to: '/shops/$shopId', params: { shopId: shop.id } })}
                type="button"
              >
                <span className="shop-row__icon"><Building2 size={18} aria-hidden="true" /></span>
                <span className="shop-row__body">
                  <strong>{shop.name}</strong>
                  <small>{shop.address ?? shop.externalId ?? 'Адрес не указан'}</small>
                  <span className={`status-text status-text--${shop.routeStatus}`}>{routeStatusLabel(shop.routeStatus)}</span>
                </span>
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            ))}
          </div>
        </aside>

        <section className="shop-detail-panel">
          {selectedShopId === undefined ? <EmptyDetail /> : <ShopOverview shopId={selectedShopId} />}
        </section>
      </div>
    </main>
  );
}

function ShopOverview({ shopId }: { shopId: string }): React.JSX.Element {
  const navigate = useNavigate();
  const overviewQuery = useQuery({
    queryKey: ['control-shop-overview', shopId],
    queryFn: async () => (await api.get<ControlShopOverview>(`/control/shops/${shopId}/overview`)).data,
  });

  if (overviewQuery.isLoading) return <LoadingBlock label="Загрузка сводки" large />;
  if (overviewQuery.isError) return <ErrorBlock error={overviewQuery.error} large />;
  const overview = overviewQuery.data;
  if (overview === undefined) return <EmptyDetail />;

  return (
    <div className="overview">
      <header className="overview-header">
        <div>
          <div className="overview-title-line">
            <h2>{overview.shop.name}</h2>
            <span className={`route-badge route-badge--${overview.shop.routeStatus}`}>{routeStatusLabel(overview.shop.routeStatus)}</span>
          </div>
          <p><MapPin size={15} aria-hidden="true" /> {overview.shop.address ?? 'Адрес не указан'}</p>
        </div>
        <div className="overview-meta">
          <span>{overview.shop.externalId ?? 'Без кода'}</span>
          <span>{overview.shop.timezone}</span>
        </div>
      </header>

      <div className="metrics-grid">
        <Metric icon={<CheckCircle2 />} label="Выполнение" value={formatPercent(overview.stats.completionRate)} tone="positive" />
        <Metric icon={<CalendarClock />} label="Обходов" value={String(overview.stats.totalPatrols)} />
        <Metric icon={<ShieldAlert />} label="Инцидентов" value={String(overview.stats.incidentCount)} tone={overview.stats.incidentCount > 0 ? 'danger' : 'positive'} />
        <Metric icon={<Clock3 />} label="Просрочено" value={String(overview.stats.overduePatrols)} tone={overview.stats.overduePatrols > 0 ? 'warning' : 'positive'} />
      </div>

      <OverviewSection icon={<CalendarClock />} title="Последние обходы" count={overview.recentPatrols.length}>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>Начало</th><th>Сотрудник</th><th>Маршрут</th><th>Точки</th><th>Статус</th></tr></thead>
            <tbody>{overview.recentPatrols.map((patrol) => (
              <tr className="clickable-row" key={patrol.id} onClick={() => void navigate({ to: '/patrols/$patrolId', params: { patrolId: patrol.id } })}>
                <td>{formatDate(patrol.startedAt)}</td>
                <td>{patrol.employee.fullName ?? 'Не указан'}</td>
                <td>{patrol.route.name ?? 'Без маршрута'}</td>
                <td>{patrol.scannedPoints}/{patrol.totalPoints}</td>
                <td><StatusBadge status={patrol.status} /></td>
              </tr>
            ))}</tbody>
          </table>
          {overview.recentPatrols.length === 0 ? <EmptyInline label="Обходов за период нет" /> : null}
        </div>
      </OverviewSection>

      <div className="overview-columns">
        <OverviewSection icon={<AlertTriangle />} title="Инциденты" count={overview.recentIncidents.length}>
          <div className="incident-list">
            {overview.recentIncidents.map((incident) => (
              <button className={`incident-row incident-row--${incident.severity}`} key={incident.id} onClick={() => void navigate({ to: '/incidents/$incidentId', params: { incidentId: incident.id } })} type="button">
                <span className="incident-row__icon"><AlertTriangle size={17} aria-hidden="true" /></span>
                <span><strong>{incidentTypeLabel(incident.type)}</strong><small>{incident.message}</small></span>
                <time>{formatDate(incident.createdAt, true)}</time>
              </button>
            ))}
            {overview.recentIncidents.length === 0 ? <EmptyInline label="Инцидентов нет" /> : null}
          </div>
        </OverviewSection>

        <OverviewSection icon={<FileText />} title="Отчеты" count={overview.recentReports.length}>
          <div className="report-list">
            {overview.recentReports.map((report) => (
              <button className="report-row" key={report.id} onClick={() => void navigate({ to: '/reports/$reportId', params: { reportId: report.id } })} type="button">
                <span className="report-row__icon">{report.reportType === 'photo_report' ? <Camera size={17} /> : <FileText size={17} />}</span>
                <span><strong>{reportTypeLabel(report.reportType)}</strong><small>{report.employee.fullName ?? 'Сотрудник не указан'}</small></span>
                <StatusBadge status={report.status} />
              </button>
            ))}
            {overview.recentReports.length === 0 ? <EmptyInline label="Отчетов нет" /> : null}
          </div>
        </OverviewSection>
      </div>

      <OverviewSection icon={<Users />} title="Ответственные сотрудники" count={overview.staff.length}>
        <div className="staff-list">
          {overview.staff.map((member) => (
            <div className="staff-row" key={member.id}>
              <span className="avatar avatar--light">{member.fullName.slice(0, 1).toUpperCase()}</span>
              <span><strong>{member.fullName}</strong><small>{roleLabel(member.role)}</small></span>
              <span className={`availability-dot${member.isActive ? ' availability-dot--active' : ''}`} title={member.isActive ? 'Активен' : 'Неактивен'} />
            </div>
          ))}
        </div>
      </OverviewSection>
    </div>
  );
}

function Metric({ icon, label, tone = 'neutral', value }: { icon: React.ReactNode; label: string; tone?: string; value: string }): React.JSX.Element {
  return <div className={`metric metric--${tone}`}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

function OverviewSection({ children, count, icon, title }: { children: React.ReactNode; count: number; icon: React.ReactNode; title: string }): React.JSX.Element {
  return <section className="overview-section"><header><span>{icon}</span><h3>{title}</h3><small>{count}</small></header>{children}</section>;
}

function StatusBadge({ status }: { status: string }): React.JSX.Element {
  return <span className={`status-badge status-badge--${status}`}>{statusLabel(status)}</span>;
}

function LoadingBlock({ label, large = false }: { label: string; large?: boolean }): React.JSX.Element {
  return <div className={`state-block${large ? ' state-block--large' : ''}`}><LoaderCircle className="spin" size={20} /><span>{label}</span></div>;
}

function ErrorBlock({ error, large = false }: { error: unknown; large?: boolean }): React.JSX.Element {
  return <div className={`state-block state-block--error${large ? ' state-block--large' : ''}`}><AlertTriangle size={20} /><span>{getApiErrorMessage(error)}</span></div>;
}

function EmptyBlock({ label }: { label: string }): React.JSX.Element {
  return <div className="state-block"><CircleSlash2 size={20} /><span>{label}</span></div>;
}

function EmptyInline({ label }: { label: string }): React.JSX.Element {
  return <div className="empty-inline">{label}</div>;
}

function EmptyDetail(): React.JSX.Element {
  return <div className="empty-detail"><Building2 size={30} /><strong>Выберите магазин</strong></div>;
}

const statusLabels: Record<string, string> = {
  cancelled: 'Отменен', completed: 'Выполнен', draft: 'Черновик', in_progress: 'В процессе',
  overdue: 'Просрочен', pending: 'Запланирован', submitted: 'Отправлен',
};

function statusLabel(status: string): string { return statusLabels[status] ?? status; }
function routeStatusLabel(status: string): string {
  return ({ not_configured: 'Не настроен', ready: 'Маршрут готов', setup_in_progress: 'Настраивается' } as Record<string, string>)[status] ?? status;
}
function reportTypeLabel(type: string): string {
  return ({ closing: 'Закрытие', evacuation: 'Эвакуационный', heating: 'Отопительный', morning: 'Утренний', photo_report: 'Фотоотчет', sunday: 'Воскресный' } as Record<string, string>)[type] ?? type;
}
function incidentTypeLabel(type: string): string {
  return ({ patrol_overdue: 'Обход просрочен', route_suspiciously_fast: 'Подозрительно быстро', route_too_fast: 'Слишком быстро', route_too_slow: 'Слишком долго', schedule_deviation: 'Отклонение от графика' } as Record<string, string>)[type] ?? type;
}
function roleLabel(role: UserRole): string {
  return ({ admin: 'Администратор', inspector: 'Проверяющий', local_route_setter: 'Локальный настройщик', route_setter: 'Настройщик', security_guard: 'Служба контроля' } as Record<UserRole, string>)[role];
}
function formatPercent(value: number): string { return new Intl.NumberFormat('ru-RU', { style: 'percent', maximumFractionDigits: 0 }).format(value); }
function formatDate(value: string | null, compact = false): string {
  if (value === null) return '—';
  return new Intl.DateTimeFormat('ru-RU', compact
    ? { day: '2-digit', hour: '2-digit', minute: '2-digit', month: 'short' }
    : { day: '2-digit', hour: '2-digit', minute: '2-digit', month: '2-digit', year: '2-digit' }).format(new Date(value));
}
