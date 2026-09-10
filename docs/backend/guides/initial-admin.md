# Первый production-администратор

Production-миграции создают только структуру базы данных и не содержат готовых учётных данных.
Первый администратор создаётся отдельной командой после применения миграций.

## Конфигурация

В `.env.production` необходимо временно заполнить:

```env
BOOTSTRAP_ADMIN_USERNAME=system.admin
BOOTSTRAP_ADMIN_FULL_NAME=Главный администратор
BOOTSTRAP_ADMIN_ACCESS_KEY=K7QM-9XPT-4RWD
```

Пример ключа является только иллюстрацией и не должен использоваться. Нужен случайный ключ из 12
латинских букв и цифр. Mobile отображает и принимает его в формате `XXXX-XXXX-XXXX`.

## Запуск в production-контейнере

Сначала применяются миграции, затем выполняется bootstrap:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  npm run migration:run:prod -w @patrol/backend

docker compose --env-file .env.production -f docker-compose.prod.yml exec backend \
  npm run admin:bootstrap:prod -w @patrol/backend
```

Команда выполняется транзакционно и защищена от одновременного запуска. Возможные результаты:

- `created` — создан первый администратор;
- `restored` — восстановлена ранее удалённая или отключённая административная учётная запись;
- `skipped` — активный администратор уже существует, база не изменена.

Ключ не записывается в журнал команды. После успешного bootstrap значение
`BOOTSTRAP_ADMIN_ACCESS_KEY` удаляется из `.env.production`, затем backend пересоздаётся:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate backend
```

В дальнейшем администраторы создаются и управляются через штатный интерфейс приложения. Повторно
использовать bootstrap для обычного добавления администраторов не следует.
