import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, getApiErrorMessage } from '../lib/api';
type Schedule = {
  id: string;
  name: string;
  routeId?: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  period: string;
  earlyStartMinutes: number;
  isActive: boolean;
};
const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const empty: Schedule = {
  id: '',
  name: '',
  routeId: '',
  weekdays: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '10:00',
  period: 'morning',
  earlyStartMinutes: 0,
  isActive: true,
};

export function ScheduleEditor({
  shopId,
  timezone,
  routes,
  canEdit,
}: {
  shopId: string;
  timezone: string;
  routes: Array<{ id: string; name: string; isActive: boolean }>;
  canEdit: boolean;
}): React.JSX.Element {
  const client = useQueryClient();
  const [form, setForm] = useState<Schedule>(empty);
  const query = useQuery({
    queryKey: ['setup-schedules', shopId],
    queryFn: async () => (await api.get<Schedule[]>(`/patrol-schedules/shop/${shopId}`)).data,
  });
  const save = useMutation({
    mutationFn: async (schedule: Schedule) => {
      const body = {
        name: schedule.name,
        routeId: schedule.routeId || undefined,
        period: schedule.period,
        weekdays: schedule.weekdays,
        earlyStartMinutes: schedule.earlyStartMinutes,
        isActive: schedule.isActive,
        startTime: schedule.startTime.slice(0, 5),
        endTime: schedule.endTime.slice(0, 5),
      };
      if (schedule.id) await api.patch(`/patrol-schedules/${schedule.id}`, body);
      else await api.post('/patrol-schedules', { ...body, shopId });
    },
    onSuccess: () => {
      setForm(empty);
      void client.invalidateQueries({ queryKey: ['setup-schedules', shopId] });
    },
  });
  return (
    <section className="admin-card">
      <h2>Расписание · {timezone}</h2>
      {query.isError ? <p className="form-error">{getApiErrorMessage(query.error)}</p> : null}
      {query.data?.map((s) => (
        <div className="setup-route" key={s.id}>
          <strong>{s.name}</strong>
          <p className="admin-note">
            {s.weekdays.map((d) => days[d - 1]).join(', ')} · {s.startTime.slice(0, 5)}–
            {s.endTime.slice(0, 5)} · {s.isActive ? 'Активно' : 'Отключено'}
          </p>
          {canEdit ? (
            <div className="header-actions">
              <button className="secondary-button" onClick={() => setForm(s)}>
                Изменить
              </button>
              <button
                className="secondary-button"
                disabled={save.isPending}
                onClick={() => save.mutate({ ...s, isActive: !s.isActive })}
              >
                {s.isActive ? 'Отключить' : 'Включить'}
              </button>
            </div>
          ) : null}
        </div>
      ))}
      {query.data?.length === 0 ? (
        <p className="empty-inline">Расписания пока не настроены</p>
      ) : null}
      {canEdit ? (
        <form
          className="admin-form"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate(form);
          }}
        >
          <h2>{form.id ? 'Изменить расписание' : 'Новое расписание'}</h2>
          <label className="field">
            <span>Название</span>
            <input
              required
              maxLength={200}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Маршрут</span>
            <select
              required
              value={form.routeId}
              onChange={(e) => setForm({ ...form, routeId: e.target.value })}
            >
              <option value="">Выберите маршрут</option>
              {routes
                .filter((r) => r.isActive || r.id === form.routeId)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="field">
            <span>Период</span>
            <select
              value={form.period}
              onChange={(e) => setForm({ ...form, period: e.target.value })}
            >
              <option value="morning">Утро</option>
              <option value="noon">День</option>
              <option value="evening">Вечер</option>
            </select>
          </label>
          <div className="header-actions">
            {days.map((day, i) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={form.weekdays.includes(i + 1)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      weekdays: e.target.checked
                        ? [...form.weekdays, i + 1]
                        : form.weekdays.filter((d) => d !== i + 1),
                    })
                  }
                />
                {day}
              </label>
            ))}
          </div>
          <label className="field">
            <span>Начало</span>
            <input
              type="time"
              required
              value={form.startTime.slice(0, 5)}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Окончание</span>
            <input
              type="time"
              required
              value={form.endTime.slice(0, 5)}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Ранний старт, минут</span>
            <input
              type="number"
              required
              min={0}
              max={1440}
              value={form.earlyStartMinutes}
              onChange={(e) => setForm({ ...form, earlyStartMinutes: Number(e.target.value) })}
            />
          </label>
          <button className="primary-button" disabled={save.isPending || !form.weekdays.length}>
            Сохранить расписание
          </button>
          {form.id ? (
            <button type="button" className="secondary-button" onClick={() => setForm(empty)}>
              Отмена
            </button>
          ) : null}
        </form>
      ) : null}
      {save.isError ? <p className="form-error">{getApiErrorMessage(save.error)}</p> : null}
    </section>
  );
}
