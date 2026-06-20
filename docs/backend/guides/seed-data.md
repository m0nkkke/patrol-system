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
