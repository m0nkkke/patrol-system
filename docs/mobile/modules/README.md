# Mobile — документация

Android-приложение Patrol System (`apps/mobile`). Expo SDK 56, React Native, New
Architecture, TypeScript, `expo-router`.

Стек и отклонения от целевой архитектуры зафиксированы в
[`docs/CONSTITUTION.md` §0](../../CONSTITUTION.md).

## Документы по подсистемам
- [architecture.md](architecture.md) — структура проекта, слои, роли, навигация, состояние
- [offline-sync.md](offline-sync.md) — офлайн-очередь NFC-событий на expo-sqlite и синхронизация
- [nfc.md](nfc.md) — чтение NFC-меток и сопоставление с точками маршрута
- [auth-refresh.md](auth-refresh.md) — вход по ключу, хранение токенов, тихий refresh
- [push-notifications.md](push-notifications.md) — регистрация push-токена, обработка нажатий, настройка FCM
- [data-fetching.md](data-fetching.md) — серверный поиск, фильтры, сортировка, infinite scroll
- [ota-updates.md](ota-updates.md) — OTA-обновления через expo-updates
- [error-logging.md](error-logging.md) — крэш-репортинг и JS error logging через Firebase Crashlytics

Инструкция по запуску и сборке — [`apps/mobile/README.md`](../../../apps/mobile/README.md).

## Роли (продуктовая логика)
- **admin** — весь функционал: магазины, пользователи, маршруты, замена NFC, расписания, история, нарушения.
- **manager** (проверяющий) — история обходов и нарушения своего магазина; настройка маршрута/расписаний своего магазина.
- **employee** (обходчик) — прохождение обхода (NFC-сканы, офлайн-очередь).

Главный экран ([`app/index.tsx`](../../../apps/mobile/app/index.tsx)) гейтит карточки по
`user.role`. Жёсткой блокировки порядка точек нет — пропуск точки фиксируется сервером
как инцидент `missed_point`.

## Ключевые принципы
- `@patrol/shared` импортируется **только как типы** (`import type`) — иначе ломается бандлер RN.
- Без комментариев в коде, кроме объяснения «почему» для нетривиальной логики (антифрод, офлайн-синк).
- Каждое изменение проверяется: `npm run typecheck -w @patrol/mobile` и `npm run lint -w @patrol/mobile` (оба exit 0).
