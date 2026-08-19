# Backend Structure

Документ фиксирует правила раскладки backend-модулей после подготовки версии 0.3.0.

## Общий принцип

Модуль остается плоским, пока в нем одна основная ответственность и до 5-7 файлов. Подпапки добавляются, когда внутри модуля появляются разные рабочие области: публичный API, read model, export, фоновые задачи, адаптеры внешней инфраструктуры.

Не нужно дробить папку только ради одинакового шаблона. Если `shops`, `users` или `notifications` читаются быстрее в плоском виде, они остаются плоскими.

## Reports

`apps/backend/src/modules/reports` разделен по назначению отчетности:

- `operational/` - мобильные endpoints и основная работа с операционными отчетами СК;
- `control/` - контрольное представление для проверяющих: отчеты и инциденты;
- `management/` - агрегированные метрики, динамика, разрезы и scorecards для руководства;
- `export/` - CSV/XLSX выгрузки;
- `outbox/` - события для будущего главного ядра отчетности и publisher-monitoring;
- `entities/` - TypeORM-сущности отчетов и outbox.

Корневой `reports.module.ts` остается точкой сборки Nest-модуля.

## Patrols

`apps/backend/src/modules/patrols` сохраняет core-файлы обходов в корне:

- `patrols.controller.ts`;
- `patrols.service.ts`;
- `patrols.repository.ts`;
- `patrols.module.ts`.

Отдельные области вынесены в подпапки:

- `routes/` - маршруты обхода и состав точек;
- `schedules/` - расписания, доступность и план для локальных напоминаний;
- `overdue/` - фоновая обработка просроченных обходов;
- `entities/` - TypeORM-сущности обходов, маршрутов, расписаний, событий и инцидентов.

## Auth

`apps/backend/src/modules/auth` разделяет вход пользователя и жизненный цикл сессий:

- корень - `auth.controller.ts`, `auth.service.ts`, `auth.module.ts`, типы авторизации;
- `sessions/` - refresh-token store, Redis provider, репозиторий refresh-токенов, отзыв сессий и репозиторий уникальных авторизаций универсального Настройщика;
- `entities/` - сущности refresh-токена и universal-auth session.

## Anonymous

`apps/backend/src/modules/anonymous` пока остается плоским модулем:

- `anonymous-appeals.controller.ts`;
- `anonymous-appeals.service.ts`;
- `anonymous-appeals.repository.ts`;
- `anonymous-appeals.module.ts`;
- `entities/anonymous-appeal.entity.ts`.

Модуль закрывает раздел СК "Анонимно": создание обращения из mobile API и просмотр/смену статуса для `admin` и `inspector`.

## Files

`apps/backend/src/modules/files` оставляет публичный API файлов в корне:

- `files.controller.ts`;
- `files.service.ts`;
- `file-assets.repository.ts`;
- `files.module.ts`.

Инфраструктурные части вынесены отдельно:

- `storage/` - контракт `FileStoragePort` и адаптеры `local`/`object`;
- `processing/` - сжатие и нормализация изображений;
- `entities/` - сущность файла.

Так локальное хранение остается основным вариантом для текущего этапа, а объектное хранилище остается переключаемым адаптером.

## Audit

`apps/backend/src/modules/audit` сохраняет основную работу с audit log в корне:

- `audit-log.controller.ts`;
- `audit-log.service.ts`;
- `audit-log.repository.ts`;
- `audit-log.module.ts`.

Отдельные части:

- `export/` - CSV/XLSX выгрузки журнала;
- `interceptors/` - глобальная запись защищенных business-запросов;
- `entities/` - сущность audit log.

## Правила на будущее

- Новый controller кладется рядом с тем service, который обслуживает его сценарий.
- Shared entity остается в `entities/`, если используется несколькими подпапками модуля.
- Export-логика не должна жить в control/management service, чтобы API-представление и файловая выгрузка не смешивались.
- Infrastructure adapters кладутся в отдельную подпапку (`storage`, `outbox`, `sessions`), если их можно будет заменить.
- Если подпапка начинает содержать больше 10-12 файлов, стоит рассмотреть вложенный Nest-модуль или дополнительное разбиение по сценариям.
