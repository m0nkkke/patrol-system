import { ApiError } from './errors';

const MESSAGES: Record<string, string> = {
  NETWORK_ERROR: 'Нет связи с сервером. Проверьте подключение.',
  ENTITY_NOT_FOUND: 'Объект не найден.',
  ROUTE_SETUP_NOT_STARTED: 'Сначала запустите настройку маршрута.',
  ROUTE_SETUP_ALREADY_COMPLETE: 'Все точки уже зарегистрированы.',
  ROUTE_POINT_OUT_OF_RANGE: 'Номер точки вне диапазона маршрута.',
  NFC_TAG_ALREADY_ASSIGNED: 'Эта метка уже привязана к другой точке.',
  NFC_UID_ALREADY_REGISTERED: 'Эта NFC-метка уже зарегистрирована в системе.',
  NFC_UID_INVALID: 'Не удалось прочитать UID NFC-метки. Отсканируйте её повторно.',
  NFC_TAG_NOT_ACTIVE: 'Метка не зарегистрирована или неактивна.',
  NFC_TAG_MISMATCH: 'Метка не соответствует выбранной точке.',
  PATROL_ROUTE_NOT_READY: 'Маршрут магазина ещё не готов.',
  PATROL_ROUTE_EMPTY: 'У магазина нет активных точек маршрута.',
  PATROL_ROUTE_INACTIVE: 'Выбранный маршрут отключён и недоступен для новых обходов.',
  PATROL_ROUTE_IN_ACTIVE_SCHEDULE:
    'Сначала отключите все активные расписания, использующие этот маршрут.',
  PATROL_ROUTE_SNAPSHOT_UNAVAILABLE: 'Для этого обхода недоступен сохранённый маршрут.',
  PATROL_NOT_IN_PROGRESS: 'Обход уже не активен.',
  PATROL_INCOMPLETE: 'Сначала отметьте все точки маршрута.',
  PATROL_CANNOT_BE_CANCELLED: 'Этот обход нельзя отменить.',
  PATROL_POINT_WRONG_SHOP: 'Точка принадлежит другому магазину.',
  PATROL_POINT_NOT_FOUND: 'Контрольная точка не найдена.',
  PATROL_POINT_NOT_IN_ROUTE: 'Эта точка не входит в маршрут текущего обхода.',
  PATROL_POINT_FORBIDDEN: 'Нет прав на управление этой контрольной точкой.',
  PATROL_POINT_ALREADY_ARCHIVED: 'Контрольная точка уже находится в архиве.',
  PATROL_POINT_NOT_ARCHIVED: 'Контрольная точка не находится в архиве.',
  PATROL_POINT_IN_ACTIVE_ROUTE: 'Сначала удалите контрольную точку из активных маршрутов.',
  PATROL_SCHEDULE_OUTSIDE_WINDOW: 'Сейчас не время для этого расписания.',
  PATROL_SCHEDULE_INACTIVE: 'Расписание отключено.',
  PATROL_SCHEDULE_WRONG_SHOP: 'Расписание принадлежит другому магазину.',
  PATROL_SCHEDULE_DUE_AT_MANAGED: 'Срок завершения задаётся сервером.',
  PATROL_SCHEDULE_INVALID_WINDOW: 'Время окончания должно быть позже начала.',
  PATROL_SCHEDULE_OVERLAP: 'Расписание пересекается с другим в эти дни и часы.',
  PATROL_SCHEDULE_WINDOW_OPEN:
    'Нельзя изменить расписание или часовой пояс, пока открыто окно обхода. Повторите после его окончания.',
  PATROL_SCHEDULE_FORBIDDEN: 'Нет прав на управление расписаниями этого магазина.',
  PATROL_SCHEDULE_ALREADY_STARTED: 'Этот обход уже выполнен.',
  PATROL_LATE_START_REASON_REQUIRED: 'Укажите причину позднего начала обхода.',
  NFC_REPLACEMENT_SAME_UID: 'Новая метка совпадает с текущей.',
  SHOP_EXTERNAL_ID_TAKEN: 'Магазин с таким ID уже существует.',
  USER_SELF_DELETE_FORBIDDEN: 'Нельзя удалить собственную учётную запись.',
  USER_LAST_ACTIVE_ADMIN: 'Нельзя удалить последнего активного администратора.',
  MOBILE_PATROL_FORBIDDEN: 'Этот обход принадлежит другому сотруднику.',
  MOBILE_ACTIVE_PATROL_REQUIRED: 'Сначала начните обход в выбранном магазине.',
  MOBILE_USER_SHOP_REQUIRED: 'Сотрудник не привязан к магазину.',
  PATROL_REPORT_FORBIDDEN: 'Нельзя создать отчёт для этого магазина.',
  PATROL_REPORT_PATROL_FORBIDDEN: 'Нельзя связать отчёт с выбранным обходом.',
  PATROL_REPORT_NOT_DRAFT: 'Этот отчёт уже не является черновиком.',
  PATROL_REPORT_ALREADY_SUBMITTED: 'Отправленный отчёт нельзя отменить.',
  FILE_REQUIRED: 'Выберите фотографию для загрузки.',
  ANONYMOUS_APPEAL_FORBIDDEN: 'Нельзя отправить обращение для этого магазина.',
  CONTROL_STAFF_FORBIDDEN: 'Нет доступа к данным этого сотрудника.',
  FORBIDDEN: 'Недостаточно прав для этого действия.',
  INTERNAL_SERVER_ERROR: 'Ошибка на сервере. Попробуйте позже.',
};

export function describeError(error: unknown): string {
  if (error instanceof ApiError && MESSAGES[error.code]) {
    return MESSAGES[error.code];
  }
  return 'Произошла ошибка. Попробуйте ещё раз.';
}
