# Mobile — push-уведомления

Бэкенд рассылает пуши админам/менеджерам магазина (инцидент / просрочка / отмена обхода).
Путь доставки: **бэкенд (VDS) → Expo Push (exp.host) → FCM (Google) → телефон**. Бэкенд не
обращается к устройству напрямую — он лишь шлёт запрос в Expo со списком токенов.

## Код приложения
- [`src/device/push.ts`](../../../apps/mobile/src/device/push.ts):
  - `setNotificationHandler` (показывать баннер/звук в foreground);
  - `registerPushToken()` — настраивает Android-канал, запрашивает разрешение, получает Expo
    push-токен (`getExpoPushTokenAsync({ projectId })`) и шлёт на
    `POST /api/v1/mobile/devices/push-token` (`{ deviceId, pushToken, platform, appVersion }`).
    Всё в try/catch — сбой регистрации не ломает приложение; без `projectId` регистрация молча
    пропускается.
- [`src/features/notifications/use-push-notifications.ts`](../../../apps/mobile/src/features/notifications/use-push-notifications.ts):
  регистрирует токен при `status === 'authenticated'`; по нажатию на пуш открывает
  `/history/patrol/[id]` (по `data.patrolId`), в т.ч. из закрытого состояния
  (`getLastNotificationResponseAsync`).
- [`src/api/notifications.api.ts`](../../../apps/mobile/src/api/notifications.api.ts) — обёртка запроса.
- Хук подключён в `app/_layout.tsx`; плагин `expo-notifications` — в `app.json`.

Контракт DTO — `RegisterDevicePushTokenDto` из `@patrol/shared`.

## Обязательная настройка (вне кода)
Пуши не заработают, пока не выполнено:
1. **`eas init`** — создаёт/привязывает проект Expo и пишет `extra.eas.projectId` в `app.json`.
   Без него `getExpoPushTokenAsync` не выдаёт токен (на Android — ещё и требует Firebase в сборке).
2. **FCM v1** — Firebase-проект с Android-приложением `com.patrolsystem.mobile`:
   - `google-services.json` положить в `apps/mobile/`; файл в `.gitignore`;
   - для EAS build загрузить файл как project file secret `GOOGLE_SERVICES_JSON`;
   - `app.config.js` подставляет `process.env.GOOGLE_SERVICES_JSON` на EAS builder и `./google-services.json` локально;
   - service account private key (Firebase → Project settings → Service accounts → Generate new
     private key) загрузить через `eas credentials` → Android → **Google Service Account Key for
     FCM V1** (не Legacy).
3. **Новый dev-build** (Firebase — нативная зависимость):
   `npx eas-cli build --profile development --platform android`.

## Проверка
После входа на устройстве в таблице бэкенда `device_push_tokens` появляется строка с `push_token`
вида `ExponentPushToken[...]`. Тест доставки — через [expo.dev/notifications](https://expo.dev/notifications)
или реальным событием (инцидент/просрочка/отмена обхода).

⚠️ Секрет: service account JSON **не коммитить**. `google-services.json` тоже не коммитится; для EAS он хранится как file secret `GOOGLE_SERVICES_JSON`.
