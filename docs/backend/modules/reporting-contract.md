# Reporting Contract

Документ фиксирует подход к отчетности для версии 0.3.0 и будущей микросервисной архитектуры. Модуль обходов является одним из сервисов, которые будут отдавать отчетные данные в главное ядро отчетности. Поэтому первичный формат обмена должен быть машинным, версионируемым и независимым от конкретного экрана.

## Цели

- Разделить отчетность для службы контроля и для руководства.
- Использовать JSON как основной контракт между сервисами.
- Оставить Excel, CSV и PDF как экспортные представления, а не как системный транспорт.
- Хранить первичные факты один раз и строить разные представления с учетом прав.
- Заложить `schemaVersion`, `sourceService` и outbox-события для будущей передачи в главное ядро.

## Аудитории

### Служба контроля

Службе контроля нужны первичные факты, детализация, история и возможность расследования. Это контрольное представление не скрывает проблемы.

Входит:

- список обходов с фильтрами по магазину, сотруднику, маршруту, периоду и датам;
- статус каждого обхода: выполнен, просрочен, отменен, в процессе;
- плановое и фактическое время старта/завершения;
- маршрут, категория маршрута и период обхода;
- контрольные точки, события NFC, порядок прохождения;
- фото контрольных точек и фото, приложенные к отчетам;
- инциденты: пропуск точки, попытка пропуска, короткий интервал, длинный интервал, просрочка, отмена;
- комментарии СК при завершении или отмене;
- ФИО сотрудника, роль, магазин, регион;
- история изменений и будущий audit trail;
- выгрузка детальных данных в Excel/CSV с учетом фильтров и прав.

Не входит:

- скрытие негативных фактов ради красивой статистики;
- ручная корректировка первичных событий без аудита;
- агрегаты без возможности открыть первичную карточку нарушения.

### Руководство

Руководству нужны агрегированные цифры, динамика и позитивные или нейтральные метрики. Персональные детали, фото и расследовательская информация в это представление не попадают.

Входит:

- процент выполненных плановых обходов;
- количество и доля магазинов в зеленой зоне;
- динамика выполнения по дням, неделям и месяцам;
- доля обходов без замечаний;
- среднее время выполнения обхода;
- выполнение по типам маршрутов: внутренний/внешний;
- выполнение по периодам: утро/полдень/вечер;
- топ магазинов по стабильности;
- количество магазинов, требующих внимания, без раскрытия деталей на первом уровне;
- нейтральные показатели качества: `onTimeRate`, `completionRate`, `cleanPatrolRate`, `attentionRate`;
- Excel/CSV выгрузка агрегатов.

Не входит:

- ФИО СК на первом уровне отчетности;
- фотографии;
- подробная лента NFC-событий;
- тексты комментариев сотрудников;
- сырые инциденты с персональными данными;
- данные, позволяющие публично сравнивать конкретных сотрудников без отдельного права.

## Виды операционных отчетов

В ТЗ 3.0 указаны шесть видов отчетов. В backend они рассматриваются как типы операционного отчета:

- `photo_report` — фотоотчет по точкам или состоянию объекта;
- `morning` — утренний отчет;
- `closing` — отчет закрытия;
- `sunday` — воскресный отчет;
- `heating` — отчет отопительного периода;
- `evacuation` — эвакуационный отчет.

Операционный отчет создается СК или системой и может содержать структурированные поля, комментарий и файлы.

## Представления

### Control Reports

Детальное представление для службы контроля.

Базовые endpoints будущего модуля:

- `GET /api/v1/control/reports`
- `GET /api/v1/control/reports/:id`
- `GET /api/v1/control/incidents`
- `GET /api/v1/control/incidents/:id`
- `GET /api/v1/control/incidents/export.xlsx`
- `GET /api/v1/control/incidents/export.csv`
- `GET /api/v1/control/reports/export.xlsx`
- `GET /api/v1/control/reports/export.csv`

Доступ: `admin`, `inspector`. Для `inspector` данные ограничиваются назначенными магазинами.

`GET /api/v1/control/incidents` и `GET /api/v1/control/incidents/:id` возвращают read model для расследования инцидентов. В список входят фильтры `shopId`, `employeeId`, `patrolId`, `type`, `severity`, `from`, `to`, `search`, `page`, `limit`, `sort`. Для `inspector` данные ограничены назначенными магазинами.

CSV/XLSX выгрузки контрольных инцидентов используют те же фильтры и права, что и список, и содержат детальные поля расследования. Эти выгрузки относятся к контрольному представлению и могут содержать ФИО, сообщения и NFC-контекст.

Severity в версии 0.3.0 вычисляется из типа инцидента:

- `missed_point` — `critical`;
- `short_interval`, `long_interval` — `warning`.

### Management Reports

Агрегированное представление для руководства.

Базовые endpoints будущего модуля:

- `GET /api/v1/management/metrics`
- `GET /api/v1/management/metrics/breakdown`
- `GET /api/v1/management/metrics/trends`
- `GET /api/v1/management/scorecards/shops`
- `GET /api/v1/management/metrics/export.xlsx`
- `GET /api/v1/management/metrics/export.csv`
- `GET /api/v1/management/metrics/breakdown/export.xlsx`
- `GET /api/v1/management/metrics/breakdown/export.csv`
- `GET /api/v1/management/metrics/trends/export.xlsx`
- `GET /api/v1/management/metrics/trends/export.csv`
- `GET /api/v1/management/scorecards/shops/export.xlsx`
- `GET /api/v1/management/scorecards/shops/export.csv`

Доступ: `admin` и будущие управленческие роли. В версии 0.3.0 можно ограничить `admin`.

## Форматы данных

### JSON

Основной формат API и межсервисного обмена. Все новые отчетные документы и события должны иметь стабильный JSON-контракт.

### JSON Schema

Используется для описания и валидации payload разных типов отчетов. Для каждого `reportType` допускается своя схема полей.

### Excel XLSX

Используется только как выгрузка для людей. Excel не является транспортом между сервисами.
В версии 0.3.0 добавлены первые выгрузки для `control/reports`, `management/metrics`, `management/metrics/trends`, `management/metrics/breakdown` и `management/scorecards/shops`.

### CSV

Используется для простых табличных выгрузок и BI-интеграций.
В версии 0.3.0 добавлены первые выгрузки для `control/reports`, `management/metrics`, `management/metrics/trends`, `management/metrics/breakdown` и `management/scorecards/shops`.

### PDF

Опциональный формат для печатных актов. Не является первичным источником данных.

## Report Envelope

Все межсервисные сообщения должны передаваться в общем конверте:

```json
{
  "eventId": "00000000-0000-4000-8000-000000000001",
  "eventType": "report.submitted",
  "sourceService": "patrol",
  "schemaVersion": "1.0",
  "occurredAt": "2026-08-18T05:20:00.000Z",
  "actor": {
    "id": "00000000-0000-4000-8000-000000000002",
    "role": "security_guard",
    "fullName": "Иван Петров"
  },
  "tenant": {
    "organizationId": null,
    "regionId": "00000000-0000-4000-8000-000000000003",
    "shopId": "00000000-0000-4000-8000-000000000004"
  },
  "subject": {
    "type": "patrol_report",
    "id": "00000000-0000-4000-8000-000000000005"
  },
  "payload": {}
}
```

Обязательные поля:

- `eventId` — UUID события, используется для идемпотентности;
- `eventType` — тип события;
- `sourceService` — сервис-источник, для этого проекта `patrol`;
- `schemaVersion` — версия схемы payload;
- `occurredAt` — время факта в UTC;
- `actor` — пользователь или система, создавшие событие;
- `tenant` — контекст организации, региона и магазина;
- `subject` — сущность, к которой относится событие;
- `payload` — полезная нагрузка события.

## Report Document

Операционный отчет хранится как документ:

```json
{
  "id": "00000000-0000-4000-8000-000000000005",
  "sourceService": "patrol",
  "schemaVersion": "1.0",
  "reportType": "morning",
  "status": "submitted",
  "shopId": "00000000-0000-4000-8000-000000000004",
  "regionId": "00000000-0000-4000-8000-000000000003",
  "employeeId": "00000000-0000-4000-8000-000000000002",
  "patrolId": "00000000-0000-4000-8000-000000000006",
  "routeId": "00000000-0000-4000-8000-000000000007",
  "scheduleId": "00000000-0000-4000-8000-000000000008",
  "period": "morning",
  "fields": {
    "entranceClean": true,
    "securityPostReady": true,
    "comment": "Без замечаний"
  },
  "files": [
    {
      "fileId": "00000000-0000-4000-8000-000000000009",
      "kind": "report_photo",
      "mimeType": "image/webp",
      "url": "/api/v1/files/00000000-0000-4000-8000-000000000009"
    }
  ],
  "submittedAt": "2026-08-18T05:20:00.000Z"
}
```

## Management Metrics

Управленческая витрина строится из первичных фактов, но не раскрывает детали. Базовый JSON:

```json
{
  "sourceService": "patrol",
  "schemaVersion": "1.0",
  "period": {
    "from": "2026-08-01T00:00:00.000Z",
    "to": "2026-08-18T23:59:59.999Z"
  },
  "scope": {
    "regionId": null,
    "shopId": null
  },
  "metrics": {
    "plannedPatrols": 1200,
    "completedPatrols": 1164,
    "completionRate": 0.97,
    "onTimeRate": 0.94,
    "cleanPatrolRate": 0.91,
    "attentionRate": 0.06,
    "greenShopCount": 83,
    "attentionShopCount": 5
  }
}
```

Метрики руководства должны быть агрегированными. Если нужен drill-down до конкретного магазина или инцидента, пользователь переходит в контрольное представление и должен иметь соответствующую роль.

## Management Trends

Динамика управленческих метрик строится по тем же первичным фактам, что и общий агрегат, но группируется по периоду:

- `day`;
- `week`;
- `month`.

Endpoint:

- `GET /api/v1/management/metrics/trends`

Базовый JSON:

```json
{
  "sourceService": "patrol",
  "schemaVersion": "1.0",
  "bucket": "day",
  "period": {
    "from": "2026-08-01T00:00:00.000Z",
    "to": "2026-08-18T23:59:59.999Z"
  },
  "scope": {
    "regionId": null,
    "shopId": null
  },
  "items": [
    {
      "bucketStart": "2026-08-01T00:00:00.000Z",
      "metrics": {
        "plannedPatrols": 70,
        "completedPatrols": 68,
        "completionRate": 0.9714,
        "onTimeRate": 0.9412,
        "cleanPatrolRate": 0.9118,
        "attentionRate": 0.0571,
        "submittedReports": 14
      }
    }
  ]
}
```

Представление не содержит ФИО, фото, комментариев и сырых инцидентов.

## Management Breakdown

Разрезы управленческих метрик показывают вклад категорий без раскрытия первичных деталей.

Endpoint:

- `GET /api/v1/management/metrics/breakdown`

Параметр `groupBy`:

- `routeCategory` — группы `internal`, `external`;
- `period` — группы `morning`, `noon`, `evening`.

Базовый JSON:

```json
{
  "sourceService": "patrol",
  "schemaVersion": "1.0",
  "groupBy": "routeCategory",
  "period": {
    "from": "2026-08-01T00:00:00.000Z",
    "to": "2026-08-18T23:59:59.999Z"
  },
  "scope": {
    "regionId": null,
    "shopId": null
  },
  "items": [
    {
      "groupKey": "internal",
      "metrics": {
        "plannedPatrols": 800,
        "completedPatrols": 784,
        "completionRate": 0.98,
        "onTimeRate": 0.95,
        "cleanPatrolRate": 0.92,
        "attentionRate": 0.04,
        "submittedReports": 80
      }
    },
    {
      "groupKey": "external",
      "metrics": {
        "plannedPatrols": 400,
        "completedPatrols": 380,
        "completionRate": 0.95,
        "onTimeRate": 0.91,
        "cleanPatrolRate": 0.89,
        "attentionRate": 0.1,
        "submittedReports": 35
      }
    }
  ]
}
```

Отсутствующие группы возвращаются с нулевыми метриками, чтобы контракты веб-панели оставались стабильными.

Для людей доступны CSV/XLSX выгрузки:

- `GET /api/v1/management/metrics/breakdown/export.xlsx`
- `GET /api/v1/management/metrics/breakdown/export.csv`

## Management Shop Scorecards

Scorecard магазина — агрегированная строка для управленческой панели. Она показывает состояние магазина без персональных деталей, фото, комментариев и сырой ленты инцидентов.

Базовый JSON:

```json
{
  "sourceService": "patrol",
  "schemaVersion": "1.0",
  "period": {
    "from": "2026-08-01T00:00:00.000Z",
    "to": "2026-08-18T23:59:59.999Z"
  },
  "scope": {
    "regionId": null,
    "shopId": null
  },
  "items": [
    {
      "shopId": "00000000-0000-4000-8000-000000000004",
      "shopName": "Shop 1",
      "regionId": "00000000-0000-4000-8000-000000000003",
      "status": "green",
      "metrics": {
        "plannedPatrols": 42,
        "completedPatrols": 42,
        "completionRate": 1,
        "onTimeRate": 0.95,
        "cleanPatrolRate": 0.98,
        "attentionRate": 0,
        "submittedReports": 12
      }
    }
  ],
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 1
  }
}
```

`status = attention` означает, что по магазину есть обходы, требующие внимания, или плановые обходы выполнены не полностью. Для расследования пользователь должен перейти в контрольное представление.

Для `Management Trends` доступны CSV/XLSX выгрузки:

- `GET /api/v1/management/metrics/trends/export.xlsx`
- `GET /api/v1/management/metrics/trends/export.csv`

## События для главного ядра

Минимальный набор событий от patrol-сервиса:

- `patrol.started`
- `patrol.completed`
- `patrol.cancelled`
- `patrol.overdue`
- `patrol.incident.created`
- `report.draft_created`
- `report.submitted`
- `report.cancelled`
- `report.file_attached`

В версии 0.3.0 события хранятся в таблице `report_outbox_events`. Publisher может быть выключен или отправлять события в главное ядро через HTTP adapter.

## Outbox

Outbox нужен, чтобы не терять отчетные события при временной недоступности главного ядра.

Минимальные поля таблицы:

- `id`;
- `event_type`;
- `source_service`;
- `schema_version`;
- `payload`;
- `status`: `pending`, `sent`, `failed`;
- `attempt_count`;
- `next_attempt_at`;
- `sent_at`;
- `created_at`.

Publisher выбирает события со статусом `pending` или `failed`, у которых `next_attempt_at` пустой или уже наступил. При успехе выставляется `sent`, при ошибке выставляется `failed`, увеличивается `attempt_count` и рассчитывается следующий retry.

Статус publisher доступен через:

- `GET /api/v1/reports/outbox/status`

Endpoint возвращает счетчики `pending`, `failed`, `sent`, `ready`, lag самой старой неотправленной записи, время последней успешной отправки и текущую конфигурацию publisher. Доступ в версии 0.3.0: `admin`.

Текущий HTTP-контракт:

```http
POST {REPORTING_CORE_URL}/reporting/events
Authorization: Bearer <REPORTING_CORE_API_KEY>
Idempotency-Key: <eventId>
Content-Type: application/json
```

Body содержит полный `Report Envelope`.

## Audit Log

Защищенный журнал действий backend описан в [Audit Log](audit-log.md).

В версии 0.3.0 доступны:

- `GET /api/v1/audit-log`
- `GET /api/v1/audit-log/:id`
- `GET /api/v1/audit-log/export.xlsx`
- `GET /api/v1/audit-log/export.csv`

Доступ: `admin`.

Глобальный interceptor автоматически пишет успешные и неуспешные защищенные `POST`, `PUT`, `PATCH` и `DELETE` запросы. В `meta` сохраняется безопасный контекст: путь, params, query, очищенный body, роль пользователя, длительность запроса, статус `success`/`failure` и код ошибки для неуспешных бизнес-запросов. Секретные поля заменяются на `[redacted]`.

Auth-сценарии пишутся точечно: `auth.login.success`, `auth.login.failure`, `auth.login.rate_limited`, `auth.refresh.success`, `auth.refresh.failure`, `auth.logout.success`. Для `accessKey` сохраняется только fingerprint.

Универсальная учетная запись Настройщика использует отдельный endpoint `POST /api/v1/auth/universal-route-setter/login`. Каждый успешный вход создает `authorizationId`, требует ввод ФИО исполнителя и кладет `authorizationId`/`authorizationFullName` в JWT. Глобальный audit interceptor добавляет эти поля в `audit_log.meta` для последующих действий этой сессии.

## Anonymous Appeals

Раздел СК "Анонимно" описан в [Anonymous Appeals](anonymous.md).

В версии 0.3.0 доступны:

- `POST /api/v1/mobile/anonymous`;
- `GET /api/v1/anonymous`;
- `GET /api/v1/anonymous/:id`;
- `PATCH /api/v1/anonymous/:id`.

Обращение является бизнес-анонимным: карточка и список для `admin`/`inspector` не содержат автора. Технический audit сохраняет факт отправки защищенного запроса, но маскирует текст обращения.

## Диагностические Интерфейсы

Правила доступа к Swagger и health описаны в [Diagnostics Security](diagnostics-security.md).

В версии 0.3.0:

- `GET /api/v1/health` остается публичным и не раскрывает внутренние детали;
- Swagger включен по умолчанию только в `development` и `test`;
- в `production` Swagger выключен по умолчанию;
- если Swagger включается в `production`, backend требует Basic Auth и не стартует без него.

## Архив И Восстановление

Единый backend API архива описан в [Archive](archive.md).

В версии 0.3.0 доступны:

- `GET /api/v1/archive/:resourceType`;
- `POST /api/v1/archive/:resourceType/:id`;
- `POST /api/v1/archive/:resourceType/:id/restore`.

Доступ: `admin`.

Архив является обратимым состоянием. Файлы не удаляются физически при архивировании, чтобы фото контрольных точек и отчетов можно было восстановить. Необратимый `purge` должен быть отдельной будущей операцией с retention-политикой и audit-событием.

## График СК И Локальные Напоминания

Контракт графика для мобильного приложения описан в [Mobile Schedule Plan](mobile-schedule-plan.md).

В версии 0.3.0 доступен:

- `GET /api/v1/mobile/schedule-plan`.

Endpoint возвращает будущие occurrence-ы обходов по активным расписаниям назначенных магазинов СК. Ответ содержит UTC-времена `plannedStartAt`, `availableFrom`, `dueAt` и `notificationAt`, уже рассчитанные с учетом таймзоны магазина и `earlyStartMinutes`. Мобильное приложение должно сохранить этот план локально и поставить локальные уведомления, которые сработают без сети.

## Автоматическое Ожидание NFC

Контракт ожидания NFC описан в [NFC Wait Contract](nfc-wait-contract.md).

В версии 0.3.0 доступны:

- `GET /api/v1/mobile/patrols/active/nfc-wait-state`;
- `GET /api/v1/mobile/patrols/:id/nfc-wait-state`.

Endpoint возвращает режим ожидания, прогресс обхода, следующую ожидаемую точку и контракт отправки scan-события. После старта обхода мобильное приложение должно включать foreground NFC listening без отдельной кнопки сканирования.

## Production Monitoring

Защищенный технический статус описан в [Monitoring](monitoring.md).

В версии 0.3.0 доступен:

- `GET /api/v1/monitoring/status`.

Endpoint доступен только `admin` и возвращает состояние PostgreSQL, Redis, файлового хранилища и report outbox без секретов, connection strings и API keys. Публичным диагностическим endpoint остается только `GET /api/v1/health`.

## Версионирование

- Изменения без удаления полей повышают minor-версию: `1.0` -> `1.1`.
- Удаление или изменение смысла поля требует major-версии: `1.x` -> `2.0`.
- Старые версии payload должны читаться до завершения миграционного периода.
- Excel/CSV могут менять колонки чаще, но JSON-контракт должен быть стабильным.
