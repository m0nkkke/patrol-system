# Monitoring

Модуль `monitoring` дает защищенный production endpoint для технической панели и ручной диагностики.

## Endpoint

```http
GET /api/v1/monitoring/status
Authorization: Bearer <accessToken>
```

Доступ: `admin`.

## Response

```json
{
  "service": "patrol-backend",
  "schemaVersion": "1.0",
  "checkedAt": "2026-08-18T13:00:00.000Z",
  "status": "ok",
  "components": {
    "database": {
      "status": "ok"
    },
    "redis": {
      "status": "ok",
      "details": {
        "ping": "PONG"
      }
    },
    "storage": {
      "status": "ok",
      "details": {
        "backend": "local",
        "path": "/app/storage",
        "freeBytes": 1000000000,
        "totalBytes": 30000000000
      }
    },
    "reportOutbox": {
      "status": "ok",
      "details": {
        "counters": {
          "pending": 0,
          "failed": 0,
          "sent": 100,
          "ready": 0,
          "total": 100
        },
        "lag": {
          "oldestUnsentCreatedAt": null,
          "oldestUnsentSeconds": null
        },
        "lastSentAt": "2026-08-18T12:55:00.000Z"
      }
    }
  },
  "config": {
    "nodeEnv": "production",
    "storageBackend": "local",
    "reportingCorePublishEnabled": false,
    "reportingCoreTransport": "disabled",
    "swaggerEnabled": false
  }
}
```

## Status

Общий `status`:

- `ok` - все компоненты доступны;
- `degraded` - сервис работает, но есть проблема, требующая внимания;
- `down` - один из критичных компонентов недоступен.

Статусы компонентов:

- `ok`;
- `degraded`;
- `down`;
- `disabled`.

Outbox считается `degraded`, если есть failed-события или самый старый неотправленный event висит больше часа.

## Безопасность

Endpoint не раскрывает пароли, API keys, connection strings и внешние URL отчетного ядра.

Публичным диагностическим endpoint остается только `GET /api/v1/health`.
