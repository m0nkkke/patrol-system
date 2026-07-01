# Production-деплой backend на VPS

Инструкция описывает первый деплой backend Patrol System на VPS с Docker Compose, PostgreSQL, Redis и Nginx. Документ рассчитан на Ubuntu 22.04/24.04 и сервер уровня 2 CPU / 4 GB RAM / 30 GB SSD.

## Состав production-стека

- `backend` — NestJS API, доступен на хосте только через `127.0.0.1:3000`.
- `postgres` — PostgreSQL 15, порт наружу не публикуется.
- `redis` — Redis 7 с паролем и AOF, порт наружу не публикуется.
- `nginx` — reverse proxy на хосте, принимает HTTPS и проксирует в backend.
- `certbot` — выпуск и продление Let's Encrypt сертификата.

## Подготовка VPS

Обновить систему и поставить базовые пакеты:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git nginx certbot python3-certbot-nginx ufw
```

Установить Docker по официальной инструкции Docker для Ubuntu, затем проверить:

```bash
docker --version
docker compose version
```

Настроить firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

PostgreSQL, Redis и backend-порт `3000` не нужно открывать наружу.

## Размещение проекта

Рекомендуемый путь на сервере:

```bash
sudo mkdir -p /opt/patrol-system
sudo chown -R "$USER":"$USER" /opt/patrol-system
cd /opt/patrol-system
git clone <repo-url> .
```

Перед первым запуском убедиться, что в репозитории есть:

- `apps/backend/Dockerfile`
- `docker-compose.prod.yml`
- `.env.production.example`
- `deploy/nginx/patrol-api.conf`
- `deploy/scripts/backup-postgres.sh`

## Production env

Создать файл `.env.production` на сервере:

```bash
cp .env.production.example .env.production
nano .env.production
```

Обязательные значения для замены:

```env
DATABASE_PASSWORD=<сильный пароль PostgreSQL>
REDIS_PASSWORD=<сильный пароль Redis>
JWT_ACCESS_SECRET=<секрет длиной минимум 64 символа>
JWT_REFRESH_SECRET=<другой секрет длиной минимум 64 символа>
CORS_ORIGINS=https://api.example.ru
```

Секреты можно сгенерировать так:

```bash
openssl rand -base64 64
```

Для production оставить:

```env
NODE_ENV=production
API_PREFIX=api/v1
DATABASE_HOST=postgres
REDIS_HOST=redis
```

Seed-скрипты на production не запускать автоматически. Тестовые данные допустимы только вручную и только для staging/demo.

## Первый запуск

Собрать и поднять контейнеры:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
```

Проверить состояние:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f backend
```

Запустить миграции:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  npm run migration:run -w @patrol/backend
```

Проверить health endpoint локально на сервере:

```bash
curl http://127.0.0.1:3000/api/v1/health
```

Ожидаемый ответ:

```json
{"ok":true}
```

## Nginx и HTTPS

В файле `deploy/nginx/patrol-api.conf` заменить `api.example.ru` на реальный домен API.

Скопировать конфиг:

```bash
sudo cp deploy/nginx/patrol-api.conf /etc/nginx/sites-available/patrol-api.conf
sudo ln -s /etc/nginx/sites-available/patrol-api.conf /etc/nginx/sites-enabled/patrol-api.conf
sudo nginx -t
sudo systemctl reload nginx
```

Выпустить сертификат:

```bash
sudo certbot --nginx -d api.example.ru
```

После выпуска сертификата снова проверить:

```bash
curl https://api.example.ru/api/v1/health
```

Swagger доступен по:

```text
https://api.example.ru/api/v1/docs
```

Если Swagger не должен быть публичным на production, его нужно закрывать отдельно на уровне Nginx или backend-конфигурации.

## Обновление версии

Типовой деплой новой версии:

```bash
cd /opt/patrol-system
git pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  npm run migration:run -w @patrol/backend
curl http://127.0.0.1:3000/api/v1/health
```

Если миграция не требуется, команда просто сообщит, что новых миграций нет.

## Бэкапы PostgreSQL

Скрипт `deploy/scripts/backup-postgres.sh` делает `pg_dump` в custom-формате и удаляет локальные копии старше `RETENTION_DAYS`.

Первый ручной запуск:

```bash
chmod +x deploy/scripts/backup-postgres.sh
APP_DIR=/opt/patrol-system BACKUP_DIR=/opt/patrol-backups/postgres ./deploy/scripts/backup-postgres.sh
```

Cron для ежедневного бэкапа в 03:15:

```bash
crontab -e
```

Добавить:

```cron
15 3 * * * APP_DIR=/opt/patrol-system BACKUP_DIR=/opt/patrol-backups/postgres /opt/patrol-system/deploy/scripts/backup-postgres.sh >> /opt/patrol-backups/backup.log 2>&1
```

Локальный бэкап на том же VPS защищает от ошибок приложения, но не защищает от потери сервера. Для production нужно дополнительно выгружать дампы во внешнее хранилище: S3, Яндекс Object Storage или другой сервер.

Восстановление дампа:

```bash
set -a
. ./.env.production
set +a
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T postgres \
  pg_restore -U "$DATABASE_USER" -d "$DATABASE_NAME" --clean --if-exists < /path/to/patrol.dump
```

Перед восстановлением production-базы обязательно сделать свежий дамп текущего состояния.

## Минимальный чеклист перед отдачей mobile-команде

- `https://<api-domain>/api/v1/health` возвращает `{"ok":true}`.
- Миграции выполнены без ошибок.
- В production `.env.production` указаны новые JWT-секреты, не локальные значения.
- PostgreSQL и Redis не доступны из интернета.
- `POST /api/v1/auth/login` работает с bootstrap-админом или созданным админом.
- `GET /api/v1/mobile/profile` работает с JWT.
- `POST /api/v1/mobile/devices/push-token` принимает Expo token, если push включены.
- Cron-бэкап настроен и хотя бы один дамп создан.
- Mobile-разработчикам передан базовый URL API: `https://<api-domain>/api/v1`.
