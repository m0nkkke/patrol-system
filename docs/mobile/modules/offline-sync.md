# Mobile — офлайн-синхронизация

NFC-события обхода **никогда не теряются** из-за отсутствия сети: они пишутся в локальную
БД и фоном отправляются на сервер.

## Хранилище
- БД: `expo-sqlite`, таблица `patrol_events`, ключевое поле `queue_status`
  (`pending` → `synced`). Схема в [`src/db`](../../../apps/mobile/src/db).
- Слой спрятан за тремя точками входа в [`src/features/patrol/offline/`](../../../apps/mobile/src/features/patrol/offline):
  - `local-events.ts` → `createLocalEvent()` — INSERT нового скана (`queue_status = 'pending'`).
  - `use-local-events.ts` → `useLocalPatrolEvents(patrolId)` — реактивный список событий обхода
    через `addDatabaseChangeListener`.
  - `use-pending-events.ts` → `usePendingEventCount()` — глобальный счётчик `pending` (для индикатора).
  - `sync.ts` → `syncPendingEvents()` — батч-отправка `pending`-событий, группировка по `patrolId`.

## Поток скана
1. Сотрудник сканирует NFC → `recordUid()` валидирует точку (см. [nfc.md](nfc.md)).
2. `createLocalEvent()` пишет событие в SQLite (мгновенно) + best-effort GPS-координаты.
3. UI обновляется реактивно (точка → «Отмечена»), показывается прогресс.
4. `requestSync()` триггерит фоновую отправку.

## Менеджер синхронизации
[`sync-manager.ts`](../../../apps/mobile/src/features/patrol/offline/sync-manager.ts)
запускается из корневого layout (`startSyncManager`) и вызывает `syncPendingEvents()` при:
- появлении сети (`@react-native-community/netinfo`),
- возврате приложения в active (`AppState`),
- интервале 30с,
- явном `requestSync()` после скана.

Отправка идёт только при наличии access-токена. События остаются `pending` при ошибке и
будут отправлены при следующем триггере.

## Идемпотентность (контракт с сервером)
`POST /api/v1/mobile/patrols/:id/events/sync` принимает массив событий с клиентским `localId`
(UUID, сгенерирован на устройстве). Сервер использует UNIQUE-ограничение по `client_local_id`
и отвечает идемпотентно — повторная отправка того же `localId` не создаёт дублей. Конфликты
(точка деактивирована/переназначена после скана, поздняя синхронизация, рассинхрон часов)
сервер разрешает добавлением флагов (`point_deactivated_after_scan`, `late_sync`), а не отказом.
См. [`CONSTITUTION.md` §16](../../CONSTITUTION.md).

## Индикаторы офлайна
- Глобальный `OfflineBanner` (по NetInfo) в корневом layout.
- На главной (`PatrolHomeWidget`) — «Не отправлено сканов: N» с тапом на синхронизацию.
- На экране обхода — счётчик ожидающих синхронизации точек текущего обхода.

## Известное ограничение
Старт/завершение/отмена обхода (`patrols/start|complete|cancel`) выполняются **только онлайн**.
Сами сканы кладутся в офлайн-очередь, но завершение обхода без сети не пройдёт (на обсуждении).
