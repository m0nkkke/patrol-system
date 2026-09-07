import { useQuery } from '@tanstack/react-query';
import type { PlanFactResponse } from '@patrol/shared';
import { api, getApiErrorMessage } from '../lib/api';

export function PlanFactPanel({ params }: {
  params: { from: string; to: string; shopId?: string };
}): React.JSX.Element {
  const query = useQuery({
    queryKey: ['management-plan-fact', params],
    queryFn: async () => (await api.get<PlanFactResponse>('/management/plan-fact', { params })).data,
  });
  const report = query.data;
  return <section className="management-section" aria-label="План-факт обходов">
    <header className="section-header"><h2>План-факт обходов</h2></header>
    {query.isLoading ? <p role="status">Загрузка плана…</p> : null}
    {query.isError ? <p role="alert">{getApiErrorMessage(query.error)}</p> : null}
    {report === undefined ? null : <>
      <p><strong>{report.totals.completed} из {report.totals.planned}</strong> — {percent(report.totals.completionRate)} выполнено по расписанию.</p>
      <p>Начаты, но не завершены: {report.totals.unfinished}. Пропущены без старта: {report.totals.missed}. Ожидают старта (срок ещё не истёк): {report.totals.upcoming}. Внеплановые обходы: {report.unscheduledPatrols}.</p>
      {report.partialHistory ? <p role="status">История плана доступна с {new Date(report.coverageStartedAt).toLocaleString('ru-RU', { timeZone: 'UTC' })} UTC. Более ранние окна не включены в расчёт.</p> : null}
      <div className="management-table-wrap"><table className="management-table">
        <thead><tr><th>Магазин</th><th>План</th><th>Завершены</th><th>Не завершены</th><th>Пропущены</th><th>Ожидают старта</th><th>Выполнение плана</th></tr></thead>
        <tbody>{report.shops.map((shop) => <tr key={shop.shopId}>
          <td>{shop.shopName}</td><td>{shop.planned}</td><td>{shop.completed}</td><td>{shop.unfinished}</td><td>{shop.missed}</td><td>{shop.upcoming}</td><td>{percent(shop.completionRate)}</td>
        </tr>)}</tbody>
      </table>{report.shops.length === 0 ? <p className="empty-inline">В доступной истории за этот период нет плановых обходов</p> : null}</div>
    </>}
  </section>;
}

function percent(value: number | null): string {
  return value === null ? '—' : `${(value * 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 })}%`;
}
