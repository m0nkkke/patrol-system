import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { api, getApiErrorMessage } from '../lib/api';
import type { PaginatedResponse } from '../types/api';

type ArchiveItem = { id: string; displayName: string; archivedAt?: string; resourceType: string };
type AuditItem = {
  id: string;
  action: string;
  createdAt: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  user?: { fullName: string };
  meta?: Record<string, unknown>;
};
const resources = {
  shops: 'Магазины',
  users: 'Сотрудники',
  'patrol-routes': 'Маршруты',
  'patrol-points': 'Контрольные точки',
  'nfc-tags': 'NFC-метки',
  'file-assets': 'Файлы',
};

export function AdministrationPage(): React.JSX.Element {
  const { profile } = useAuth();
  if (profile?.role !== 'admin') return <Navigate to="/" replace />;
  return <Administration />;
}

function Administration(): React.JSX.Element {
  const client = useQueryClient();
  const [tab, setTab] = useState<'archive' | 'audit'>('archive');
  const [resource, setResource] = useState('shops');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const archive = useQuery({
    queryKey: ['archive', resource, search, page],
    enabled: tab === 'archive',
    queryFn: async () =>
      (
        await api.get<PaginatedResponse<ArchiveItem>>(`/archive/${resource}`, {
          params: { search: search || undefined, page, limit: 20 },
        })
      ).data,
  });
  const audit = useQuery({
    queryKey: ['audit', search, page],
    enabled: tab === 'audit',
    queryFn: async () =>
      (
        await api.get<PaginatedResponse<AuditItem>>('/audit-log', {
          params: { search: search || undefined, page, limit: 20, sort: 'createdAt:desc' },
        })
      ).data,
  });
  const restore = useMutation({
    mutationFn: async (item: ArchiveItem) => {
      await api.post(`/archive/${item.resourceType}/${item.id}/restore`);
    },
    onSuccess: () => {
      void client.invalidateQueries();
    },
  });
  const download = useMutation({
    mutationFn: async (format: 'csv' | 'xlsx') => {
      const { data } = await api.get<Blob>(`/audit-log/export.${format}`, {
        params: { search: search || undefined, sort: 'createdAt:desc' },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `audit.${format}`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });
  const query = tab === 'archive' ? archive : audit;
  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Администрирование</p>
          <h1>Архив и аудит</h1>
        </div>
      </header>
      <div className="admin-content">
        <div className="segmented-control">
          <button
            className={tab === 'archive' ? 'is-active' : ''}
            onClick={() => {
              setTab('archive');
              setPage(1);
              setSearch('');
            }}
          >
            Архив
          </button>
          <button
            className={tab === 'audit' ? 'is-active' : ''}
            onClick={() => {
              setTab('audit');
              setPage(1);
              setSearch('');
            }}
          >
            Журнал действий
          </button>
        </div>
        <label className="filter-field">
          <span>Поиск</span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={
              tab === 'archive' ? 'Название объекта' : 'Действие, объект или данные события'
            }
          />
        </label>
        {tab === 'archive' ? (
          <label className="filter-field">
            <span>Тип объекта</span>
            <select
              value={resource}
              onChange={(e) => {
                setResource(e.target.value);
                setPage(1);
              }}
            >
              {Object.entries(resources).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="header-actions">
            <span className="admin-note">Время событий: UTC</span>
            <button
              className="secondary-button"
              disabled={download.isPending}
              onClick={() => download.mutate('csv')}
            >
              Скачать CSV
            </button>
            <button
              className="secondary-button"
              disabled={download.isPending}
              onClick={() => download.mutate('xlsx')}
            >
              Скачать XLSX
            </button>
          </div>
        )}
        <section className="admin-card">
          {query.isPending ? <p role="status">Загрузка…</p> : null}
          {query.isError ? <p className="form-error">{getApiErrorMessage(query.error)}</p> : null}
          {tab === 'archive'
            ? archive.data?.items.map((item) => (
                <div className="setup-route" key={item.id}>
                  <strong>{item.displayName}</strong>
                  <div className="header-actions">
                    <button
                      className="secondary-button"
                      disabled={restore.isPending}
                      onClick={() => restore.mutate(item)}
                    >
                      Восстановить
                    </button>
                  </div>
                </div>
              ))
            : audit.data?.items.map((item) => (
                <details className="setup-route" key={item.id}>
                  <summary>
                    {new Date(item.createdAt).toLocaleString('ru-RU', { timeZone: 'UTC' })} ·{' '}
                    {item.action} · {item.user?.fullName ?? 'Система'}
                  </summary>
                  <dl className="definition-list">
                    <div>
                      <dt>Объект</dt>
                      <dd>{item.entityType ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Идентификатор</dt>
                      <dd>{item.entityId ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Сотрудник</dt>
                      <dd>{item.userId ?? '—'}</dd>
                    </div>
                  </dl>
                  {item.meta ? (
                    <pre className="audit-metadata">{JSON.stringify(item.meta, null, 2)}</pre>
                  ) : null}
                </details>
              ))}
          {query.data?.total === 0 ? <p className="empty-inline">Записей не найдено</p> : null}
          <div className="pagination">
            <button
              className="secondary-button"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              Назад
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil((query.data?.total ?? 0) / 20))}
            </span>
            <button
              className="secondary-button"
              disabled={page * 20 >= (query.data?.total ?? 0)}
              onClick={() => setPage(page + 1)}
            >
              Далее
            </button>
          </div>
        </section>
        {restore.isError || download.isError ? (
          <p className="form-error">{getApiErrorMessage(restore.error ?? download.error)}</p>
        ) : null}
      </div>
    </main>
  );
}
