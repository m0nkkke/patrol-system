# Инструкция mobile-разработчика по работе с API

Документ описывает, как мобильному модулю работать с backend API Patrol System. Это практическая инструкция для Android/React Native-разработчика: какие endpoints вызывать, какие данные хранить локально, как обрабатывать ошибки и как синхронизировать офлайн-события.

## Базовые параметры

- Базовый URL локально: `http://localhost:3000/api/v1`.
- Swagger локально: `http://localhost:3000/api/v1/docs`.
- Все mobile endpoints, кроме логина, требуют `Authorization: Bearer <accessToken>`.
- Тестовые mobile-ключи после seed:
  - `mobile.admin` / `MADM-SEED-0001` — регистрация маршрута и NFC-меток;
  - `mobile.employee` / `MEMP-SEED-0001` — прохождение маршрута.
- Bootstrap-админ после первой миграции: `system.admin` / `ADMN-0000-0001`, если до миграции в базе не было администраторов.
- NFC-чипы не прошиваются. Приложение читает аппаратный UID и отправляет его как `uid` или `nfcUid`.
- Backend нормализует NFC UID в нижний регистр.

## Shared-типы

DTO и enum лежат в `packages/shared`. Мобильный модуль должен импортировать контракты оттуда, а не дублировать строки вручную.

Минимально полезные типы:

```typescript
import {
  BindRoutePointNfcDto,
  CancelPatrolDto,
  CompletePatrolDto,
  CreatePatrolEventDto,
  LoginDto,
  StartMobilePatrolDto,
  SyncPatrolEventsDto,
  SyncPatrolEventsResultDto,
  SyncPatrolEventStatus,
} from '@patrol/shared';
```

## HTTP-клиент

Рекомендуемая настройка клиента:

- `baseURL` хранить в конфиге окружения;
- `accessToken` подставлять в `Authorization`;
- `deviceId` генерировать/получать один раз на устройстве и использовать во всех запросах;
- на `401` переводить пользователя на повторный логин;
- доменные ошибки backend показывать по `code`, а не по тексту `message`.

Пример формы ошибки:

```json
{
  "code": "NFC_TAG_MISMATCH",
  "message": "NFC tag does not match patrol point",
  "statusCode": 400,
  "timestamp": "2026-06-19T10:00:00.000Z"
}
```

## Логин

```http
POST /api/v1/auth/login
Content-Type: application/json
```

```json
{
  "accessKey": "MEMP-SEED-0001",
  "deviceId": "android-device-01"
}
```

Ответ:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>"
}
```

Важно: `accessToken` короткоживущий. При `401` приложение должно один раз вызвать `POST /api/v1/auth/refresh`; если refresh тоже вернул `401`, нужно очистить локальные токены и показать экран входа.

## Refresh и logout

```http
POST /api/v1/auth/refresh
Content-Type: application/json
```

```json
{
  "refreshToken": "<refresh-jwt>",
  "deviceId": "android-device-01"
}
```

Ответ:

```json
{
  "accessToken": "<new-access-jwt>",
  "refreshToken": "<new-refresh-jwt>"
}
```

Refresh-токен ротируется: после успешного refresh нужно заменить локально оба токена. Старый refresh-токен больше не использовать.

```http
POST /api/v1/auth/logout
Content-Type: application/json
```

```json
{
  "refreshToken": "<refresh-jwt>",
  "deviceId": "android-device-01"
}
```

Ответ:

```json
{
  "success": true
}
```

После logout очистить локальные `accessToken` и `refreshToken`.

## Создание пользователей в мобильной админке

Роль: `admin`.

Администратор вводит ФИО, роль и при необходимости один или несколько магазинов. Backend генерирует постоянный ключ доступа и возвращает его в ответе. Этот ключ можно показать администратору и выдать сотруднику для первого входа.

Если создается обходчик или менеджер конкретного магазина, `shopId` должен существовать. Иначе backend вернет `404` с кодом `ENTITY_NOT_FOUND`.

```http
POST /api/v1/users
Authorization: Bearer <adminAccessToken>
Content-Type: application/json
```

```json
{
  "fullName": "Иван Петров",
  "role": "employee",
  "shopId": "00000000-0000-4000-8000-0000000000aa",
  "shopIds": [
    "00000000-0000-4000-8000-0000000000aa",
    "00000000-0000-4000-8000-0000000000bb"
  ],
  "isActive": true
}
```

Ответ содержит `accessKey`:

```json
{
  "id": "<user-id>",
  "fullName": "Иван Петров",
  "role": "employee",
  "shopId": "00000000-0000-4000-8000-0000000000aa",
  "shopIds": [
    "00000000-0000-4000-8000-0000000000aa",
    "00000000-0000-4000-8000-0000000000bb"
  ],
  "username": "user-ab12cd34",
  "accessKey": "ABCD-EFGH-2345",
  "isActive": true
}
```

`shopId` — основной магазин, который пока использует сценарий обхода без выбора магазина. `shopIds` — полный список назначений. Клиент может временно ограничить UI одним магазином, не ограничивая модель backend.

## Определение режима приложения

После логина всегда вызываем:

```http
GET /api/v1/mobile/me
Authorization: Bearer <accessToken>
```

Ответ содержит пользователя и capabilities:

- `canRegisterRoutes` — доступен режим регистрации маршрута;
- `canRunPatrols` — доступен режим обходчика.

Логика UI:

- если `canRegisterRoutes = true`, показывать админский сценарий привязки NFC;
- если `canRunPatrols = true`, показывать сценарий обхода;
- если оба флага `false`, показывать экран отсутствия доступа.

## Регистрация маршрута и NFC-меток

Роль: `admin` или `manager`.

Порядок:

1. Админ выбирает магазин.
2. Приложение вызывает старт настройки маршрута.
3. Приложение показывает следующую точку по `nextSortOrder`.
4. Админ физически подходит к точке и сканирует NFC-чип.
5. Приложение отправляет UID на backend.
6. Backend сам привязывает UID к следующей незарегистрированной точке.
7. После последней точки `routeStatus` становится `ready`.

Старт настройки:

```http
POST /api/v1/mobile/shops/:shopId/route-setup/start
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "expectedPoints": 12
}
```

Получить состояние:

```http
GET /api/v1/mobile/shops/:shopId/route-setup
Authorization: Bearer <accessToken>
```

Привязать следующий NFC UID:

```http
POST /api/v1/mobile/shops/:shopId/route-setup/scan
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

Важные ошибки:

- `ROUTE_SETUP_NOT_STARTED` — маршрут не был начат;
- `ROUTE_SETUP_ALREADY_COMPLETE` — все точки уже зарегистрированы;
- `NFC_TAG_ALREADY_ASSIGNED` — UID уже привязан к другой активной точке.

## Управление расписаниями в мобильной админке

Роль: `admin` или `manager`. Менеджер может управлять расписаниями только своего магазина.

Основные запросы:

- `POST /api/v1/patrol-schedules` — создать расписание;
- `GET /api/v1/patrol-schedules/shop/:shopId` — получить расписания магазина;
- `PATCH /api/v1/patrol-schedules/:id` — изменить окно или активность;
- `DELETE /api/v1/patrol-schedules/:id` — деактивировать расписание.

```json
{
  "shopId": "00000000-0000-4000-8000-0000000000aa",
  "name": "Вечерний обход",
  "weekdays": [1, 2, 3, 4, 5, 6, 7],
  "startTime": "20:00",
  "endTime": "21:00"
}
```

Дни недели нумеруются от `1` (понедельник) до `7` (воскресенье). Время вводится в локальной таймзоне магазина. Активные расписания с общими днями недели не должны пересекаться; backend вернёт `PATROL_SCHEDULE_OVERLAP`.

## Прохождение обхода

Роль: `employee`.

Порядок:

1. Получить маршрут магазина.
2. Проверить активный обход.
3. Если активного обхода нет, получить доступные сейчас расписания.
4. Стартовать плановый обход с `scheduleId` или внеплановый без него.
5. При каждом NFC-скане сначала записать событие локально.
6. Если сеть доступна, отправить online-событие или пачку offline sync.

Получить маршрут:

```http
GET /api/v1/mobile/route
Authorization: Bearer <accessToken>
```

Получить активный обход:

```http
GET /api/v1/mobile/patrols/active
Authorization: Bearer <accessToken>
```

Получить расписания, доступные в текущий момент по таймзоне магазина:

```http
GET /api/v1/mobile/patrol-schedules/available
Authorization: Bearer <accessToken>
```

Ответ содержит только активные окна текущего дня, в которых `startTime <= текущее время < endTime`. Поле `dueAt` возвращается в UTC и должно отображаться пользователю в локальном времени устройства.

После дедлайна backend переводит обход в `overdue`, но он остаётся активным: приложение должно продолжить маршрут и отправлять NFC-события как обычно. `GET /mobile/patrols/active` также возвращает просроченный незавершённый обход.

Стартовать плановый обход:

```http
POST /api/v1/mobile/patrols/start
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "scheduleId": "33333333-3333-4333-8333-333333333333"
}
```

Backend повторно проверяет окно при старте и сам записывает `dueAt`. Не рассчитывайте дедлайн на устройстве.

Для внепланового обхода отправьте пустой объект `{}`. Такой обход будет иметь `scheduleId = null` и `dueAt = null`.

Online-скан:

```http
POST /api/v1/mobile/patrols/:patrolId/events
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "patrolPointId": "22222222-2222-4222-8222-222222222222",
  "nfcUid": "04a1b2c3d4e5f6",
  "scannedAt": "2026-06-19T10:00:00.000Z",
  "deviceId": "android-device-01",
  "lat": 56.010563,
  "lng": 92.852572,
  "gpsAccuracy": 5
}
```

Важные ошибки:

- `PATROL_ROUTE_NOT_READY` — маршрут магазина ещё не готов;
- `PATROL_ROUTE_EMPTY` — у магазина нет активных точек;
- `PATROL_SCHEDULE_OUTSIDE_WINDOW` — выбранное окно уже не доступно по локальному времени магазина;
- `PATROL_SCHEDULE_INACTIVE` — расписание отключено администратором;
- `PATROL_SCHEDULE_WRONG_SHOP` — расписание относится к другому магазину;
- `MOBILE_PATROL_FORBIDDEN` — обход принадлежит другому пользователю;
- `NFC_TAG_NOT_ACTIVE` — UID не зарегистрирован или метка неактивна;
- `NFC_TAG_MISMATCH` — UID не соответствует выбранной точке;
- `PATROL_NOT_IN_PROGRESS` — обход уже не активен.

## Offline-first алгоритм

NFC-событие нельзя терять из-за отсутствия сети. Поэтому порядок на мобильном клиенте такой:

1. Считать NFC UID.
2. Найти локальную точку маршрута по UID.
3. Создать локальное событие с `localId` UUID.
4. Сохранить событие в WatermelonDB со статусом `pending`.
5. Сразу показать пользователю успешный скан.
6. Фоном отправить pending-события через `events/sync`.
7. При успешном ответе сохранить `serverId` и `status`, затем пометить событие как `synced`.

Рекомендуемые локальные поля события:

```typescript
type LocalPatrolEvent = {
  deviceId: string;
  gpsAccuracy?: number;
  lat?: number;
  lng?: number;
  localId: string;
  nfcUid: string;
  patrolId: string;
  patrolPointId: string;
  scannedAt: string;
  serverId?: string;
  syncStatus: 'pending' | 'synced';
  syncResult?: SyncPatrolEventStatus;
};
```

## Offline sync

```http
POST /api/v1/mobile/patrols/:patrolId/events/sync
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

Ответ:

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

Статусы sync:

- `created` — событие создано и учтено в прогрессе обхода.
- `duplicate` — событие уже принято ранее; локальную запись можно считать синхронизированной.
- `late_sync` — событие сохранено после завершения/отмены обхода и не меняет прогресс.
- `point_deactivated` — точка была деактивирована после офлайн-скана; событие сохранено для истории.

Любой из этих статусов означает, что событие принято backend и его не нужно отправлять повторно.

## Размер пачки sync

`events/sync` принимает максимум 200 событий за запрос. Если локальная очередь больше, отправлять её частями.

## NFC UID

Ожидаемый формат UID:

- строка от 4 до 32 символов;
- backend сам приводит UID к нижнему регистру;
- приложение не должно добавлять payload и не должно пытаться перепрошивать NTAG215.

## GPS

Поля `lat`, `lng`, `gpsAccuracy` опциональны, но желательно отправлять их всегда, если разрешения и качество геолокации позволяют.

Если GPS недоступен:

- событие всё равно нужно сохранить локально;
- отправить событие без координат;
- не блокировать сканирование.

## Минимальный порядок реализации mobile-модуля

1. Конфиг `API_BASE_URL`.
2. Auth store: `accessToken`, `refreshToken`, `deviceId`, текущий пользователь.
3. HTTP client с Bearer token.
4. Экран логина.
5. `GET /mobile/me` и выбор режима UI.
6. Экран регистрации маршрута для `admin`/`manager`.
7. Экран выбора доступного расписания, маршрута и активного обхода для `employee`.
8. NFC scan handler.
9. WatermelonDB-таблица локальных событий.
10. Фоновый sync worker.
11. Обработка `created`, `duplicate`, `late_sync`, `point_deactivated`.

## Push-уведомления

После логина и получения Expo push-токена от приложения зарегистрируйте устройство на backend:

```http
POST /api/v1/mobile/devices/push-token
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "deviceId": "android-device-01",
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "android",
  "appVersion": "1.0.0"
}
```

Вызывать endpoint нужно:

- после успешного логина;
- при обновлении Expo push-токена на устройстве;
- после переустановки приложения, если изменился `deviceId` или token.

Backend сохраняет token идемпотентно. Если token уже был привязан к другому пользователю или устройству, запись переносится на текущего пользователя.

Backend отправляет push-уведомления администраторам и менеджерам магазина при инцидентах обхода, просрочке обхода и отмене обхода сотрудником. В `data` приходят `type`, `shopId`, `patrolId`, а для инцидентов также `incidentId`; по этим полям можно открыть нужный экран истории или деталей обхода.

## Smoke-проверка backend-контракта

Backend покрывает mobile API smoke-тестом:

```bash
npm run test -w @patrol/backend -- mobile-api.e2e.spec.ts
```

Полный backend-прогон:

```bash
npm run build
npm run typecheck
npm run lint
npm run test
```

## Кнопки отмены и отчет при завершении

### Отменить настройку маршрута

В админском режиме добавьте действие "Отменить настройку" или "Начать заново":

```http
POST /api/v1/mobile/shops/:shopId/route-setup/reset
Authorization: Bearer <accessToken>
```

После успешного ответа состояние магазина вернется в `routeStatus = not_configured`, `expectedPoints = 0`, `registeredPoints = 0`. Старые привязки NFC будут сняты на backend. Дальше можно снова вызвать `POST /mobile/shops/:shopId/route-setup/start`.

### Отменить текущий обход

Кнопка "Отменить обход" для сотрудника:

```http
POST /api/v1/mobile/patrols/:patrolId/cancel
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "cancellationReason": "Отвлекло руководство, начну обход заново."
}
```

После ответа со статусом `cancelled` локально закройте экран текущего обхода и разрешите пользователю начать новый.

### Диалоговый отчет при завершении

После последней точки покажите сотруднику диалог отчета. В отчете нужно сохранять объяснение больших интервалов: покупатель отвлек вопросом, руководитель дал поручение, понадобилась помощь другому сотруднику и т.п.

```http
POST /api/v1/mobile/patrols/:patrolId/complete
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "completionReport": "Покупатель попросил помочь найти товар между точками 4 и 5, поэтому интервал был длиннее обычного."
}
```

Важно: backend может автоматически перевести обход в `completed` сразу после последнего NFC-скана. В этом случае всё равно вызывайте `complete` с `completionReport`: backend дозапишет отчет в уже завершенный обход.
