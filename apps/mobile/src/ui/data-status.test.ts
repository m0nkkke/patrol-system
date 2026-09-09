import { resolveDataStatus } from './data-status';

describe('resolveDataStatus', () => {
  it('prioritizes the offline state over a pending refresh', () => {
    expect(
      resolveDataStatus({
        hasRefreshError: false,
        isRefreshing: true,
        networkStatus: 'offline',
      }),
    ).toEqual({ kind: 'offline', label: 'Нет сети — показаны сохранённые данные' });
  });

  it('reports refresh and refresh errors while online', () => {
    expect(
      resolveDataStatus({
        hasRefreshError: false,
        isRefreshing: true,
        networkStatus: 'online',
      }).kind,
    ).toBe('refreshing');
    expect(
      resolveDataStatus({
        hasRefreshError: true,
        isRefreshing: false,
        networkStatus: 'online',
      }).kind,
    ).toBe('error');
  });

  it('does not claim freshness while connectivity is unknown', () => {
    expect(
      resolveDataStatus({
        hasRefreshError: false,
        isRefreshing: false,
        networkStatus: 'unknown',
      }).kind,
    ).toBe('checking');
  });

  it('reports current data only after connectivity is confirmed', () => {
    expect(
      resolveDataStatus({
        hasRefreshError: false,
        isRefreshing: false,
        networkStatus: 'online',
      }).kind,
    ).toBe('current');
  });
});
