# Файлы окружения

В проекте используются отдельные env-файлы для каждого запускаемого приложения. Рабочие файлы с
реальными значениями не коммитятся; рядом хранится только соответствующий `.env.example`.

| Файл | Назначение | Нужен постоянно |
|---|---|---|
| `apps/backend/.env` | Локальный запуск NestJS, миграций и seed-команд | Только разработчику backend |
| `apps/mobile/.env` | Локальный API URL для Expo/React Native | Только разработчику mobile |
| `apps/web/.env` | Локальное переопределение API URL для Vite | Нет, есть рабочее значение по умолчанию |
| `.env.production` | Весь production Docker Compose на сервере | Да, только на сервере |

Файлы-примеры:

- `apps/backend/.env.example` соответствует локальному backend;
- `apps/mobile/.env.example` соответствует локальному mobile;
- `apps/web/.env.example` соответствует локальной web-панели;
- `.env.production.example` соответствует серверному Docker Compose.

Корневой `.env` и дополнительные файлы вроде `apps/backend/.env.production` проекту не нужны.
Production web получает `VITE_API_URL=/api/v1` как аргумент Docker-сборки. Облачные mobile-сборки
получают `EXPO_PUBLIC_API_BASE_URL` и `GOOGLE_SERVICES_JSON` из соответствующего EAS environment,
а не из локального `.env`.

Все `.env*` исключены из Git, Docker build context и EAS Build context. Исключение в Git сделано
только для файлов `.env.example`. Значения с префиксами `EXPO_PUBLIC_` и `VITE_` попадают в
клиентский JavaScript и не должны содержать секреты.
