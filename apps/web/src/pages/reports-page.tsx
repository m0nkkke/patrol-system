import { loadShopOptions } from '../lib/shop-options';
import { useUrlFilters } from '../lib/use-url-filters';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleSlash2,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FilterX,
  ImageOff,
  LoaderCircle,
  Maximize2,
  Route,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import { api, getApiErrorMessage } from '../lib/api';
import type {
  ControlReport,
  ControlShopOverview,
  PaginatedResponse,
  PatrolReportStatus,
  PatrolReportType,
} from '../types/api';

type ReportFilters = {
  employeeId: string;
  from: string;
  period: '' | 'morning' | 'noon' | 'evening';
  reportType: '' | PatrolReportType;
  search: string;
  shopId: string;
  sort: 'createdAt:desc' | 'createdAt:asc' | 'submittedAt:desc' | 'submittedAt:asc';
  status: '' | PatrolReportStatus;
  to: string;
};

const DEFAULT_FILTERS: ReportFilters = {
  employeeId: '', from: '', period: '', reportType: '', search: '', shopId: '', sort: 'createdAt:desc', status: '', to: '',
};
const PAGE_SIZE = 20;

export function ReportsPage(): React.JSX.Element {
  const params = useParams({ strict: false });
  const navigate = useNavigate();
  const [filters, setFilters] = useUrlFilters<ReportFilters>('reports', DEFAULT_FILTERS);
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(filters.search.trim());

  const shopsQuery = useQuery({
    queryKey: ['shops', 'options'],
    queryFn: () => loadShopOptions(),
  });
  const shopContextQuery = useQuery({
    enabled: filters.shopId !== '',
    queryKey: ['control-shop-overview', filters.shopId, 'report-filter'],
    queryFn: async () => (await api.get<ControlShopOverview>(`/control/shops/${filters.shopId}/overview`)).data,
  });
  const requestParams = useMemo(() => buildRequestParams(filters, deferredSearch), [deferredSearch, filters]);
  const reportsQuery = useQuery({
    queryKey: ['control-reports', requestParams, page],
    queryFn: async () => (await api.get<PaginatedResponse<ControlReport>>('/control/reports', { params: { ...requestParams, limit: PAGE_SIZE, page } })).data,
  });
  const detailQuery = useQuery({
    enabled: params.reportId !== undefined,
    queryKey: ['control-report', params.reportId],
    queryFn: async () => (await api.get<ControlReport>(`/control/reports/${params.reportId}`)).data,
  });

  const totalPages = Math.max(1, Math.ceil((reportsQuery.data?.total ?? 0) / PAGE_SIZE));
  const updateFilter = <Key extends keyof ReportFilters>(key: Key, value: ReportFilters[Key]): void => {
    setPage(1);
    setFilters((current) => key === 'shopId'
      ? { ...current, employeeId: '', shopId: value }
      : { ...current, [key]: value });
  };

  const downloadExport = async (format: 'csv' | 'xlsx'): Promise<void> => {
    setExporting(format);
    setExportError(null);
    try {
      const response = await api.get<Blob>(`/control/reports/export.${format}`, { params: requestParams, responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `control-reports.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(getApiErrorMessage(error));
    } finally {
      setExporting(null);
    }
  };

  return <main className="workspace reports-workspace">
    <header className="workspace-header"><div><p className="eyebrow">Служба контроля</p><h1>Операционные отчеты</h1></div><div className="header-actions"><span className="header-count">{reportsQuery.data?.total ?? 0} отчетов</span><button className="secondary-button" disabled={exporting !== null} onClick={() => void downloadExport('csv')}><Download size={16} />CSV</button><button className="secondary-button" disabled={exporting !== null} onClick={() => void downloadExport('xlsx')}><FileSpreadsheet size={16} />XLSX</button></div></header>

    <section className="report-filters" aria-label="Фильтры отчетов">
      <FilterField label="Поиск" wide><span className="filter-control"><Search size={16} /><input onChange={(event) => updateFilter('search', event.target.value)} placeholder="Комментарий, магазин, сотрудник" value={filters.search} /></span></FilterField>
      <FilterField label="Магазин"><select onChange={(event) => updateFilter('shopId', event.target.value)} value={filters.shopId}><option value="">Все доступные</option>{(shopsQuery.data?.items ?? []).map((shop) => <option key={shop.id} value={shop.id}>{shop.name}</option>)}</select></FilterField>
      <FilterField label="Сотрудник"><select disabled={filters.shopId === ''} onChange={(event) => updateFilter('employeeId', event.target.value)} value={filters.employeeId}><option value="">Все сотрудники</option>{(shopContextQuery.data?.staff ?? []).filter((member) => member.role === 'security_guard').map((member) => <option key={member.id} value={member.id}>{member.fullName}</option>)}</select></FilterField>
      <FilterField label="Тип"><select onChange={(event) => updateFilter('reportType', event.target.value as ReportFilters['reportType'])} value={filters.reportType}><option value="">Все типы</option>{REPORT_TYPES.map((type) => <option key={type} value={type}>{reportTypeLabel(type)}</option>)}</select></FilterField>
      <FilterField label="Статус"><select onChange={(event) => updateFilter('status', event.target.value as ReportFilters['status'])} value={filters.status}><option value="">Все статусы</option><option value="submitted">Отправлен</option><option value="draft">Черновик</option><option value="cancelled">Отменен</option></select></FilterField>
      <FilterField label="Период"><select onChange={(event) => updateFilter('period', event.target.value as ReportFilters['period'])} value={filters.period}><option value="">Все периоды</option><option value="morning">Утро</option><option value="noon">Полдень</option><option value="evening">Вечер</option></select></FilterField>
      <FilterField label="С даты (UTC)"><input max={filters.to || undefined} onChange={(event) => updateFilter('from', event.target.value)} type="date" value={filters.from} /></FilterField>
      <FilterField label="По дату (UTC)"><input min={filters.from || undefined} onChange={(event) => updateFilter('to', event.target.value)} type="date" value={filters.to} /></FilterField>
      <FilterField label="Сортировка"><select onChange={(event) => updateFilter('sort', event.target.value as ReportFilters['sort'])} value={filters.sort}><option value="createdAt:desc">Сначала новые</option><option value="createdAt:asc">Сначала старые</option><option value="submittedAt:desc">Сначала отправленные</option><option value="submittedAt:asc">Отправленные по возрастанию</option></select></FilterField>
      <button className="icon-button filter-reset" onClick={() => { setFilters(DEFAULT_FILTERS); setPage(1); }} title="Сбросить фильтры"><FilterX size={18} /></button>
    </section>
    {exportError === null ? null : <div className="export-error"><AlertTriangle size={15} />{exportError}</div>}

    <div className={`reports-layout${params.reportId === undefined ? '' : ' reports-layout--detail'}`}>
      <section className="reports-list-panel">
        {reportsQuery.isLoading ? <StateBlock label="Загрузка отчетов" loading /> : null}
        {reportsQuery.isError ? <StateBlock error={reportsQuery.error} label="Не удалось загрузить отчеты" /> : null}
        {!reportsQuery.isLoading && reportsQuery.data?.items.length === 0 ? <StateBlock label="Отчеты не найдены" /> : null}
        <div className="reports-table-wrap"><table className="reports-table"><thead><tr><th>Тип</th><th>Статус</th><th>Магазин</th><th>Сотрудник</th><th>Период</th><th>Создан</th><th>Фото</th><th /></tr></thead><tbody>{reportsQuery.data?.items.map((report) => <tr className={params.reportId === report.id ? 'is-selected' : undefined} key={report.id} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }} onClick={() => void navigate({ search: true, to: '/reports/$reportId', params: { reportId: report.id } })}><td><span className="report-type-cell">{report.reportType === 'photo_report' ? <Camera size={15} /> : <FileText size={15} />}<strong>{reportTypeLabel(report.reportType)}</strong></span></td><td><ReportStatusBadge status={report.status} /></td><td>{report.shop.name ?? 'Без названия'}</td><td>{report.employee.fullName ?? 'Не указан'}</td><td>{periodLabel(report.period)}</td><td><time>{formatDate(report.createdAt)}</time></td><td>{report.files.length}</td><td><ChevronRight size={17} /></td></tr>)}</tbody></table></div>
        {(reportsQuery.data?.total ?? 0) > PAGE_SIZE ? <footer className="pagination"><button className="icon-button" disabled={page === 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={18} /></button><span>Страница {page} из {totalPages}</span><button className="icon-button" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={18} /></button></footer> : null}
      </section>
      {params.reportId === undefined ? <ReportPlaceholder /> : <aside className="report-detail-panel"><button className="back-button" onClick={() => void navigate({ to: '/reports' })}><ArrowLeft size={17} />К списку</button>{detailQuery.isLoading ? <StateBlock label="Загрузка отчета" loading /> : null}{detailQuery.isError ? <StateBlock error={detailQuery.error} label="Не удалось загрузить отчет" /> : null}{detailQuery.data === undefined ? null : <ReportCard report={detailQuery.data} />}</aside>}
    </div>
  </main>;
}

function ReportCard({ report }: { report: ControlReport }): React.JSX.Element {
  const navigate = useNavigate();
  const [previewFile, setPreviewFile] = useState<ControlReport['files'][number] | null>(null);
  return <div className="control-report-card">
    <header className="control-report-heading"><span className="control-report-icon">{report.reportType === 'photo_report' ? <Camera size={19} /> : <FileText size={19} />}</span><div><ReportStatusBadge status={report.status} /><h2>{reportTypeLabel(report.reportType)}</h2><p>{report.shop.name ?? 'Магазин без названия'} · {periodLabel(report.period)}</p><time>{formatDate(report.createdAt, true)}</time></div></header>
    <ReportSection icon={<UserRound />} title="Контекст"><DefinitionList items={[["Сотрудник", report.employee.fullName ?? 'Не указан'], ["Маршрут", report.route?.name ?? 'Не указан'], ["Расписание", report.schedule?.name ?? 'Не указано'], ["Отправлен", report.submittedAt === null ? 'Не отправлен' : formatDate(report.submittedAt, true)], ["Версия схемы", report.schemaVersion]]} />{report.patrolId === null ? null : <button className="report-link-button" onClick={() => void navigate({ to: '/patrols/$patrolId', params: { patrolId: report.patrolId! } })}><Route size={15} />Открыть связанный обход<ExternalLink size={14} /></button>}</ReportSection>
    <ReportSection icon={<FileText />} title="Данные отчета" count={Object.keys(report.fields).length}>{Object.keys(report.fields).length === 0 ? <p className="section-empty">Структурированные поля не заполнены</p> : <dl className="report-fields">{Object.entries(report.fields).map(([key, value]) => <div key={key}><dt>{fieldLabel(key)}</dt><dd>{formatFieldValue(value)}</dd></div>)}</dl>}</ReportSection>
    {report.comment !== null ? <ReportSection icon={<FileText />} title="Комментарий"><p className="report-comment">{report.comment}</p></ReportSection> : null}
    {report.cancellationReason !== null ? <ReportSection icon={<AlertTriangle />} title="Причина отмены"><p className="report-comment report-comment--danger">{report.cancellationReason}</p></ReportSection> : null}
    <ReportSection icon={<Camera />} title="Фотографии" count={report.files.length}>{report.files.length === 0 ? <p className="section-empty">Фотографии не приложены</p> : <div className="report-gallery">{report.files.map((file) => <button key={file.id} onClick={() => setPreviewFile(file)} title="Открыть фотографию"><AuthenticatedImage alt={file.originalName ?? reportTypeLabel(report.reportType)} fileId={file.id} /><span><Maximize2 size={14} />{formatFileSize(file.sizeBytes)}</span></button>)}</div>}</ReportSection>
    <footer className="patrol-card__footer"><span>ID отчета</span><code>{report.id}</code></footer>
    {previewFile === null ? null : <ImagePreview file={previewFile} onClose={() => setPreviewFile(null)} />}
  </div>;
}

function AuthenticatedImage({ alt, fileId }: { alt: string; fileId: string }): React.JSX.Element {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    void api.get<Blob>(`/files/${fileId}`, { responseType: 'blob' }).then((response) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(response.data);
      setSrc(objectUrl);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; if (objectUrl !== null) URL.revokeObjectURL(objectUrl); };
  }, [fileId]);
  if (failed) return <span className="image-state"><ImageOff size={22} />Не удалось загрузить</span>;
  if (src === null) return <span className="image-state"><LoaderCircle className="spin" size={22} /></span>;
  return <img alt={alt} src={src} />;
}

function ImagePreview({ file, onClose }: { file: ControlReport['files'][number]; onClose: () => void }): React.JSX.Element {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    closeButton.current?.focus();
    const close = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') { event.preventDefault(); closeButton.current?.focus(); }
    };
    window.addEventListener('keydown', close);
    return () => { window.removeEventListener('keydown', close); if (previous instanceof HTMLElement) previous.focus(); };
  }, [onClose]);
  return <div className="image-preview" role="dialog" aria-modal="true" aria-label="Просмотр фотографии"><button ref={closeButton} className="icon-button" onClick={onClose} title="Закрыть"><X size={20} /></button><AuthenticatedImage alt={file.originalName ?? 'Фотография отчета'} fileId={file.id} /><footer><strong>{file.originalName ?? 'Фотография отчета'}</strong><span>{file.width ?? '—'} × {file.height ?? '—'} · {formatFileSize(file.sizeBytes)}</span></footer></div>;
}

function FilterField({ children, label, wide = false }: { children: React.ReactNode; label: string; wide?: boolean }): React.JSX.Element { return <label className={`filter-field${wide ? ' filter-field--wide' : ''}`}><span>{label}</span>{children}</label>; }
function ReportSection({ children, count, icon, title }: { children: React.ReactNode; count?: number; icon: React.ReactNode; title: string }): React.JSX.Element { return <section className="report-detail-section"><header>{icon}<h3>{title}</h3>{count === undefined ? null : <small>{count}</small>}</header>{children}</section>; }
function DefinitionList({ items }: { items: Array<[string, string]> }): React.JSX.Element { return <dl className="definition-list">{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>; }
function ReportStatusBadge({ status }: { status: PatrolReportStatus }): React.JSX.Element { return <span className={`status-badge status-badge--${status}`}>{({ cancelled: 'Отменен', draft: 'Черновик', submitted: 'Отправлен' })[status]}</span>; }
function ReportPlaceholder(): React.JSX.Element { return <aside className="report-placeholder"><FileText size={30} /><strong>Выберите отчет</strong><span>Здесь появятся данные и фотографии</span></aside>; }
function StateBlock({ error, label, loading = false }: { error?: unknown; label: string; loading?: boolean }): React.JSX.Element { return <div className={`state-block${error === undefined ? '' : ' state-block--error'}`}>{loading ? <LoaderCircle className="spin" size={20} /> : error === undefined ? <CircleSlash2 size={20} /> : <AlertTriangle size={20} />}<span>{error === undefined ? label : getApiErrorMessage(error)}</span></div>; }

const REPORT_TYPES: PatrolReportType[] = ['photo_report', 'morning', 'closing', 'sunday', 'heating', 'evacuation'];
function buildRequestParams(filters: ReportFilters, search: string): Record<string, string | undefined> { return { employeeId: filters.employeeId || undefined, from: filters.from === '' ? undefined : new Date(`${filters.from}T00:00:00Z`).toISOString(), period: filters.period || undefined, reportType: filters.reportType || undefined, search: search || undefined, shopId: filters.shopId || undefined, sort: filters.sort, status: filters.status || undefined, to: filters.to === '' ? undefined : new Date(`${filters.to}T23:59:59.999Z`).toISOString() }; }
function reportTypeLabel(type: PatrolReportType): string { return ({ closing: 'Закрытие', evacuation: 'Эвакуационный', heating: 'Отопительный', morning: 'Утренний', photo_report: 'Фотоотчет', sunday: 'Воскресный' })[type]; }
function periodLabel(period: ControlReport['period']): string { return ({ evening: 'Вечер', morning: 'Утро', noon: 'Полдень' } as Record<string, string>)[period ?? ''] ?? 'Не указан'; }
function formatDate(value: string, withYear = false): string { return new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', day: '2-digit', hour: '2-digit', minute: '2-digit', month: 'short', year: withYear ? 'numeric' : undefined }).format(new Date(value)); }
function fieldLabel(key: string): string { const spaced = key.replace(/([a-zа-я])([A-ZА-Я])/g, '$1 $2').replace(/_/g, ' '); return spaced.charAt(0).toUpperCase() + spaced.slice(1); }
function formatFieldValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  if (value === null || value === undefined || value === '') return 'Не указано';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint') return String(value);
  if (Array.isArray(value)) return value.map(formatFieldValue).join('; ');
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${fieldLabel(key)}: ${formatFieldValue(item)}`).join('; ');
  return 'Неподдерживаемое значение';
}
function formatFileSize(bytes: number): string { return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} КБ` : `${(bytes / 1024 / 1024).toFixed(1)} МБ`; }
