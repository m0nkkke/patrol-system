import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useAuth } from '../auth/auth-context';
import { api, getApiErrorMessage } from '../lib/api';
import type { PaginatedResponse, Shop, UserRole } from '../types/api';

type Staff = { id: string; fullName: string; role: UserRole; isActive: boolean; shops: Shop[] };
const roles: Record<UserRole, string> = {
  security_guard: 'Сотрудник контроля',
  inspector: 'Проверяющий',
  admin: 'Администратор',
  route_setter: 'Настройщик',
  local_route_setter: 'Локальный настройщик',
};

export function UsersPage(): React.JSX.Element {
  const { profile } = useAuth();
  const admin = profile?.role === 'admin';
  const client = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('security_guard');
  const [shopIds, setShopIds] = useState<string[]>([]);
  const [credential, setCredential] = useState<string | null>(null);
  const staff = useQuery({
    queryKey: ['staff', search, page],
    queryFn: async () =>
      (
        await api.get<PaginatedResponse<Staff>>('/control/staff', {
          params: { search: search || undefined, page, limit: 20, sort: 'fullName:asc' },
        })
      ).data,
  });
  const shops = useQuery({
    queryKey: ['shops', 'staff-assignments'],
    queryFn: async () => {
      const result: Shop[] = [];
      let nextPage = 1;
      for (;;) {
        const { data } = await api.get<PaginatedResponse<Shop>>('/shops', {
          params: { page: nextPage++, limit: 100, sort: 'name:asc' },
        });
        result.push(...data.items);
        if (result.length >= data.total || data.items.length === 0) return result;
      }
    },
  });
  const reset = () => {
    setEditing(null);
    setFullName('');
    setRole('security_guard');
    setShopIds([]);
    setCredential(null);
  };
  const save = useMutation({
    mutationFn: async () => {
      const body = { fullName: fullName.trim(), shopIds, ...(admin ? { role } : {}) };
      return editing
        ? (await api.patch<{ accessKey?: string }>(`/users/${editing.id}`, body)).data
        : (await api.post<{ accessKey?: string }>(admin ? '/users' : '/control/staff', body)).data;
    },
    onSuccess: (data) => {
      reset();
      setCredential(data.accessKey ?? null);
      void client.invalidateQueries({ queryKey: ['staff'] });
    },
  });
  const action = useMutation({
    mutationFn: async ({ user, rotate }: { user: Staff; rotate?: boolean }) => {
      if (rotate)
        return (await api.post<{ accessKey?: string }>(`/users/${user.id}/access-key/rotate`)).data;
      await api.patch(`/users/${user.id}`, { isActive: !user.isActive });
      return {};
    },
    onSuccess: (data) => {
      setCredential(data.accessKey ?? null);
      void client.invalidateQueries({ queryKey: ['staff'] });
    },
  });
  return (
    <main className="workspace">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Команда и доступ</p>
          <h1>Сотрудники</h1>
        </div>
        <span className="header-count">{staff.data?.total ?? 0} сотрудников</span>
      </header>
      <div className="admin-content">
        <label className="filter-field">
          <span>Поиск сотрудника</span>
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Фамилия, имя"
          />
        </label>
        <div className="admin-grid">
          <section className="admin-card">
            <h2>Команда</h2>
            {staff.isPending ? <p role="status">Загрузка сотрудников…</p> : null}
            {staff.isError ? (
              <p role="alert" className="form-error">
                {getApiErrorMessage(staff.error)}
              </p>
            ) : null}
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Сотрудник</th>
                    <th>Магазины</th>
                    <th>Доступ</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {staff.data?.items.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.fullName}</strong>
                        <div className="admin-note">{roles[user.role]}</div>
                      </td>
                      <td>{user.shops.map((s) => s.name).join(', ') || 'Не назначены'}</td>
                      <td>
                        <span
                          className={`status-badge status-badge--${user.isActive ? 'completed' : 'cancelled'}`}
                        >
                          {user.isActive ? 'Активен' : 'Заблокирован'}
                        </span>
                      </td>
                      <td>
                        <div className="header-actions">
                          <button
                            className="text-link"
                            onClick={() =>
                              void navigate({ to: '/patrols', search: { staff: user.id } })
                            }
                          >
                            Обходы
                          </button>
                          {admin ? (
                            <>
                              <button
                                className="secondary-button"
                                onClick={() => {
                                  setEditing(user);
                                  setFullName(user.fullName);
                                  setRole(user.role);
                                  setShopIds(user.shops.map((s) => s.id));
                                  setCredential(null);
                                }}
                              >
                                Изменить
                              </button>
                              <button
                                className="secondary-button"
                                disabled={action.isPending || user.id === profile?.id}
                                onClick={() => action.mutate({ user })}
                              >
                                {user.isActive ? 'Заблокировать' : 'Разблокировать'}
                              </button>
                              <button
                                className="secondary-button"
                                disabled={action.isPending || user.id === profile?.id}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `Заменить ключ для ${user.fullName}? Текущие сессии сотрудника будут завершены.`,
                                    )
                                  )
                                    action.mutate({ user, rotate: true });
                                }}
                              >
                                Новый ключ
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {staff.data?.total === 0 ? <p className="empty-inline">Сотрудники не найдены</p> : null}
            <div className="pagination">
              <button
                className="secondary-button"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Назад
              </button>
              <span>
                {page} / {Math.max(1, Math.ceil((staff.data?.total ?? 0) / 20))}
              </span>
              <button
                className="secondary-button"
                disabled={page * 20 >= (staff.data?.total ?? 0)}
                onClick={() => setPage(page + 1)}
              >
                Далее
              </button>
            </div>
            {action.isError ? (
              <p className="form-error" role="alert">
                {getApiErrorMessage(action.error)}
              </p>
            ) : null}
          </section>
          <section className="admin-card">
            <h2>
              {editing
                ? 'Редактирование сотрудника'
                : admin
                  ? 'Новый сотрудник'
                  : 'Добавить сотрудника контроля'}
            </h2>
            <form
              className="admin-form"
              onSubmit={(e) => {
                e.preventDefault();
                save.mutate();
              }}
            >
              <label className="field">
                <span>ФИО</span>
                <input
                  required
                  minLength={2}
                  maxLength={200}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
              {admin ? (
                <label className="field">
                  <span>Роль</span>
                  <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                    {Object.entries(roles).map(([value, label]) => (
                      <option value={value} key={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <fieldset>
                <legend>Назначенные магазины</legend>
                <div className="checkbox-list">
                  {shops.data?.map((s) => (
                    <label key={s.id}>
                      <input
                        type="checkbox"
                        checked={shopIds.includes(s.id)}
                        onChange={(e) =>
                          setShopIds(
                            e.target.checked
                              ? [...shopIds, s.id]
                              : shopIds.filter((id) => id !== s.id),
                          )
                        }
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </fieldset>
              {shops.isError ? <p className="form-error">Не удалось загрузить магазины</p> : null}
              {save.isError ? (
                <p className="form-error" role="alert">
                  {getApiErrorMessage(save.error)}
                </p>
              ) : null}
              <button
                className="primary-button"
                disabled={
                  save.isPending ||
                  shops.isPending ||
                  shops.isError ||
                  (!admin && shopIds.length === 0)
                }
              >
                {save.isPending
                  ? 'Сохранение…'
                  : editing
                    ? 'Сохранить изменения'
                    : 'Создать сотрудника'}
              </button>
              {editing ? (
                <button type="button" className="secondary-button" onClick={reset}>
                  Отмена
                </button>
              ) : null}
            </form>
            {credential ? (
              <div className="access-key" role="status">
                Ключ доступа сотрудника<code>{credential}</code>
                <p>Передайте ключ сотруднику лично.</p>
                <button className="secondary-button" onClick={() => setCredential(null)}>
                  Скрыть ключ
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
