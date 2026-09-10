# Локальный запуск

## Требования

- Node.js 20 LTS
- npm 10+
- Docker с Docker Compose

## Backend

1. Поднять инфраструктуру:

```bash
docker compose up -d postgres redis
```

2. Установить зависимости:

```bash
npm install
```

3. Запустить миграции. На Windows надежнее использовать `127.0.0.1`, а не `localhost`:

```powershell
$env:DATABASE_HOST='127.0.0.1'
$env:DATABASE_PORT='5432'
$env:DATABASE_USER='patrol'
$env:DATABASE_PASSWORD='patrol'
$env:DATABASE_NAME='patrol'
$env:DATABASE_SSL='false'

npm run backend:migration:run
```

Миграция `1781779000000` перед созданием уникального индекса проверяет дубли активных привязок
NFC. Если одна метка назначена нескольким активным точкам, миграция останавливается с перечнем
конфликтующих `nfc_tag_id`; привязки нужно исправить явно и повторить команду. Миграция не выбирает
точку для отвязки автоматически.

4. Создать локальный env backend:

```powershell
Copy-Item apps/backend/.env.example apps/backend/.env
```

Команды workspace запускают backend из `apps/backend`, поэтому именно этот файл загружается
автоматически. Корневой `.env` проекту не нужен.

5. Запустить backend:

```bash
npm run backend:dev
```

Swagger UI будет доступен на `http://localhost:3000/api/v1/docs`. Локально он включен через `SWAGGER_ENABLED=true`; в production по умолчанию выключен.

## Seed-данные

Для ручной проверки API можно создать тестовый набор данных:

```powershell
$env:DATABASE_HOST='127.0.0.1'
$env:DATABASE_PORT='5432'
$env:DATABASE_USER='patrol'
$env:DATABASE_PASSWORD='patrol'
$env:DATABASE_NAME='patrol'
$env:DATABASE_SSL='false'

npm run backend:seed:manual
```

Подробности описаны в `docs/backend/guides/seed-data.md`.

## Web-панель

Backend использует `API_PREFIX=api/v1`, поэтому локальный API доступен по адресу `http://127.0.0.1:3000/api/v1`.

После запуска backend открыть второй терминал в корне проекта:

```powershell
npm run web:dev
```

Web-панель будет доступна на `http://127.0.0.1:5173`. Для локальной разработки backend должен разрешать оба origin: `http://localhost:5173,http://127.0.0.1:5173`. Подробности и временное ограничение безопасности web-сессии описаны в `docs/web/README.md`.
