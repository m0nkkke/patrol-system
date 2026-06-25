import { ApiError } from './errors';

const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Нет связи с сервером. Проверьте подключение.',
  ENTITY_NOT_FOUND: 'Объект не найден.',
  ROUTE_SETUP_NOT_STARTED: 'Сначала запустите настройку маршрута.',
  ROUTE_SETUP_ALREADY_COMPLETE: 'Все точки уже зарегистрированы.',
  ROUTE_POINT_OUT_OF_RANGE: 'Номер точки вне диапазона маршрута.',
  NFC_TAG_ALREADY_ASSIGNED: 'Эта метка уже привязана к другой точке.',
  NFC_TAG_NOT_ACTIVE: 'Метка не зарегистрирована или неактивна.',
  NFC_TAG_MISMATCH: 'Метка не соответствует выбранной точке.',
  PATROL_ROUTE_NOT_READY: 'Маршрут магазина ещё не готов.',
  PATROL_ROUTE_EMPTY: 'У магазина нет активных точек маршрута.',
  PATROL_NOT_IN_PROGRESS: 'Обход уже не активен.',
  MOBILE_PATROL_FORBIDDEN: 'Этот обход принадлежит другому сотруднику.',
  MOBILE_USER_SHOP_REQUIRED: 'Сотрудник не привязан к магазину.',
};

export function describeError(error: unknown): string {
  if (error instanceof ApiError && MESSAGES[error.code]) {
    return MESSAGES[error.code];
  }
  return 'Произошла ошибка. Попробуйте ещё раз.';
}
