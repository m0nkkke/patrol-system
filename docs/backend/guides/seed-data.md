# Seed-данные для ручной проверки

Seed-скрипт создает стабильный набор данных для ручной проверки API через Swagger или HTTP-клиент.

## Что создается

- Регион `Сибирь / ручная проверка`.
- Магазин `Магазин для ручной проверки`.
- Пользователи:
  - `seed.admin`
  - `seed.manager`
  - `seed.employee`
- Постоянные ключи seed-пользователей:
  - `seed.admin` — `SADM-SEED-0001`
  - `seed.manager` — `MNGR-SEED-0001`
  - `seed.employee` — `EMPL-SEED-0001`
- Три NFC-метки:
  - `04a1b2c3d4e501`
  - `04a1b2c3d4e502`
  - `04a1b2c3d4e503`
- Три контрольные точки:
  - `Вход`
  - `Склад`
  - `Электрощитовая`
- Расписание `Ежедневный тестовый обход` на все дни недели с окном `09:00–23:00` по таймзоне магазина.
- Один завершенный обход со всеми событиями.
- Один обход в процессе с одной уже отсканированной точкой.

## Запуск

Перед запуском должны быть подняты PostgreSQL/Redis и применены миграции.

Первая миграция ключей создает bootstrap-админа `system.admin` с ключом `ADMN-0000-0001`, если в базе еще нет ни одного администратора. Seed дополнительно создает демо-пользователей ниже.

На Windows надежнее использовать `127.0.0.1`:


```powershell
$env:DATABASE_HOST='127.0.0.1'
$env:DATABASE_PORT='5432'
$env:DATABASE_USER='patrol'
$env:DATABASE_PASSWORD='patrol'
$env:DATABASE_NAME='patrol'
$env:DATABASE_SSL='false'
npm run backend:migration:run
```

После успешных миграций:

```powershell
$env:DATABASE_HOST='127.0.0.1'
$env:DATABASE_PORT='5432'
$env:DATABASE_USER='patrol'
$env:DATABASE_PASSWORD='patrol'
$env:DATABASE_NAME='patrol'
$env:DATABASE_SSL='false'
npm run backend:seed:manual
```

Скрипт идемпотентный: повторный запуск переиспользует уже созданные seed-записи и не создает дубликаты пользователей, магазина, точек и тестовых обходов.

Если seed сообщает, что не найдены колонки вроде `shops.external_id`, значит база отстала от текущих Entity. Сначала выполните `npm run backend:migration:run`, затем повторите `npm run backend:seed:manual`.

## Как проверять вручную

1. Запустить backend.
2. Открыть Swagger UI: `http://localhost:3000/api/v1/docs`.
3. Выполнить `POST /api/v1/auth/login` с ключом `EMPL-SEED-0001`.
4. Посмотреть точки магазина через `GET /api/v1/patrol-points/shop/:shopId`.
5. Посмотреть обходы через `GET /api/v1/patrols/shop/:shopId`.
6. Для обхода в процессе можно записывать оставшиеся NFC-события через `POST /api/v1/patrols/:id/events`, используя UID из списка выше.

## Мобильные аккаунты

Seed дополнительно создаёт пользователей для ручной проверки mobile API:

- `mobile.admin` / `MADM-SEED-0001` — админский аккаунт для регистрации маршрутов и NFC-меток.
- `mobile.employee` / `MEMP-SEED-0001` — аккаунт обходчика для будущих мобильных сценариев прохождения маршрута.

## Расширенные сценарии для приемки

Для более полной ручной проверки можно запустить сценарный seed:

```powershell
$env:DATABASE_HOST='127.0.0.1'
$env:DATABASE_PORT='5432'
$env:DATABASE_USER='patrol'
$env:DATABASE_PASSWORD='patrol'
$env:DATABASE_NAME='patrol'
$env:DATABASE_SSL='false'
npm run backend:seed:scenarios
```

Он идемпотентен и создает отдельный набор `Демо-*`, не заменяя быстрый `manual-check` seed.

Что добавляется:

- 4 магазина:
  - `Демо - Иркутск` — готовый маршрут на 4 точки;
  - `Демо - Москва` — готовый маршрут на 3 точки;
  - `Демо - Красноярск (настройка маршрута)` — маршрут в процессе настройки, 2 из 4 точек уже привязаны;
  - `Демо - Владивосток (без маршрута)` — магазин без маршрута для проверки `PATROL_ROUTE_NOT_READY`.
- Пользователи:
  - `demo.admin` / `ADMN-DEMO-0001`;
  - `demo.manager.irkutsk` / `MNGR-IRKK-0001`;
  - `demo.manager.moscow` / `MNGR-MSKK-0001`;
  - `demo.employee.irkutsk` / `EMPL-IRKK-0001`;
  - `demo.employee.moscow` / `EMPL-MSKK-0001`;
  - `demo.employee.multi` / `EMPL-MULT-0001`;
  - `demo.employee.inactive` / `EMPL-INAC-0001`.
- Расписания:
  - активное круглосуточное расписание;
  - активное утреннее расписание;
  - отключенное расписание;
  - дневное расписание для второго магазина.
- История обходов:
  - завершенный обход;
  - завершенный обход с `completionReport`;
  - отмененный обход с `cancellationReason`;
  - просроченный обход;
  - активный обход в процессе.
- Инциденты:
  - `short_interval`;
  - `long_interval`;
  - `missed_point`.

Сценарный seed удобен для проверки:

- входа по ролям и неактивного пользователя;
- manager shop-scoping;
- списка магазинов с разными `routeStatus`;
- продолжения активного обхода;
- просмотра истории и инцидентов;
- отчета при завершении и причины отмены;
- продолжения настройки маршрута с точки 3.
