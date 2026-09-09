# Production-развёртывание Patrol System

Production-стек запускает web-панель, API, PostgreSQL и Redis отдельными контейнерами. Единственная
точка входа на хосте — web gateway на `127.0.0.1:8080`.

Compose использует отдельное имя проекта `patrol-system-prod`, поэтому его контейнеры, сети и
volumes не пересекаются с локальным development-стеком.

## Состав стека

- `web` — Nginx, который раздаёт React/Vite SPA и проксирует `/api/*` в backend;
- `backend` — NestJS API, доступный только внутри Docker-сети;
- `postgres` — основная база данных без опубликованного порта;
- `redis` — внутреннее хранилище служебного состояния с паролем и AOF;
- `backend_storage` — постоянный volume для загруженных файлов.

PostgreSQL и Redis подключены к изолированной сети `data`. Web подключён к сети `edge`. Backend
связывает обе сети, но наружу напрямую не публикуется.

## Конфигурация

Создать deployment-конфигурацию из примера:

```bash
cp .env.production.example .env.production
```

В `.env.production` задаются пароли PostgreSQL и Redis, разные JWT-секреты длиной не менее 64
символов, разрешённый web origin и остальные серверные параметры. Файл не коммитится.

`WEB_PORT` задаёт локальный порт gateway и по умолчанию равен `8080`. Web использует относительный
адрес `/api/v1`, поэтому домен API не встраивается в его JavaScript bundle.

## Сборка и запуск

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Состояние и логи:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f web
```

Production-образ backend не содержит dev-зависимостей. Миграции выполняются по скомпилированному
JavaScript:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  npm run migration:run:prod -w @patrol/backend
```

Проверка единой точки входа:

```bash
curl http://127.0.0.1:8080/healthz
curl http://127.0.0.1:8080/api/v1/health
```

Панель открывается по адресу `http://127.0.0.1:8080`. Прямые маршруты, например `/reports` и
`/management`, обрабатываются SPA fallback.

## VPS и HTTPS

На VPS контейнерный gateway остаётся привязанным к `127.0.0.1:8080`. Хостовый Nginx принимает
HTTPS и пересылает весь трафик в gateway. Шаблон находится в
`deploy/nginx/patrol-system.conf`.

После замены `patrol.example.ru` на рабочий домен:

```bash
sudo cp deploy/nginx/patrol-system.conf /etc/nginx/sites-available/patrol-system.conf
sudo ln -s /etc/nginx/sites-available/patrol-system.conf /etc/nginx/sites-enabled/patrol-system.conf
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d patrol.example.ru
```

После выпуска сертификата сайт доступен на `https://patrol.example.ru`, а mobile API — на
`https://patrol.example.ru/api/v1`.

## Обновление

```bash
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  npm run migration:run:prod -w @patrol/backend
curl http://127.0.0.1:8080/api/v1/health
```

Миграции запускаются после успешной сборки и старта сервисов. Если новых миграций нет, TypeORM
завершает команду без изменения схемы.

## Остановка и данные

Остановить стек с сохранением базы и файлов:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml down
```

Команда с `--volumes` удаляет постоянные данные и для обычной остановки не используется.

Резервная копия PostgreSQL создаётся скриптом `deploy/scripts/backup-postgres.sh`. Загруженные
файлы находятся отдельно в volume `backend_storage` и должны резервироваться независимо от базы.

## Ограничение web-аутентификации

Контейнерная схема готова для production-размещения, но текущий web-клиент хранит access и refresh
tokens в `sessionStorage`. Публичный production-релиз панели выполняется после перехода на
защищённую cookie-сессию согласно `docs/web/security.md`. Это ограничение не относится к mobile
APK и не мешает закрытому тестированию панели на демонстрационных данных.
