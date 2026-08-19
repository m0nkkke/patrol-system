# NFC Wait Contract

Контракт описывает backend-состояние для автоматического ожидания NFC в мобильном приложении. Android-клиент после запуска обхода должен перейти в foreground NFC listening и не требовать отдельную кнопку сканирования.

## Endpoints

Текущее активное ожидание:

```http
GET /api/v1/mobile/patrols/active/nfc-wait-state
Authorization: Bearer <accessToken>
```

Состояние конкретного обхода:

```http
GET /api/v1/mobile/patrols/:id/nfc-wait-state
Authorization: Bearer <accessToken>
```

Доступ: `security_guard`.

Если активного обхода нет, `active/nfc-wait-state` возвращает `null`.

## Response

```json
{
  "mode": "waiting_for_nfc",
  "patrolId": "00000000-0000-4000-8000-000000000001",
  "shopId": "00000000-0000-4000-8000-000000000002",
  "routeId": "00000000-0000-4000-8000-000000000003",
  "status": "in_progress",
  "scannedPoints": 1,
  "totalPoints": 3,
  "canAcceptNfc": true,
  "requiresForegroundNfcListening": true,
  "expectedScanAction": "arrive",
  "pointVisitStatus": "pending",
  "lockedUntil": null,
  "remainingLockSeconds": 0,
  "expectedPoint": {
    "id": "00000000-0000-4000-8000-000000000004",
    "name": "Point 2",
    "description": "Near entrance",
    "sortOrder": 2,
    "photoFileId": "00000000-0000-4000-8000-000000000005",
    "nfcTagId": "00000000-0000-4000-8000-000000000006"
  },
  "scanContract": {
    "endpoint": "/api/v1/mobile/patrols/00000000-0000-4000-8000-000000000001/point-visits/scan",
    "method": "POST",
    "requiredFields": ["patrolPointId", "nfcUid", "scannedAt", "deviceId", "scanAction"]
  }
}
```

## Modes

- `waiting_for_nfc` - обход активен, backend ожидает следующую точку, mobile должен слушать NFC.
- `waiting_for_departure` - первый скан точки принят, backend ожидает повторный скан этой же метки после блокировки.
- `completed` - все точки пройдены или обход уже завершен.
- `inactive` - обход отменен, еще не активен или больше не принимает NFC.

## Scan Actions

- `arrive` - первый скан точки, сотрудник пришел к контрольной точке.
- `depart` - повторный скан той же точки, сотрудник покинул контрольную точку и идет к следующей.

После `arrive` backend выставляет `lockedUntil`. До этого времени `depart` не принимается в прогресс обхода. Mobile должен показать таймер и продолжать ждать повторный NFC-скан той же метки.

## Правила Для Mobile

- После `POST /api/v1/mobile/patrols/start` mobile вызывает `GET /api/v1/mobile/patrols/:id/nfc-wait-state`.
- Если `mode = waiting_for_nfc`, экран обхода сразу включает foreground NFC listening.
- При обнаружении NFC mobile отправляет событие в `scanContract.endpoint`.
- `patrolPointId` в событии должен быть равен `expectedPoint.id`.
- `scanAction` должен быть равен `expectedScanAction`.
- Если `expectedScanAction = depart`, mobile должен отправлять ту же точку и ту же NFC-метку, что были использованы при `arrive`.
- После успешной отправки NFC-события mobile снова запрашивает wait state.
- Если пользователь пытается приложить метку другой точки, mobile должен вызвать `POST /api/v1/mobile/patrols/:id/missed-point-attempts` и не считать точку пройденной локально.
- Для offline sync mobile сохраняет локальные NFC-события с `localId` и затем отправляет их через `POST /api/v1/mobile/patrols/:id/events/sync`.

## Backend Behavior

Backend рассчитывает `expectedPoint` и `expectedScanAction` из `patrol_point_visits` и уже сохраненных `patrol_events`:

- если у обхода есть `routeId`, порядок берется из `patrol_route_points.sort_order`;
- если `routeId` нет, используется порядок активных `patrol_points.sort_order` магазина;
- точки со статусом `completed` исключаются;
- точка со статусом `arrived` остается ожидаемой до принятого `depart`;
- неактивные точки не предлагаются как ожидаемые.

Новая логика посещения точки описана в [Route Timing And Point Visits](route-timing-and-point-visits.md).
