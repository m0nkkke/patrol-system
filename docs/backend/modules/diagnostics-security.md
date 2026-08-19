# Diagnostics Security

Документ фиксирует правила доступа к диагностическим интерфейсам backend для версии 0.3.0.

## Health

`GET /api/v1/health` остается публичным endpoint-ом. Он нужен для Docker, Nginx, uptime checks и балансировщиков.

Ответ не раскрывает внутренние детали:

```json
{"ok":true}
```

В health response не должны попадать версии библиотек, строки подключения, параметры Redis/PostgreSQL, состояние очередей, переменные окружения или диагностические dumps.

## Swagger

Swagger UI и OpenAPI JSON считаются диагностическими интерфейсами.

По умолчанию:

- `development` и `test` - Swagger включен;
- `production` - Swagger выключен.

Настройки:

```env
SWAGGER_ENABLED=false
SWAGGER_BASIC_AUTH_ENABLED=false
SWAGGER_BASIC_AUTH_USER=
SWAGGER_BASIC_AUTH_PASSWORD=
```

Если в production задано `SWAGGER_ENABLED=true`, backend требует:

```env
SWAGGER_BASIC_AUTH_ENABLED=true
SWAGGER_BASIC_AUTH_USER=<docs-user>
SWAGGER_BASIC_AUTH_PASSWORD=<strong-docs-password>
```

Без Basic Auth production backend не стартует со включенным Swagger.

Защищаемые пути:

- `/api/v1/docs`;
- `/api/v1/docs-json`.
- `/api/v1/docs-yaml`.

## Правило Для Production

В production публичным диагностическим endpoint-ом является только `GET /api/v1/health`.

Swagger включается только временно для staging/demo или для закрытого production-доступа и обязательно защищается Basic Auth. Для постоянной production-эксплуатации предпочтительный режим:

```env
SWAGGER_ENABLED=false
```
