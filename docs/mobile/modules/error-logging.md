# Mobile - crash reporting и логирование

Мобильное приложение использует Firebase Crashlytics через `@react-native-firebase/app` и `@react-native-firebase/crashlytics`.
Sentry больше не используется.

## Конфигурация

- `app.json` подключает config plugins `@react-native-firebase/app` и `@react-native-firebase/crashlytics`.
- `android.googleServicesFile` задается через `app.config.js`:
  - локально используется `./google-services.json`;
  - на EAS builder используется file secret `GOOGLE_SERVICES_JSON`.
- `google-services.json` лежит локально в `apps/mobile/`, но находится в `.gitignore`.
- `firebase.json` отключает debug-сбор Crashlytics и chaining JS exception handler:

```json
{
  "react-native": {
    "crashlytics_debug_enabled": false,
    "crashlytics_javascript_exception_handler_chaining_enabled": false
  }
}
```

## EAS secret

`GOOGLE_SERVICES_JSON` создается в EAS как file secret, а не как обычная строка в `.env`:

```bash
cd apps/mobile
npx eas-cli env:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --environment development --environment preview --environment production
```

Проверка:

```bash
npx eas-cli env:list --environment preview
npx eas-cli env:list --environment production
```

В выводе должно быть `GOOGLE_SERVICES_JSON=*****`.

## Logger

`src/lib/logger.ts` оставляет единый интерфейс для приложения:

- `initLogging()` инициализирует Crashlytics metadata: app version, EAS channel, runtime version.
- `logger.error(error, context?)` отправляет non-fatal JS error в Crashlytics и пишет в консоль в dev.
- `logger.setUser({ id, role })` задает `userId` и `userRole` для Crashlytics.

Прямой код Crashlytics находится в `src/lib/crashlytics.ts`.

## Точки перехвата

- `initLogging()` вызывается в `app/_layout.tsx`.
- `ErrorBoundary.componentDidCatch` отправляет неожиданные ошибки render tree.
- Axios interceptor в `src/api/client.ts` отправляет только важные API ошибки:
  - `5xx`;
  - `403`;
  - повторный `401` после refresh token;
  - `408` и `429` на ключевых mobile endpoints.
- `auth-store` задает пользователя при входе и очищает его при выходе.

Не отправляем в Crashlytics обычные validation errors, access keys, токены, ФИО, NFC UID и точные координаты.

## Проверка Crashlytics

Ручной crash-кнопки в приложении нет. Проверяем реальные ошибки:

1. Собрать новую preview APK:

```bash
cd apps/mobile
npx eas-cli build --profile preview --platform android
```

2. Установить APK на телефон.
3. Вызвать сценарий, который проходит через `logger.error(error, context?)`.
4. Через несколько минут проверить Firebase Console -> Crashlytics -> Issues.

JS ошибки приходят как non-fatal events. Native crash report обычно отправляется при следующем запуске приложения.
