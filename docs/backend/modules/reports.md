# Модуль Reports

Модуль `reports` хранит операционные отчеты СК, дает контрольной панели доступ к детальной отчетности и предоставляет первую управленческую витрину с агрегатами. Управленческая витрина строится поверх тех же фактов, но не раскрывает персональные детали.

Архитектурный формат межсервисного обмена описан в [Reporting Contract](reporting-contract.md).

Каждое важное действие с отчетом дополнительно пишет событие в `report_outbox_events`. В версии 0.3.0 outbox хранит события локально, а отправка в главное ядро отчетности будет подключена отдельным publisher.

## Типы отчетов

- `photo_report` — фотоотчет;
- `morning` — утренний отчет;
- `closing` — отчет закрытия;
- `sunday` — воскресный отчет;
- `heating` — отчет отопительного периода;
- `evacuation` — эвакуационный отчет.

## Статусы

- `draft` — черновик, СК может редактировать поля и прикреплять фото;
- `submitted` — отправлен, доступен службе контроля;
- `cancelled` — отменен до отправки.

## Модель данных

`patrol_reports`:

- `report_type`, `status`;
- `shop_id`, `employee_id`;
- `patrol_id`, `route_id`, `schedule_id`, `period`;
- `source_service = patrol`, `schema_version = 1.0`;
- `fields` — JSONB payload конкретного вида отчета;
- `comment`, `cancellation_reason`;
- `submitted_at`, `cancelled_at`, `created_at`, `updated_at`.

`patrol_report_files`:

- `report_id`;
- `file_id` — ссылка на `file_assets`;
- `kind`, сейчас `report_photo`.

Байты фото хранятся через модуль [Files](files.md).

`report_outbox_events`:

- `event_id` — UUID события для идемпотентности;
- `event_type` — `report.draft_created`, `report.file_attached`, `report.submitted`, `report.cancelled`;
- `source_service`, `schema_version`;
- `payload` — полный Report Envelope;
- `status` — `pending`, `sent`, `failed`;
- `attempt_count`, `next_attempt_at`, `sent_at`;
- `created_at`, `updated_at`.

Мониторинг outbox:

- `GET /api/v1/reports/outbox/status` — статус очереди отправки отчетных событий в главное ядро.

Доступ: `admin`.

Ответ содержит:

- `counters.total`, `counters.pending`, `counters.failed`, `counters.sent`, `counters.ready`;
- `lag.oldestUnsentCreatedAt`, `lag.oldestUnsentSeconds`;
- `lastSentAt`;
- текущую конфигурацию publisher: `publishEnabled`, `transport`, `batchSize`, `publishIntervalMs`.

## Outbox Publisher

Publisher отправляет готовые события из `report_outbox_events` в главное ядро отчетности. По умолчанию он выключен.

Конфигурация:

```env
REPORTING_CORE_PUBLISH_ENABLED=false
REPORTING_CORE_TRANSPORT=disabled
REPORTING_CORE_URL=
REPORTING_CORE_API_KEY=
REPORTING_OUTBOX_BATCH_SIZE=50
REPORTING_OUTBOX_PUBLISH_INTERVAL_MS=30000
```

Режимы:

- `disabled` — отправка не выполняется;
- `http` — отправка `Report Envelope` в `POST {REPORTING_CORE_URL}/reporting/events`.

При успешной отправке событие получает `status = sent` и `sent_at`. При ошибке событие получает `status = failed`, увеличивается `attempt_count`, а `next_attempt_at` рассчитывается с экспоненциальной задержкой до 1 часа.

## Mobile Endpoints

Endpoints для СК:

- `POST /api/v1/mobile/reports` — создать черновик отчета;
- `POST /api/v1/mobile/reports/:id/files` — прикрепить фото к черновику;
- `POST /api/v1/mobile/reports/:id/submit` — отправить отчет;
- `POST /api/v1/mobile/reports/:id/cancel` — отменить черновик.

СК может создавать отчеты только по назначенным магазинам. Если отчет привязан к обходу, обход должен принадлежать этому же СК и магазину.

Пример создания:

```json
{
  "reportType": "morning",
  "shopId": "00000000-0000-4000-8000-000000000004",
  "patrolId": "00000000-0000-4000-8000-000000000006",
  "fields": {
    "entranceClean": true,
    "securityPostReady": true
  },
  "comment": "Без замечаний"
}
```

Пример отправки:

```json
{
  "fields": {
    "entranceClean": true,
    "securityPostReady": true,
    "comment": "Без замечаний"
  }
}
```

## Control Endpoints

Endpoints для службы контроля:

- `GET /api/v1/control/shops/:shopId/overview`;
- `GET /api/v1/control/staff`;
- `GET /api/v1/control/staff/:id`;
- `GET /api/v1/control/patrols`;
- `GET /api/v1/control/patrols/:id`;
- `GET /api/v1/control/incidents`;
- `GET /api/v1/control/incidents/:id`;
- `GET /api/v1/control/incidents/export.csv`;
- `GET /api/v1/control/incidents/export.xlsx`;
- `GET /api/v1/control/reports`;
- `GET /api/v1/control/reports/:id`;
- `GET /api/v1/control/reports/export.csv`;
- `GET /api/v1/control/reports/export.xlsx`.

`GET /api/v1/control/shops/:shopId/overview` returns the inspector shop card for the last 14 days. It includes:

- `shop` - shop profile, region, route status and registered point count;
- `stats` - total/completed/overdue/cancelled patrols, completion rate and incident count;
- `staff` - active users assigned to the shop;
- `recentPatrols` - latest patrol history with employee, route, schedule and progress;
- `recentIncidents` - latest triggers and incident severity;
- `reportSummary` - report counters grouped by `reportType` and `status`;
- `recentReports` - latest operational reports with file count.

Access: `admin`, `inspector`. Inspector access is limited to assigned shops.

`GET /api/v1/control/staff` возвращает список сотрудников в назначениях, включая неактивных, но
не включает пользователей с ролью `inspector`. Проверяющие работают с этим списком как с объектом
контроля, а управляются администратором через общий раздел пользователей. Фильтры: `shopId`, `role`,
`isActive`, `search`, `page`, `limit`, `sort`. Поддерживается сортировка по `fullName`, `role` и
`isActive`.

`GET /api/v1/control/staff/:id` возвращает ФИО, роль, активность, основной магазин и объединенный
список назначенных магазинов. Для `inspector` хотя бы одно назначение сотрудника должно пересекаться
с областью доступа Проверяющего, а в ответ попадают только магазины из этого пересечения. Если
основной магазин сотрудника недоступен Проверяющему, `primaryShopId` возвращается как `null`.
То же ограничение применяется к строкам `GET /api/v1/control/staff`. Администратор видит все
назначения. Read model не содержит ключей доступа, username, sessionVersion, refresh-сессий,
push-токенов или идентификаторов устройств.

`GET /api/v1/control/patrols` возвращает общую историю обходов в области доступа проверяющего. Фильтры: `shopId`, `employeeId`, `routeId`, `status`, `from`, `to`, `search`, `page`, `limit`, `sort`. Строка истории содержит магазин, сотрудника, маршрут, период, прогресс точек, длительность, норматив маршрута и счетчики связанных инцидентов и отчетов.

`GET /api/v1/control/patrols/:id` возвращает карточку расследования обхода: хронологию, посещения точек с парой входного и выходного NFC-сканов, все NFC-события, инциденты, связанные отчеты и рассчитанный профиль нормативного времени маршрута. Для `inspector` доступ ограничен назначенными магазинами.

Доступ: `admin`, `inspector`. Для `inspector` данные ограничены назначенными магазинами.

Фильтры списка:

- `shopId`;
- `employeeId`;
- `patrolId`;
- `reportType`;
- `status`;
- `period`;
- `from`, `to`;
- `search`;
- `page`, `limit`;
- `sort`: `createdAt:desc`, `createdAt:asc`, `submittedAt:desc`, `submittedAt:asc`.

Control export использует те же фильтры и права, что и список отчетов. В выгрузку попадают детальные поля: ID отчета, тип, статус, магазин, ФИО сотрудника, период, связи с обходом/маршрутом/расписанием, количество файлов, комментарий и причина отмены.

JSON-ответы `control/reports` используют отдельный безопасный read model. Файлы представлены полями `id`, `kind`, `mimeType`, `originalName`, `sizeBytes`, `width`, `height`, `createdAt`, `url`. Внутренние `storageKey`, checksum и название storage backend в API не возвращаются. Байты фотографии выдаются только через защищенный `GET /api/v1/files/:id` с bearer-авторизацией.

Control incidents дают Проверяющему отдельное представление нарушений и подозрительных обходов.

Фильтры списка:

- `shopId`;
- `employeeId`;
- `patrolId`;
- `type`: `short_interval`, `long_interval`, `missed_point`, `patrol_overdue`, `point_dwell_too_short`, `route_suspiciously_fast`, `route_too_fast`, `route_too_slow`, `schedule_deviation`;
- `severity`: `info`, `warning`, `critical`;
- `from`, `to`;
- `search`;
- `page`, `limit`;
- `sort`: `createdAt:desc`, `createdAt:asc`, `type:asc`, `type:desc`.

Для `inspector` список и карточка ограничены назначенными магазинами. Ответ содержит инцидент, вычисленную `severity`, магазин, сотрудника, обход, маршрут, категорию маршрута, период, связанное NFC-событие и контрольные точки. `missed_point`, `patrol_overdue` и `route_suspiciously_fast` считаются `critical`; остальные текущие триггеры — `warning`.

Control incidents export использует те же фильтры и права, что и список. В выгрузку попадают детальные поля расследования: ID инцидента, тип, severity, сообщение, магазин, ФИО сотрудника, обход, маршрут, период, точки, NFC UID, устройство и время сканирования.

## Management Endpoints

Endpoint для руководства:

- `GET /api/v1/management/metrics`;
- `GET /api/v1/management/metrics/breakdown`;
- `GET /api/v1/management/metrics/breakdown/export.csv`;
- `GET /api/v1/management/metrics/breakdown/export.xlsx`;
- `GET /api/v1/management/metrics/trends`;
- `GET /api/v1/management/metrics/trends/export.csv`;
- `GET /api/v1/management/metrics/trends/export.xlsx`;
- `GET /api/v1/management/metrics/export.csv`;
- `GET /api/v1/management/metrics/export.xlsx`.
- `GET /api/v1/management/scorecards/shops`;
- `GET /api/v1/management/scorecards/shops/export.csv`;
- `GET /api/v1/management/scorecards/shops/export.xlsx`.

Доступ в версии 0.3.0: `admin`.

Фильтры:

- `from`, `to`;
- `shopId`;
- `regionId`.

Ответ не содержит ФИО, фото, комментарии или сырые инциденты. Состав метрик:

- `registeredPatrols` — все зарегистрированные обходы, включая внеплановые;
- `completedPatrols`;
- `completionRate`;
- `onTimePatrols`;
- `onTimeRate`;
- `cleanPatrols`;
- `cleanPatrolRate`;
- `attentionPatrols`;
- `attentionRate`;
- `greenShopCount`;
- `attentionShopCount`;
- `averageCompletionSeconds`;
- `submittedReports`.

Trends endpoint возвращает динамику тех же метрик по бакетам времени. Дополнительный фильтр:

- `bucket`: `day`, `week`, `month`.

Каждый элемент `items` содержит `bucketStart` и агрегированные `metrics`.

Trends export использует те же фильтры, что и JSON endpoint, и возвращает строку на каждый bucket.

Breakdown endpoint возвращает те же метрики в разрезе маршрутов или периода обхода. Дополнительный фильтр:

- `groupBy`: `routeCategory`, `period`.

Для `groupBy=routeCategory` ответ содержит группы `internal`, `external`. Для `groupBy=period` — `morning`, `noon`, `evening`. Отсутствующие за период группы возвращаются с нулевыми метриками, чтобы веб-панель могла строить стабильные графики и таблицы.

Breakdown export использует те же фильтры, что и JSON endpoint, и возвращает строку на каждую группу.

Management export использует те же фильтры, что и JSON endpoint, и содержит только агрегированные показатели.

Shop scorecards дают построчную управленческую витрину по магазинам. Ответ содержит:

- `shopId`, `shopName`, `regionId`;
- `status`: `green`, `attention` или `no_data`;
- `registeredPatrols`, `completedPatrols`, `completionRate`;
- `onTimePatrols`, `onTimeRate`;
- `cleanPatrols`, `cleanPatrolRate`;
- `attentionPatrols`, `attentionRate`;
- `averageCompletionSeconds`;
- `submittedReports`;
- `page`, `limit`, `total`.

Фильтры scorecards:

- `from`, `to`;
- `shopId`;
- `regionId`;
- `page`, `limit`;
- `sort`: `shopName:asc`, `shopName:desc`, `completionRate:asc`, `completionRate:desc`, `onTimeRate:asc`, `onTimeRate:desc`, `cleanPatrolRate:asc`, `cleanPatrolRate:desc`, `attentionRate:asc`, `attentionRate:desc`, `status:asc`, `status:desc`.

Scorecard export использует те же фильтры и не содержит ФИО, фото, комментарии или сырые инциденты.

## Доменные ошибки

- `PATROL_REPORT_FORBIDDEN` — пользователь не может создать или изменить отчет;
- `CONTROL_INCIDENTS_FORBIDDEN` — пользователь не может смотреть контрольные инциденты;
- `PATROL_REPORT_CONTROL_FORBIDDEN` — пользователь не может смотреть контрольную отчетность;
- `MANAGEMENT_METRICS_FORBIDDEN` — пользователь не может смотреть управленческие метрики;
- `MANAGEMENT_BREAKDOWN_FORBIDDEN` — пользователь не может смотреть управленческие разрезы;
- `MANAGEMENT_SCORECARDS_FORBIDDEN` — пользователь не может смотреть управленческие scorecards;
- `MANAGEMENT_TRENDS_FORBIDDEN` — пользователь не может смотреть управленческую динамику;
- `REPORT_OUTBOX_MONITORING_FORBIDDEN` — пользователь не может смотреть статус outbox publisher;
- `PATROL_REPORT_PATROL_FORBIDDEN` — отчет пытаются связать с чужим обходом или магазином;
- `PATROL_REPORT_NOT_DRAFT` — действие разрешено только для черновика;
- `PATROL_REPORT_ALREADY_SUBMITTED` — отправленный отчет нельзя отменить через mobile endpoint;
- `FILE_REQUIRED` — файл фото не передан.
