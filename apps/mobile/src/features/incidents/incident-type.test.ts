import type { ControlIncident } from '@/api/control-incidents.api';

import { controlIncidentDescription, incidentTypeLabel } from './incident-type';

describe('controlIncidentDescription', () => {
  it('uses a Russian description instead of the backend message', () => {
    const incident = createIncident({
      actualSeconds: 20,
      expectedSeconds: 60,
      message: 'Short interval',
      type: 'short_interval',
    });

    expect(controlIncidentDescription(incident)).toBe(
      'Слишком короткий интервал между точками: 20 сек при нормативе 1 мин.',
    );
  });

  it('includes point names for a missed point', () => {
    const incident = createIncident({
      fromPatrolPoint: { id: 'point-1', name: 'Склад', sortOrder: 1 },
      toPatrolPoint: { id: 'point-3', name: 'Касса', sortOrder: 3 },
      type: 'missed_point',
    });

    expect(controlIncidentDescription(incident)).toContain('«Склад»');
    expect(controlIncidentDescription(incident)).toContain('«Касса»');
    expect(incidentTypeLabel(incident.type)).toBe('Пропуск точки');
  });

  it('describes an embedded patrol incident without point details in Russian', () => {
    expect(
      controlIncidentDescription({
        actualSeconds: null,
        expectedSeconds: null,
        message: 'Missed patrol point',
        type: 'missed_point',
      }),
    ).toBe('Обнаружена попытка пропустить контрольную точку маршрута.');
  });
});

function createIncident(overrides: Partial<ControlIncident>): ControlIncident {
  return {
    actualSeconds: null,
    createdAt: '2026-09-05T10:00:00.000Z',
    employee: { fullName: 'Иван Петров', id: 'employee-1' },
    expectedSeconds: null,
    fromPatrolPoint: null,
    id: 'incident-1',
    message: 'Backend message',
    patrol: {
      completedAt: null,
      dueAt: null,
      id: 'patrol-1',
      period: null,
      routeCategory: null,
      routeId: null,
      routeName: null,
      scheduleId: null,
      startedAt: null,
      status: 'completed',
    },
    patrolEvent: null,
    severity: 'warning',
    shop: { id: 'shop-1', name: 'Магазин' },
    toPatrolPoint: null,
    type: 'short_interval',
    ...overrides,
  };
}
