# Модуль аутентификации (Auth)

Модуль auth отвечает за вход пользователя и выдачу токенов. Access-токены — это JWT с коротким сроком жизни; refresh-токены хешируются, сохраняются в Redis для активной валидации и записываются в PostgreSQL для аудита.

## Эндпоинты

- `POST /api/v1/auth/login` проверяет постоянный ключ доступа и идентификатор устройства, затем возвращает access- и refresh-токены.
- `GET /api/v1/auth/me` возвращает безопасный профиль текущего пользователя: `id`, `fullName`, `username`, `role`, основной `shopId` и список разрешенных `shopIds`.
- `POST /api/v1/auth/universal-route-setter/login` проверяет универсальный ключ Настройщика, требует `actorFullName` и возвращает токены вместе с `authorizationId` и `authorizationFullName`.

## Бизнес-правила

- Время жизни access-токена настраивается через `JWT_ACCESS_TTL` и по умолчанию составляет 15 минут.
- Время жизни refresh-токена настраивается через `JWT_REFRESH_TTL_SECONDS` и по умолчанию составляет 7 дней.
- Хеши refresh-токенов являются значениями SHA-256; исходные (нехешированные) refresh-токены никогда не сохраняются.
- Ключ доступа постоянный: администратор создает пользователя, backend генерирует человекочитаемый ключ формата `XXXX-XXXX-XXXX`, пользователь вводит его один раз в мобильном приложении.
- Для админки ключ хранится в `users.access_key`, а для входа используется `users.access_key_hash` — SHA-256 от нормализованного ключа.
- При первой миграции, если в базе еще нет администратора, создается bootstrap-админ `system.admin` с ключом `ADMN-0000-0001`.
- Неудачные попытки входа возвращают общую ошибку «не авторизован».
- При входе обновляется поле `users.last_login_at`.
- Универсальный Настройщик разрешен только для пользователя с ролью `route_setter` и флагом `isUniversalRouteSetter = true`.
- Обычный `/auth/login` для активной универсальной учетной записи возвращает `400` с кодом `AUTH_ACTOR_FULL_NAME_REQUIRED`. Mobile после этого показывает ввод ФИО и вызывает `/auth/universal-route-setter/login` с тем же ключом.
- Challenge не создает токены или `universal_auth_sessions`, не считается неверным ключом и не увеличивает счетчик rate limiter. В audit сохраняется только fingerprint ключа.
- Каждый успешный вход универсального Настройщика создает запись `universal_auth_sessions`; `authorizationId` и введенное ФИО попадают в JWT и затем в `audit_log.meta` всех защищенных изменяющих запросов этой сессии.
- При refresh backend проверяет, что `authorizationId` универсального Настройщика существует, не отозван и не истек.
- При logout универсальная auth-сессия отзывается вместе с refresh-токеном.

## Пример запроса

```json
{
  "accessKey": "MEMP-SEED-0001",
  "deviceId": "android-device-fingerprint"
}
```

## Пример входа универсального Настройщика

```json
{
  "accessKey": "RSET-0000-0001",
  "deviceId": "android-device-fingerprint",
  "actorFullName": "Иван Петров"
}
```

Ответ содержит стандартные `accessToken` и `refreshToken`, а также:

```json
{
  "authorizationId": "00000000-0000-4000-8000-000000000001",
  "authorizationFullName": "Иван Петров"
}
```

## Релизная готовность mobile

- `POST /api/v1/auth/refresh` принимает `{ refreshToken, deviceId }`, проверяет refresh-токен в JWT, Redis и таблице `refresh_tokens`, отзывает старый refresh-токен и возвращает новую пару `{ accessToken, refreshToken }`.
- `POST /api/v1/auth/logout` принимает `{ refreshToken, deviceId }`, отзывает refresh-токен текущей сессии в PostgreSQL и удаляет активный hash из Redis.
- `POST /api/v1/auth/login` защищен от перебора: после 5 неудачных попыток за 60 секунд для пары `ip + deviceId` backend возвращает доменную ошибку `AUTH_TOO_MANY_ATTEMPTS`.
- При `401` mobile-клиент должен один раз вызвать `/auth/refresh`; если refresh вернул `401`, нужно очистить локальные токены и показать экран входа.
