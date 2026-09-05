# Mobile API

Модуль `mobile` предоставляет контракт для Android-приложения. Он не заменяет общие backend-модули, а даёт мобильному клиенту удобные сценарные endpoints.

Все endpoints модуля требуют `Authorization: Bearer <accessToken>`.

## Эндпоинты

- `GET /api/v1/mobile/me` — возвращает текущего пользователя и доступные мобильные действия.
- `POST /api/v1/mobile/shops/:shopId/route-setup/start` — начинает настройку маршрута магазина.
- `GET /api/v1/mobile/shops/:shopId/route-setup` — возвращает состояние настройки маршрута.
- `POST /api/v1/mobile/shops/:shopId/route-setup/scan` — привязывает отсканированный NFC UID к следующей незарегистрированной точке маршрута.
- `GET /api/v1/mobile/shops` — возвращает активные магазины, назначенные текущему СК.
- `GET /api/v1/mobile/shops/:shopId/route` — возвращает маршрут выбранного назначенного магазина.
- `GET /api/v1/mobile/shops/:shopId/patrol-schedules/available` — возвращает доступные расписания выбранного назначенного магазина.
- `GET /api/v1/mobile/route` — возвращает активные точки маршрута магазина текущего обходчика.
- `GET /api/v1/mobile/patrols/active` — возвращает текущий активный обход сотрудника или `null`.
- `POST /api/v1/mobile/patrols/start` — стартует обход для текущего сотрудника и явно выбранного магазина.
- `POST /api/v1/mobile/patrols/:id/events` — записывает одиночное NFC-событие онлайн.
- `POST /api/v1/mobile/patrols/:id/missed-point-attempts` — фиксирует попытку сотрудника отсканировать точку не по порядку маршрута.
- `POST /api/v1/mobile/patrols/:id/events/sync` — синхронизирует пачку NFC-событий, накопленных офлайн.
- `POST /api/v1/mobile/reports` — создает черновик операционного отчета СК.
- `POST /api/v1/mobile/reports/:id/files` — прикрепляет фото к черновику отчета.
- `POST /api/v1/mobile/reports/:id/submit` — отправляет отчет в службу контроля.
- `POST /api/v1/mobile/reports/:id/cancel` — отменяет черновик отчета.
- `POST /api/v1/mobile/anonymous` — отправляет бизнес-анонимное обращение СК по выбранному назначенному магазину.

## Роли

- `admin`, `route_setter` и `local_route_setter` могут настраивать маршруты и регистрировать NFC-метки через мобильное приложение.
- `security_guard` может получать маршрут, стартовать обход и отправлять NFC-события.
- `security_guard` может создавать и отправлять операционные отчеты по назначенным магазинам.
- `security_guard` может отправлять anonymous appeal по назначенному магазину; автор не раскрывается в рабочем представлении.

## Регистрация маршрута с телефона

1. Пользователь входит через `POST /api/v1/auth/login`.
2. Приложение вызывает `GET /api/v1/mobile/me` и проверяет `capabilities.canRegisterRoutes`.
3. Настройщик запускает маршрут через `POST /api/v1/mobile/shops/:shopId/route-setup/start`.
4. Приложение показывает следующую точку из `nextSortOrder`.
5. После сканирования NFC приложение отправляет UID в `POST /api/v1/mobile/shops/:shopId/route-setup/scan`.
6. Backend сам выбирает следующую незарегистрированную точку и привязывает к ней UID.
7. После последней точки магазин получает `route_status = ready`.

## Правила

- Мобильное приложение не прошивает NFC-чипы и не пишет payload.
- В запросе `scan` передаётся аппаратный UID, считанный с метки.
- UID нормализуется в нижний регистр на backend.
- Если маршрут не был начат, `scan` возвращает доменную ошибку `ROUTE_SETUP_NOT_STARTED`.
- Если все точки уже зарегистрированы, `scan` возвращает `ROUTE_SETUP_ALREADY_COMPLETE`.
- Одна активная NFC-метка не может быть привязана к двум активным точкам.
- СК после входа выбирает магазин из `GET /api/v1/mobile/shops`.
- Для сценариев СК mobile-клиент должен использовать endpoints с явным `shopId`: `GET /api/v1/mobile/shops/:shopId/route` и `GET /api/v1/mobile/shops/:shopId/patrol-schedules/available`.
- При старте обхода mobile-клиент передаёт `shopId`; backend проверяет, что магазин назначен текущему пользователю.
- Точки маршрута могут содержать `photoFileId`; изображение загружается через защищенный `GET /api/v1/files/:id`.
- Доступные расписания возвращают `period` (`morning`, `noon`, `evening`) и `earlyStartMinutes`; расписание считается доступным с `startTime - earlyStartMinutes` до `endTime`.
- При старте обхода mobile-клиент может передать `routeId`; если выбранное расписание уже привязано к маршруту, backend использует маршрут расписания.
- Мобильное приложение не передаёт `employeeId` при старте обхода: backend использует текущего пользователя из JWT.
- Событие обхода можно отправить только в обход текущего пользователя.
- Для офлайн-синхронизации каждое событие содержит `localId` — UUID, созданный на устройстве.
- Повторная отправка того же `localId` возвращает уже созданный `serverId` и не создаёт дубль.

## Попытка пропуска точки

Мобильное приложение не отмечает точку, если сотрудник сканирует ее не по порядку. Вместо этого оно показывает подсказку вернуться к текущей точке маршрута и отправляет backend отдельный отчет:

```http
POST /api/v1/mobile/patrols/00000000-0000-4000-8000-000000000000/missed-point-attempts
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "clientLocalId": "33333333-3333-4333-8333-333333333333",
  "expectedPatrolPointId": "11111111-1111-4111-8111-111111111111",
  "attemptedPatrolPointId": "22222222-2222-4222-8222-222222222222",
  "nfcUid": "04a1b2c3d4e5f6",
  "scannedAt": "2026-06-19T10:00:00.000Z",
  "deviceId": "android-device-01"
}
```

Ответ: `204 No Content`. `clientLocalId` обязателен и должен оставаться неизменным при повторной
отправке. Дубль в рамках того же обхода также возвращает `204`, не создавая второй инцидент и
повторное push-уведомление.

Backend проверяет, что обход принадлежит текущему сотруднику и обе точки принадлежат магазину
обхода. Новая попытка принимается для `in_progress`, `overdue`, `completed` и `cancelled`: последние
два статуса нужны для поздней доставки накопленной offline-очереди. Для `pending` возвращается
`PATROL_NOT_IN_PROGRESS`. Если `attemptedPatrolPoint.sortOrder > expectedPatrolPoint.sortOrder`,
создается инцидент `missed_point` без создания `patrol_event`.

Mobile должен удалить запись попытки из локальной очереди после любого `204`, включая ответ после
завершения или отмены обхода.

Инцидент отправляет push-уведомление менеджерам магазина через общий механизм уведомлений об инцидентах.

## Пример `scan`

```http
POST /api/v1/mobile/shops/00000000-0000-4000-8000-000000000000/route-setup/scan
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "uid": "04a1b2c3d4e5f6",
  "name": "Точка 1",
  "notes": "Наклеена у входа"
}
```

## Статусы offline sync

- `created` — событие создано и учтено в прогрессе активного обхода.
- `duplicate` — событие уже было принято ранее по тому же `localId` или по той же точке обхода.
- `late_sync` — событие сохранено после завершения/отмены обхода и не меняет `scanned_points`.
- `point_deactivated` — точка была деактивирована после офлайн-скана; событие сохранено с флагом `point_deactivated_after_scan`.

## Пример offline sync

```http
POST /api/v1/mobile/patrols/00000000-0000-4000-8000-000000000000/events/sync
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "events": [
    {
      "localId": "11111111-1111-4111-8111-111111111111",
      "patrolPointId": "22222222-2222-4222-8222-222222222222",
      "nfcUid": "04a1b2c3d4e5f6",
      "scannedAt": "2026-06-19T10:00:00.000Z",
      "deviceId": "android-device-01",
      "lat": 56.010563,
      "lng": 92.852572,
      "gpsAccuracy": 5
    }
  ]
}
```

```json
{
  "items": [
    {
      "localId": "11111111-1111-4111-8111-111111111111",
      "serverId": "33333333-3333-4333-8333-333333333333",
      "status": "created"
    }
  ]
}
```

## Отмена и завершение из мобильного интерфейса

Для кнопки отмены обхода мобильное приложение вызывает:

```http
POST /api/v1/mobile/patrols/:id/cancel
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "cancellationReason": "Отвлекло руководство, начну обход заново."
}
```

Отменять можно обходы в статусах `pending`, `in_progress`, `overdue`. После отмены обход получает статус `cancelled`, а сотрудник может начать новый обход.

Для диалогового отчета при завершении мобильное приложение вызывает:

```http
POST /api/v1/mobile/patrols/:id/complete
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "completionReport": "Между точками 4 и 5 покупатель попросил помочь найти товар, поэтому интервал был длиннее обычного."
}
```

Если последний NFC-скан уже автоматически завершил обход, повторный вызов `complete` не падает и дозаписывает `completionReport`.

Для отмены настройки цифрового маршрута и старта заново админский режим мобильного приложения вызывает:

```http
POST /api/v1/mobile/shops/:shopId/route-setup/reset
Authorization: Bearer <accessToken>
```

Backend деактивирует точки текущей настройки, отвязывает NFC и переводит магазин в `routeStatus = not_configured`. После этого можно снова вызвать `route-setup/start`.
