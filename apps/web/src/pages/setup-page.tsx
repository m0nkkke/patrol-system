import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { ScheduleEditor } from '../components/schedule-editor';
import { ShopEditor } from '../components/shop-editor';
import { api, getApiErrorMessage } from '../lib/api';
import type { PaginatedResponse, Shop } from '../types/api';

type Point = { id: string; name: string };
type RoutePoint = { patrolPointId: string; sortOrder: number; dwellSeconds: number };
type Route = {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
  points: RoutePoint[];
};
type Version = {
  id: string;
  version: number;
  createdAt: string;
  actorFullName?: string;
  snapshot: { name: string; isActive: boolean; points: RoutePoint[] };
};

export function SetupPage(): React.JSX.Element {
  const { profile } = useAuth();
  const [shopId, setShopId] = useState('');
  const shops = useQuery({
    queryKey: ['setup-shops'],
    queryFn: async () => {
      const items: Shop[] = [];
      for (let page = 1; ; page++) {
        const { data } = await api.get<PaginatedResponse<Shop>>('/shops', {
          params: { page, limit: 100, sort: 'name:asc' },
        });
        items.push(...data.items);
        if (items.length >= data.total || !data.items.length) return items;
      }
    },
  });
  const shop = shops.data?.find((s) => s.id === shopId);
  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Конфигурация объектов</p>
          <h1>Маршруты и графики</h1>
        </div>
      </header>
      <div className="admin-content">
        <label className="filter-field">
          <span>Магазин</span>
          <select value={shopId} onChange={(e) => setShopId(e.target.value)}>
            <option value="">Выберите магазин</option>
            {shops.data?.map((s) => (
              <option value={s.id} key={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {shops.isError ? <p className="form-error">{getApiErrorMessage(shops.error)}</p> : null}
        {profile?.role === 'admin' ? (
          <>
            <button className="secondary-button" onClick={() => setShopId('')}>
              Новый магазин
            </button>
            <ShopEditor key={shop?.id ?? 'new'} shop={shop} onSaved={setShopId} />
          </>
        ) : null}
        {shop ? (
          <ShopSetup key={shopId} shop={shop} canEdit={profile?.role !== 'inspector'} />
        ) : (
          <p className="admin-note">
            Выберите объект, чтобы посмотреть точки, порядок обхода и расписание.
          </p>
        )}
      </div>
    </main>
  );
}

function ShopSetup({ shop, canEdit }: { shop: Shop; canEdit: boolean }): React.JSX.Element {
  const client = useQueryClient();
  const [routeId, setRouteId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('internal');
  const [selected, setSelected] = useState<RoutePoint[]>([]);
  const [historyId, setHistoryId] = useState('');
  const [pointName, setPointName] = useState('');
  const [uid, setUid] = useState('');
  const points = useQuery({
    queryKey: ['setup-points', shop.id],
    queryFn: async () => (await api.get<Point[]>(`/patrol-points/shop/${shop.id}`)).data,
  });
  const routes = useQuery({
    queryKey: ['setup-routes', shop.id],
    queryFn: async () => (await api.get<Route[]>(`/patrol-routes/shop/${shop.id}`)).data,
  });
  const versions = useQuery({
    queryKey: ['route-versions', historyId],
    enabled: !!historyId,
    queryFn: async () => (await api.get<Version[]>(`/patrol-routes/${historyId}/versions`)).data,
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['setup-routes', shop.id] });
    void client.invalidateQueries({ queryKey: ['route-versions'] });
    void client.invalidateQueries({ queryKey: ['shops'] });
  };
  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name,
        category,
        patrolPointIds: selected.map((p) => p.patrolPointId),
        pointSettings: selected.map(({ patrolPointId, dwellSeconds }) => ({
          patrolPointId,
          dwellSeconds,
        })),
      };
      if (routeId) await api.patch(`/patrol-routes/${routeId}`, body);
      else await api.post('/patrol-routes', { ...body, shopId: shop.id });
    },
    onSuccess: () => {
      refresh();
      setRouteId('');
      setName('');
      setSelected([]);
    },
  });
  const toggle = useMutation({
    mutationFn: async (route: Route) => {
      await api.patch(`/patrol-routes/${route.id}`, { isActive: !route.isActive });
    },
    onSuccess: refresh,
  });
  const addPoint = useMutation({
    mutationFn: async () => {
      await api.post('/patrol-points/with-nfc', {
        name: pointName.trim(),
        uid: uid.trim(),
        shopId: shop.id,
      });
    },
    onSuccess: () => {
      setPointName('');
      setUid('');
      void client.invalidateQueries({ queryKey: ['setup-points', shop.id] });
    },
  });
  const move = (index: number, direction: number) =>
    setSelected((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction]!, next[index]!];
      return next;
    });
  return (
    <>
      <p className="admin-note">
        Время расписаний: {shop.timezone}. Изменения маршрутов сохраняются в истории версий.
      </p>
      <div className="admin-grid">
        <section className="admin-card">
          <h2>Маршруты магазина</h2>
          {routes.isError ? <p className="form-error">{getApiErrorMessage(routes.error)}</p> : null}
          {routes.data?.map((route) => (
            <div className="setup-route" key={route.id}>
              <div>
                <strong>{route.name}</strong>
                <p className="admin-note">
                  {route.category === 'internal' ? 'Внутренний' : 'Внешний'} · {route.points.length}{' '}
                  точек · {route.isActive ? 'Активен' : 'Отключён'}
                </p>
              </div>
              <div className="header-actions">
                <button className="secondary-button" onClick={() => setHistoryId(route.id)}>
                  История
                </button>
                {canEdit ? (
                  <>
                    <button
                      className="secondary-button"
                      onClick={() => {
                        setRouteId(route.id);
                        setName(route.name);
                        setCategory(route.category);
                        setSelected([...route.points].sort((a, b) => a.sortOrder - b.sortOrder));
                      }}
                    >
                      Редактировать
                    </button>
                    <button
                      className="secondary-button"
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate(route)}
                    >
                      {route.isActive ? 'Отключить' : 'Включить'}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ))}
          {routes.data?.length === 0 ? <p className="empty-inline">Маршрутов пока нет</p> : null}
          {toggle.isError ? <p className="form-error">{getApiErrorMessage(toggle.error)}</p> : null}
          {historyId ? (
            <section>
              <h2>История версий</h2>
              {versions.isPending ? <p>Загрузка…</p> : null}
              {versions.isError ? (
                <p className="form-error">{getApiErrorMessage(versions.error)}</p>
              ) : null}
              {versions.data?.map((v) => (
                <details key={v.id} className="setup-route">
                  <summary>
                    Версия {v.version} ·{' '}
                    {new Date(v.createdAt).toLocaleString('ru-RU', { timeZone: shop.timezone })} ·{' '}
                    {v.actorFullName ?? 'Автор не указан'}
                  </summary>
                  <p>
                    {v.snapshot.name} · {v.snapshot.isActive ? 'Активен' : 'Архив'}
                  </p>
                  <ol>
                    {[...v.snapshot.points]
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((p) => (
                        <li key={p.patrolPointId}>
                          {points.data?.find((item) => item.id === p.patrolPointId)?.name ??
                            p.patrolPointId}{' '}
                          — {p.dwellSeconds} сек.
                        </li>
                      ))}
                  </ol>
                </details>
              ))}
            </section>
          ) : null}
        </section>
        {canEdit ? (
          <section className="admin-card">
            <h2>{routeId ? 'Изменить маршрут' : 'Новый маршрут'}</h2>
            <form
              className="admin-form"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <label className="field">
                <span>Название маршрута</span>
                <input
                  required
                  minLength={2}
                  maxLength={200}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="field">
                <span>Категория</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  <option value="internal">Внутренний</option>
                  <option value="external">Внешний</option>
                </select>
              </label>
              <label className="field">
                <span>Добавить точку</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value)
                      setSelected([
                        ...selected,
                        {
                          patrolPointId: e.target.value,
                          dwellSeconds: 90,
                          sortOrder: selected.length,
                        },
                      ]);
                  }}
                >
                  <option value="">Выберите точку</option>
                  {points.data
                    ?.filter((p) => !selected.some((s) => s.patrolPointId === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              {selected.map((p, index) => (
                <div className="route-point-editor" key={p.patrolPointId}>
                  <strong>
                    {index + 1}.{' '}
                    {points.data?.find((item) => item.id === p.patrolPointId)?.name ?? 'Точка'}
                  </strong>
                  <label className="field">
                    <span>Выдержка, сек.</span>
                    <input
                      type="number"
                      required
                      min={0}
                      max={120}
                      value={p.dwellSeconds}
                      onChange={(e) =>
                        setSelected(
                          selected.map((item) =>
                            item === p ? { ...item, dwellSeconds: Number(e.target.value) } : item,
                          ),
                        )
                      }
                    />
                  </label>
                  <div className="header-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      aria-label="Переместить выше"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      aria-label="Переместить ниже"
                      disabled={index === selected.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setSelected(selected.filter((item) => item !== p))}
                    >
                      Убрать
                    </button>
                  </div>
                </div>
              ))}
              <p className="admin-note">
                Два NFC-сканирования обязательны и при выдержке 0 секунд.
              </p>
              {save.isError ? <p className="form-error">{getApiErrorMessage(save.error)}</p> : null}
              <button className="primary-button" disabled={save.isPending || !selected.length}>
                Сохранить маршрут
              </button>
              {routeId ? (
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setRouteId('');
                    setName('');
                    setSelected([]);
                  }}
                >
                  Отмена
                </button>
              ) : null}
            </form>
          </section>
        ) : null}
      </div>
      {canEdit ? (
        <section className="admin-card">
          <h2>Регистрация точки с NFC</h2>
          <form
            className="admin-form"
            onSubmit={(e) => {
              e.preventDefault();
              addPoint.mutate();
            }}
          >
            <label className="field">
              <span>Название точки</span>
              <input
                required
                minLength={2}
                maxLength={200}
                value={pointName}
                onChange={(e) => setPointName(e.target.value)}
              />
            </label>
            <label className="field">
              <span>UID метки со считывателя</span>
              <input
                required
                minLength={4}
                maxLength={32}
                value={uid}
                onChange={(e) => setUid(e.target.value)}
              />
            </label>
            <p className="admin-note">
              Введите UID со считывателя. Для сканирования телефоном используйте мобильное
              приложение.
            </p>
            {addPoint.isError ? (
              <p className="form-error">{getApiErrorMessage(addPoint.error)}</p>
            ) : null}
            <button className="primary-button" disabled={addPoint.isPending}>
              Создать точку и привязать NFC
            </button>
          </form>
        </section>
      ) : null}
      <ScheduleEditor
        shopId={shop.id}
        timezone={shop.timezone}
        routes={routes.data ?? []}
        canEdit={canEdit}
      />
    </>
  );
}
