# Patrol System Mobile

Android-приложение для проведения и контроля обходов торговых точек. Клиент поддерживает
ролевой интерфейс, работу с NFC-метками, двухфазное посещение контрольных точек, офлайн-очередь
событий, фотографии, уведомления и обновления через Expo Application Services.

Полный комплект документации находится в [`docs/mobile`](../../docs/mobile/README.md).

## Технологии

- Expo и React Native;
- TypeScript и Expo Router;
- TanStack Query и Zustand;
- Expo SQLite и SecureStore;
- React Native NFC Manager;
- Expo Notifications и Expo Updates;
- Firebase Cloud Messaging и Crashlytics.

Expo Go не поддерживается, поскольку приложение использует собственные нативные модули и
Android-конфигурацию.

## Требования к рабочему месту

- Node.js и npm версий, указанных в корневом `package.json`;
- Android SDK, JDK и `adb` для локальной Android-сборки;
- доступ к backend Patrol System;
- доступ к проекту Expo/EAS;
- `google-services.json` для Android-приложения Firebase;
- физическое Android-устройство для проверки NFC, камеры, GPS и push-уведомлений.

## Установка и проверки

Из корня монорепозитория:

```powershell
npm install
npm run test -w @patrol/mobile
npm run typecheck -w @patrol/mobile
npm run lint -w @patrol/mobile
```

## Локальная конфигурация

Создайте `apps/mobile/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000/api/v1
```

Для Android-эмулятора используется `10.0.2.2`. Физическое устройство должно обращаться к
доступному ему адресу компьютера или к публичному HTTPS-адресу backend. Переменная обязательна и
не является секретом: её значение включается в клиентский JavaScript-бандл.

Для локальной нативной сборки файл `apps/mobile/google-services.json` должен существовать на
диске. Он исключён из Git.

## Запуск

Metro для установленной development-сборки:

```powershell
npm run start -w @patrol/mobile
```

Перегенерация Android-проекта после изменения нативной конфигурации:

```powershell
cd C:\patrol-system\apps\mobile
npx expo prebuild --clean --platform android
npx expo run:android --device
```

Команды `expo prebuild` и `expo run:android` необходимо выполнять из `apps/mobile`, а не из корня
монорепозитория. Сгенерированные каталоги `android` и `ios` не являются исходным кодом проекта и
не коммитятся.

## Документация

- [Возможности продукта](../../docs/mobile/product/capabilities.md)
- [Роли и пользовательские сценарии](../../docs/mobile/product/roles-and-flows.md)
- [Архитектура приложения](../../docs/mobile/architecture/overview.md)
- [Разработка и локальный запуск](../../docs/mobile/delivery/development.md)
- [Сборки, релизы и обновления](../../docs/mobile/delivery/build-release-updates.md)
- [Эксплуатация](../../docs/mobile/delivery/production-operation.md)
- [Диагностика проблем](../../docs/mobile/troubleshooting.md)
