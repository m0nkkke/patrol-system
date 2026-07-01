# Patrol System - Mobile Android

Мобильное Android-приложение Patrol System для обходчиков, менеджеров и администраторов.

Стек: Expo SDK 56, React Native 0.85, TypeScript, `expo-router`, React Query, EAS Build/Update.

Подробная документация по модулям: [docs/mobile/modules](../../docs/mobile/modules/README.md).

## Что умеет приложение

- вход сотрудника по ключу доступа;
- просмотр доступных действий по роли;
- настройка маршрутов магазинов через NFC;
- прохождение обхода строго по порядку точек;
- фиксация попытки пропуска точки как нарушения;
- офлайн-очередь NFC-событий и последующая синхронизация;
- история обходов, нарушения, расписания;
- push-уведомления через Expo Push/FCM;
- Crashlytics для native crash и важных JS ошибок;
- OTA-обновления через `expo-updates`.

## Требования

- Node.js 20 LTS и npm 10+.
- Доступ к backend проекта.
- Expo account и доступ к EAS project `patrol-system`.
- Физический Android-телефон для NFC, push и Crashlytics.
- `google-services.json` для Firebase Android app `com.patrolsystem.mobile`.

Expo Go не подходит: используются native-модули NFC, Firebase, notifications, secure storage и sqlite.

## Установка

Из корня монорепозитория:

```bash
npm install
```

Проверка mobile:

```bash
npm run typecheck -w @patrol/mobile
npm run lint -w @patrol/mobile
```

## Переменные окружения

Локальный файл: `apps/mobile/.env`.

Минимально:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000/api/v1
```

Варианты backend URL:

- Android-эмулятор: `http://10.0.2.2:3000/api/v1`;
- физический телефон в той же Wi-Fi сети: `http://<IP-компьютера>:3000/api/v1`;
- preview/production: `https://<backend-domain>/api/v1`.

Если `.env` не задан, приложение использует `extra.apiBaseUrl` из Expo config. Для разработки лучше явно задавать `EXPO_PUBLIC_API_BASE_URL`.

## Firebase config

Для Android-сборки нужен файл:

```text
apps/mobile/google-services.json
```

Файл не коммитится в git. Локально он нужен для `expo run:android`/prebuild, а на EAS Build он передается через file secret `GOOGLE_SERVICES_JSON`.

Создать/обновить EAS secret:

```bash
cd apps/mobile
npx eas-cli env:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --environment development --environment preview --environment production --force
```

Проверить:

```bash
npx eas-cli env:list --environment preview
```

В выводе должно быть `GOOGLE_SERVICES_JSON=*****`.

## Запуск в разработке

1. Поднять backend и базу данных. Инструкция backend: [docs/backend/guides/local-setup.md](../../docs/backend/guides/local-setup.md).
2. Создать `apps/mobile/.env` и указать `EXPO_PUBLIC_API_BASE_URL`, доступный телефону.
3. Положить `google-services.json` в `apps/mobile/`.
4. Установить development build на телефон.
5. Запустить Metro:

```bash
npm run start -w @patrol/mobile
```

Если development build еще не установлен, собрать его:

```bash
cd apps/mobile
npx eas-cli build --profile development --platform android
```

После установки development build открывается на телефоне и подключается к Metro.

## Локальная Android-сборка

Если нужен локальный native build через Android Studio/Gradle:

```bash
cd apps/mobile
npx expo run:android
```

Это создаст native-папки `android/` и `ios/` через prebuild. Они находятся в `.gitignore`; не коммитить их без отдельного решения.

## Preview сборка

Preview APK используется для тестирования на реальном телефоне без Play Store:

```bash
cd apps/mobile
npx eas-cli build --profile preview --platform android
```

После сборки EAS даст ссылку/QR для установки APK.

Preview build нужен после изменений в native-части:

- новые native-библиотеки;
- `app.json`/`app.config.js`;
- permissions;
- Firebase/Crashlytics/push;
- NFC;
- splash/icon;
- `runtimeVersion`.

JS-only изменения можно доставлять через OTA, если native runtime не менялся.

## Production сборка

Production build:

```bash
cd apps/mobile
npx eas-cli build --profile production --platform android
```

Перед production build обязательно:

```bash
npm run typecheck -w @patrol/mobile
npm run lint -w @patrol/mobile
```

Для production `EXPO_PUBLIC_API_BASE_URL` должен указывать на стабильный HTTPS backend. Backend env настраивается отдельно от mobile env.

## OTA update

Preview channel:

```bash
cd apps/mobile
npx eas-cli update --branch preview -m "message"
```

Production channel:

```bash
cd apps/mobile
npx eas-cli update --branch production -m "message"
```

OTA обновляет JS bundle и assets. Native-изменения через OTA не доставляются.

## Проверка Firebase и push

Crashlytics:

1. Собрать и установить preview или production APK.
2. Вызвать реальную ошибку, которая проходит через мобильный logger.
3. Через несколько минут проверить Firebase Console -> Crashlytics -> Issues.
4. JS ошибки отображаются как non-fatal events, а native crash - как fatal events.

Push:

1. Войти в приложение на телефоне.
2. Проверить, что backend получил `ExponentPushToken[...]` в `device_push_tokens`.
3. В backend production/preview env должно быть `PUSH_NOTIFICATIONS_ENABLED=true`.
4. Проверить уведомление реальным событием: нарушение, просрочка или отмена обхода.

## Структура

- `app/` - экраны и роутинг `expo-router`.
- `src/api/` - axios client, DTO-типы, React Query wrappers.
- `src/features/` - доменные хуки и компоненты.
- `src/nfc/` - обертка над `react-native-nfc-manager`.
- `src/features/patrol/offline/` - offline queue обходов.
- `src/lib/logger.ts`, `src/lib/crashlytics.ts` - mobile error reporting.
- `src/ui/` - общий UI kit.
- `assets/` - иконка и splash.

Контракты из `@patrol/shared` в mobile runtime импортируются только как типы.

## Частые проблемы

`google-services.json` не найден при EAS Build:

- проверь `npx eas-cli env:list --environment preview`;
- проверь, что secret называется `GOOGLE_SERVICES_JSON`;
- пересоздай secret командой из раздела Firebase config.

Приложение не видит backend:

- для эмулятора используй `10.0.2.2`;
- для телефона используй IP компьютера в той же сети или HTTPS tunnel/domain;
- перезапусти Metro после изменения `.env`.

OTA не применился:

- проверь channel сборки (`preview`/`production`);
- проверь, что `runtimeVersion` совпадает;
- перезапусти приложение.
