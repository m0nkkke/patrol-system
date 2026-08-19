# Модуль Audit Log

Модуль `audit-log` хранит защищенный журнал действий backend. В версии 0.3.0 журнал строится поверх существующей таблицы `audit_log` и глобального interceptor.

## Модель данных

`audit_log`:

- `id` — BIGSERIAL;
- `user_id` — пользователь, выполнивший действие;
- `action` — HTTP-действие, например `POST /shops`;
- `entity_type` — первый сегмент API-ресурса;
- `entity_id` — UUID сущности из route params или ответа;
- `ip_address`;
- `device_id` — значение заголовка `x-device-id`, если передано;
- `meta` — безопасный JSON-контекст события;
- `created_at`.

## Автоматическая запись

Глобальный interceptor пишет успешные и неуспешные защищенные запросы с методами:

- `POST`;
- `PUT`;
- `PATCH`;
- `DELETE`.

GET-запросы, health checks и большинство неаутентифицированных запросов не пишутся автоматически.

Auth-сценарии пишутся точечно внутри `AuthService`:

- `auth.login.success`;
- `auth.login.failure`;
- `auth.login.rate_limited`;
- `auth.universal_route_setter.login.success`;
- `auth.universal_route_setter.login.failure`;
- `auth.universal_route_setter.login.rate_limited`;
- `auth.refresh.success`;
- `auth.refresh.failure`;
- `auth.logout.success`.

Для `accessKey` сохраняется только короткий fingerprint, сам ключ в журнал не попадает.

`meta` содержит:

- HTTP-метод и путь;
- route params;
- query params;
- очищенный body;
- роль пользователя;
- `authorizationId` и `authorizationFullName`, если запрос выполнен из сессии универсального Настройщика;
- длительность обработки запроса;
- статус `success` или `failure`;
- для ошибок: `errorCode`, `errorMessage`, `statusCode`.

Секретные поля в body заменяются на `[redacted]`: `password`, `newPassword`, `token`, `accessToken`, `refreshToken`, `authorization`, `passwordHash`, `tokenHash`.

Для `POST /api/v1/mobile/anonymous` текст обращения и категория не дублируются в `audit_log.meta.body`. Interceptor сохраняет только безопасный маркер `{ anonymousAppeal: true, shopId }`.

## Endpoints

- `GET /api/v1/audit-log`;
- `GET /api/v1/audit-log/:id`;
- `GET /api/v1/audit-log/export.csv`;
- `GET /api/v1/audit-log/export.xlsx`.

Доступ: `admin`.

Фильтры:

- `userId`;
- `action`;
- `entityType`;
- `entityId`;
- `from`, `to`;
- `search`;
- `page`, `limit`;
- `sort`: `createdAt:desc`, `createdAt:asc`, `id:desc`, `id:asc`.

Export использует те же фильтры и права, что и список.

## Ограничения версии 0.3.0

Interceptor фиксирует изменяющие HTTP-действия после авторизации. Если бизнес-логика endpoint-а возвращает ошибку, событие пишется со статусом `failure`, а исходная ошибка не проглатывается и обрабатывается обычным exception filter.

Ошибки, возникающие до входа в interceptor, например отказ guards до обработки endpoint-а, могут не попасть в автоматический audit. Для критичных сценариев такие события нужно писать точечно в соответствующем сервисе, как это сделано для auth.

## Доменные ошибки

- `AUDIT_LOG_FORBIDDEN` — пользователь не может смотреть audit log.
