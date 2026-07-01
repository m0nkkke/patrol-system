# Mobile — авторизация и тихий refresh

## Вход
Вход по **ключу доступа** (маска `XXXX-XXXX-XXXX`, 12 символов, только `[A-Z0-9]`,
авто-дефисы — [`src/features/auth/access-key.ts`](../../../apps/mobile/src/features/auth/access-key.ts)).
`signIn(accessKey)` → `POST /api/v1/auth/login` с `{ accessKey, deviceId }` → сохраняет токены
в SecureStore и грузит профиль (`GET /api/v1/mobile/me`).

`deviceId` — стабильный UUID, генерируется один раз и хранится в SecureStore
([`src/device/device-id.ts`](../../../apps/mobile/src/device/device-id.ts)).

## Хранение токенов
[`src/storage/secure-store.ts`](../../../apps/mobile/src/storage/secure-store.ts) — access/refresh
в `expo-secure-store`. В памяти токены держит Zustand-стор
([`src/store/auth-store.ts`](../../../apps/mobile/src/store/auth-store.ts)).

## Тихий refresh (silent refresh)
Access-токен живёт 15 минут. При `401` axios-interceptor
([`src/api/client.ts`](../../../apps/mobile/src/api/client.ts)) один раз прозрачно обновляет токен
и повторяет исходный запрос:
- флаг запроса `_retried` защищает от повторов;
- параллельные 401 дедуплицируются одним промисом refresh (`refreshing ??= ...`);
- запросы самого refresh/logout помечены `skipAuthRefresh: true`, чтобы не зациклиться;
- если refresh не удался — вызывается `unauthorizedHandler` → `signOut()`.

Зависимости стор↔клиент связываются через сеттеры: `setTokenProvider`, `setUnauthorizedHandler`,
`setRefreshHandler` (вызываются один раз при инициализации стора).

## Выход
`signOut()` отзывает refresh на сервере (`POST /api/v1/auth/logout`, `skipAuthRefresh`), чистит
SecureStore, сбрасывает пользователя в logger/Crashlytics и переводит `status` в `unauthenticated` (корневой
layout редиректит на `/login`).

## Профиль и роли
`GET /api/v1/mobile/me` возвращает `user` (+ `role`, `shopId`, `username`) и `capabilities`.
Роль определяет доступные экраны (см. [README.md](README.md)).
