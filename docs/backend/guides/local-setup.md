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

4. Для запуска приложения создать `.env` на основе `.env.example` и заменить JWT-секреты на значения длиной 64+ символа.

5. Запустить backend:

```bash
npm run backend:dev
```

Swagger UI будет доступен на `http://localhost:3000/api/v1/docs`.

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
