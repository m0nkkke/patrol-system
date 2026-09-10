# CI/CD Patrol System

Автоматизация находится в `.github/workflows/ci-cd.yml`, а серверная часть развёртывания — в
`deploy/scripts/deploy-production.sh`.

## Как работает pipeline

Для pull request в `main` GitHub Actions устанавливает зависимости, проверяет типы, запускает lint
mobile и web, тесты backend и mobile, затем собирает backend и web.

После push или merge в `main` те же проверки выполняются повторно. Если они успешны, job `deploy`:

1. подключается к production-серверу по SSH;
2. переводит серверную копию репозитория строго на проверенный commit;
3. запускает серверный deployment-скрипт;
4. собирает Docker-образы backend и web;
5. поднимает PostgreSQL и Redis и ждёт их готовности;
6. выполняет production-миграции и безопасный bootstrap первого администратора;
7. обновляет backend и web;
8. проверяет health endpoint web и API через Nginx gateway.

Одновременно выполняется только один production-деплой. Ручное подтверждение не используется.

## Однократная подготовка сервера

На сервере должны быть установлены Git, Docker Engine, Docker Compose v2 и `flock`. Пользователь
деплоя должен иметь право запускать Docker без `sudo`.

Репозиторий размещается, например, в `/opt/patrol-system`. В нём вручную создаётся
`.env.production` из `.env.production.example`. Этот файл и production-секреты в Git не добавляются.

```bash
cd /opt
git clone git@github.com:m0nkkke/patrol-system.git patrol-system
cd /opt/patrol-system
cp .env.production.example .env.production
```

Для приватного репозитория серверу нужен отдельный read-only deploy key GitHub, чтобы команда
`git fetch origin main` работала без интерактивного ввода. Рабочие изменения непосредственно в
серверной копии репозитория недопустимы: при расхождении истории deployment завершится ошибкой.

Первый запуск после заполнения `.env.production`:

```bash
cd /opt/patrol-system
sh deploy/scripts/deploy-production.sh
```

## Настройка GitHub

В репозитории нужно создать Environment с именем `production` без required reviewers. В нём
задаются secrets:

- `DEPLOY_HOST` — домен или IP production-сервера;
- `DEPLOY_USER` — непривилегированный системный пользователь для деплоя;
- `DEPLOY_PORT` — SSH-порт; если не задан, используется `22`;
- `DEPLOY_SSH_KEY` — закрытый SSH-ключ пользователя деплоя;
- `DEPLOY_KNOWN_HOSTS` — проверенная строка host key production-сервера.

Также задаётся environment variable `DEPLOY_PATH`. Рекомендуемое значение —
`/opt/patrol-system`; если переменная отсутствует, workflow использует этот путь по умолчанию.

Публичный ключ пары `DEPLOY_SSH_KEY` добавляется на сервер в `~/.ssh/authorized_keys`. Host key для
`DEPLOY_KNOWN_HOSTS` получают только после проверки fingerprint сервера. Например:

```bash
ssh-keyscan -p 22 -H patrol.example.ru
```

Pipeline не передаёт на сервер `.env.production`: конфигурация хранится только на production-хосте.

## Ручной повторный запуск серверного этапа

Если код нужного commit уже находится на сервере, тот же сценарий можно безопасно выполнить вручную:

```bash
cd /opt/patrol-system
sh deploy/scripts/deploy-production.sh
```

Скрипт блокирует параллельный запуск, а миграции TypeORM и bootstrap администратора рассчитаны на
повторное выполнение. Он не удаляет volumes, поэтому PostgreSQL, Redis и загруженные файлы
сохраняются между обновлениями.
