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
  PATROL_INCOMPLETE: 'Сначала отметьте все точки маршрута.',
  PATROL_CANNOT_BE_CANCELLED: 'Этот обход нельзя отменить.',
  PATROL_POINT_WRONG_SHOP: 'Точка принадлежит другому магазину.',
  PATROL_SCHEDULE_OUTSIDE_WINDOW: 'Сейчас не время для этого расписания.',
  PATROL_SCHEDULE_INACTIVE: 'Расписание отключено.',
  PATROL_SCHEDULE_WRONG_SHOP: 'Расписание принадлежит другому магазину.',
  PATROL_SCHEDULE_DUE_AT_MANAGED: 'Срок завершения задаётся сервером.',
  PATROL_SCHEDULE_INVALID_WINDOW: 'Время окончания должно быть позже начала.',
  PATROL_SCHEDULE_OVERLAP: 'Расписание пересекается с другим в эти дни и часы.',
  PATROL_SCHEDULE_FORBIDDEN: 'Нет прав на управление расписаниями этого магазина.',
  PATROL_SCHEDULE_ALREADY_STARTED: 'Этот обход уже выполнен.',
  NFC_REPLACEMENT_SAME_UID: 'Новая метка совпадает с текущей.',
  SHOP_EXTERNAL_ID_TAKEN: 'Магазин с таким ID уже существует.',
  MOBILE_PATROL_FORBIDDEN: 'Этот обход принадлежит другому сотруднику.',
  MOBILE_USER_SHOP_REQUIRED: 'Сотрудник не привязан к магазину.',
  FORBIDDEN: 'Недостаточно прав для этого действия.',
  INTERNAL_SERVER_ERROR: 'Ошибка на сервере. Попробуйте позже.',
};

export function describeError(error: unknown): string {
  if (error instanceof ApiError && MESSAGES[error.code]) {
    return MESSAGES[error.code];
  }
  return 'Произошла ошибка. Попробуйте ещё раз.';
}
