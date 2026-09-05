# Устройство backend для mobile

## Базовый URL

Локально:

```text
http://localhost:3000/api/v1
```

Все защищенные запросы используют:

```http
Authorization: Bearer <accessToken>
```

Для mobile-запросов желательно всегда передавать стабильный `deviceId`. В некоторых endpoint он идет в body, в anonymous также можно передать заголовок:

```http
x-device-id: <stable-device-id>
```

## Авторизация

Обычные пользователи входят через:

```http
POST /api/v1/auth/login
```

Body:

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

Refresh:

```http
POST /api/v1/auth/refresh
```

Logout:

```http
POST /api/v1/auth/logout
```

Refresh-токен ротируется. После успешного refresh нужно заменить локально оба токена.

## Универсальный Настройщик

Mobile начинает вход всех ролей через обычный `/auth/login`. Для активного универсального
Настройщика этот endpoint не выдает токены, а возвращает `400`:

```json
{
  "code": "AUTH_ACTOR_FULL_NAME_REQUIRED",
  "message": "Actor full name is required",
  "statusCode": 400
}
```

После challenge приложение показывает второй шаг с ФИО и вызывает сценарный endpoint:

```http
POST /api/v1/auth/universal-route-setter/login
```

Body:

```json
{
  "accessKey": "RSET-0000-0001",
  "deviceId": "android-device-01",
  "actorFullName": "Иван Петров"
}
```

Ответ:

```json
{
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "authorizationId": "00000000-0000-4000-8000-000000000001",
  "authorizationFullName": "Иван Петров"
}
```

Практический смысл: учетная запись общая, но каждое использование привязано к конкретному введенному ФИО и уникальному `authorizationId`. Backend добавляет эти поля в audit log для последующих действий.

Для mobile это означает один начальный экран и второй шаг с обязательным ФИО исполнителя только
после `AUTH_ACTOR_FULL_NAME_REQUIRED`.

## Роли и capabilities

После входа всегда вызывайте:

```http
GET /api/v1/mobile/me
```

Используйте ответ для выбора режима приложения:

- `canRegisterRoutes = true` - доступен сценарий настройки маршрутов;
- `canRunPatrols = true` - доступен сценарий обходов СК.

Роли:

- `security_guard` - выбор магазина, обход, NFC, отчеты, anonymous;
- `route_setter` - настройка маршрутов, в том числе универсальная учетная запись;
- `local_route_setter` - настройка маршрутов в рамках назначенных ТТ;
- `inspector` - контрольные представления, в основном web/backend API;
- `admin` - полный доступ.

## Магазины

СК после входа должен выбрать магазин из разрешенного списка:

```http
GET /api/v1/mobile/shops
```

Дальше mobile-сценарии СК должны использовать явный `shopId`, где endpoint это поддерживает.

## Обход точки

Контрольная точка больше не считается пройденной после одного NFC-скана.

Новая модель:

1. `arrive` - СК пришел к точке и сканирует NFC.
2. Backend блокирует точку на 60-120 секунд.
3. Mobile показывает таймер и остается на этой точке.
4. `depart` - после таймера СК повторно сканирует ту же NFC-метку.
5. Backend закрывает точку и переводит ожидание на следующую точку маршрута.

Это нужно, чтобы сотрудник не мог быстро пробежать по меткам и имитировать полный обход.

## Нормативы маршрута

Backend рассчитывает норматив маршрута автоматически по завершенным обходам за последние 14 дней. Mobile не должен считать среднее время маршрута и пороги самостоятельно.

Backend определяет:

- общий норматив маршрута;
- порог "быстро";
- порог "подозрительно быстро";
- порог "долго";
- триггеры отклонения от графика и невыполненного обхода.

Проверяющий получает уведомления по backend-триггерам и смотрит расследование в контрольном представлении.

## Файлы и фото

Backend хранит файлы через абстракцию storage. Сейчас основным является локальное хранение сжатых фото, но контракт допускает объектное хранилище в будущем.

Получение файла:

```http
GET /api/v1/files/:id
```

Фото контрольной точки приходит в данных точки как `photoFileId` или `photoFile`. Приложение должно уметь показать фото по защищенному URL backend.

## Аудит

Backend пишет защищенный audit log для изменяющих запросов. Mobile не должен отправлять секреты в query params. Для anonymous backend специально не дублирует текст обращения в `audit_log.meta.body`.

## Inspector Web API

`GET /api/v1/control/shops/:shopId/overview` returns the inspector shop card with recent patrols, triggers, staff and report summary. This is a web/backend API for `inspector` and `admin`; the mobile guard flow does not use it.

Полный список сотрудников для рабочего места Проверяющего:

- `GET /api/v1/control/staff` с `shopId`, `role`, `isActive`, `search`, `page`, `limit`, `sort`;
- `GET /api/v1/control/staff/:id` с основным и дополнительными назначениями.

Ответ является безопасным read model и не содержит ключей, сессий, push-токенов и device ID.
