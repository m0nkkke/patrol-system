# Mobile — архитектура

## Структура проекта
```
apps/mobile/
  app/                       — экраны (expo-router, файловая маршрутизация)
    _layout.tsx              — корневой layout: провайдеры, redirect по auth, пуши, OTA, офлайн-баннер
    index.tsx                — главная (гейт по роли)
    login.tsx                — вход по ключу доступа
    profile.tsx              — профиль + версия/сборка/канал OTA
    patrol.tsx               — экран обхода (employee)
    history/                 — история обходов (магазин/сотрудник), детали обхода
    incidents.tsx            — нарушения
    shops/                   — список, создание, редактирование магазинов
    users/                   — список, создание, редактирование, привязка магазинов
    route-setup/             — настройка маршрута и привязка NFC
    nfc-replace/             — замена NFC-метки
    schedules/               — расписания обходов
  src/
    api/                     — axios-клиент, обёртки эндпоинтов, типы, infinite-хук
    device/                  — device-id, push, geolocation
    db/                      — expo-sqlite (схема patrol_events)
    features/                — доменные хуки/компоненты (patrol, history, users, shops, ...)
    lib/                     — утилиты (format, debounce, network status, logger)
    store/                   — Zustand auth-store
    storage/                 — SecureStore (токены, deviceId)
    nfc/                     — абстракция NFC-ридера
    theme/                   — цвета, spacing, typography
    ui/                      — UI-кит (AppText, Button, Card, Screen, ...)
```

## Слои данных
- **Серверный стейт** — React Query (`useQuery`/`useInfiniteQuery`/`useMutation`).
  Глобальный клиент в [`src/api/query-client.ts`](../../../apps/mobile/src/api/query-client.ts)
  (`retry: 1`, `staleTime: 30s`, `refetchOnWindowFocus: false`).
- **Auth-стейт** — Zustand ([`src/store/auth-store.ts`](../../../apps/mobile/src/store/auth-store.ts)):
  `status` (`initializing|authenticated|unauthenticated`), `user`, токены.
- **Локальная БД** — expo-sqlite для офлайн-очереди NFC-событий (см. [offline-sync.md](offline-sync.md)).
- **Секреты** — SecureStore (access/refresh токены, deviceId).

## Сетевой слой
[`src/api/client.ts`](../../../apps/mobile/src/api/client.ts) — единый axios-инстанс:
- `baseURL` из `EXPO_PUBLIC_API_BASE_URL` (или `extra.apiBaseUrl`), таймаут 15с.
- Request-interceptor подставляет `Authorization: Bearer <access>`.
- Response-interceptor выполняет silent refresh при 401 (см. [auth-refresh.md](auth-refresh.md))
  и отправляет важные API ошибки в Crashlytics через общий logger (см. [error-logging.md](error-logging.md)).

Каждый домен имеет файл-обёртку `*.api.ts` (возвращает `response.data`) и набор хуков в
`src/features/*/queries.ts`.

## Навигация
`expo-router` — маршрут = файл в `app/`. Переходы через `useRouter().push(...)`.
Типизированные маршруты **отключены** намеренно (`tsconfig` исключает `.expo`), потому что
запущенный Metro перегенерирует `.expo/types` и ломает `tsc`; `router.push` принимает строки.

## Корневой layout
[`app/_layout.tsx`](../../../apps/mobile/app/_layout.tsx) монтирует провайдеры и сквозные
эффекты: `bootstrap()` сессии, redirect по auth-статусу, `startSyncManager()`,
`usePushNotifications()`, `useOtaUpdates()`, `OfflineBanner`, `ErrorBoundary`, `initLogging()`.

## UI-кит и тема
`src/ui` — переиспользуемые компоненты (`AppText`, `Button`, `TextField`, `Card`, `Screen`,
`Header`, `Badge`, `FilterSheet`, `SheetButton`, `ListFooter`, `OfflineBanner`, ...).
Тема — `src/theme` (`colors`, `spacing`, `radius`, `typography`). Карточки списков
мемоизированы (`React.memo`) с `onPress: (entity) => void`.
