# Mobile API

Модуль `mobile` предоставляет контракт для Android-приложения. Он не заменяет общие backend-модули, а даёт мобильному клиенту удобные сценарные endpoints.

Все endpoints модуля требуют `Authorization: Bearer <accessToken>`.

## Эндпоинты

- `GET /api/v1/mobile/me` — возвращает текущего пользователя и доступные мобильные действия.
- `POST /api/v1/mobile/shops/:shopId/route-setup/start` — начинает настройку маршрута магазина.
- `GET /api/v1/mobile/shops/:shopId/route-setup` — возвращает состояние настройки маршрута.
- `POST /api/v1/mobile/shops/:shopId/route-setup/scan` — привязывает отсканированный NFC UID к следующей незарегистрированной точке маршрута.
- `GET /api/v1/mobile/route` — возвращает активные точки маршрута магазина текущего обходчика.
- `GET /api/v1/mobile/patrols/active` — возвращает текущий активный обход сотрудника или `null`.
- `POST /api/v1/mobile/patrols/start` — стартует обход для текущего сотрудника и его магазина.
- `POST /api/v1/mobile/patrols/:id/events` — записывает одиночное NFC-событие онлайн.
- `POST /api/v1/mobile/patrols/:id/missed-point-attempts` — фиксирует попытку сотрудника отсканировать точку не по порядку маршрута.
- `POST /api/v1/mobile/patrols/:id/events/sync` — синхронизирует пачку NFC-событий, накопленных офлайн.

## Роли

- `admin` и `manager` могут настраивать маршруты и регистрировать NFC-метки через мобильное приложение.
- `employee` может получать маршрут, стартовать обход и отправлять NFC-события.

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
- Обходчик работает только со своим магазином, взятым из `user.shopId`.
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
  "expectedPatrolPointId": "11111111-1111-4111-8111-111111111111",
  "attemptedPatrolPointId": "22222222-2222-4222-8222-222222222222",
  "nfcUid": "04a1b2c3d4e5f6",
  "scannedAt": "2026-06-19T10:00:00.000Z",
  "deviceId": "android-device-01"
}
```

Ответ: `204 No Content`.

Backend проверяет, что обход принадлежит текущему сотруднику, находится в `in_progress` или `overdue`, а обе точки принадлежат магазину обхода. Если `attemptedPatrolPoint.sortOrder > expectedPatrolPoint.sortOrder`, создается инцидент `missed_point` без создания `patrol_event`.

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
