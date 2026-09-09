# Разработка и локальный запуск

## Подготовка рабочего места

Для работы требуются Node.js и npm из диапазонов корневого `package.json`. Локальная Android-сборка
дополнительно требует JDK, Android SDK, platform tools и настроенный `adb`. Для инфраструктуры
backend используются Docker и Docker Compose.

Физический Android-телефон необходим для NFC и полной проверки системных разрешений. Эмулятор
подходит для интерфейса, навигации, форм и большинства сетевых сценариев.

## Установка зависимостей

Из корня монорепозитория:

```powershell
cd C:\patrol-system
npm install
```

Зависимости устанавливаются один раз на уровне workspace. Отдельный `npm install` внутри
`apps/mobile` обычно не требуется.

## Backend для разработки

Локальный запуск PostgreSQL, Redis, миграций и NestJS описан в
[`docs/backend/guides/local-setup.md`](../../backend/guides/local-setup.md). Репрезентативные
тестовые данные создаются сценарным seed из backend-документации.

Перед запуском mobile убедитесь, что health endpoint backend отвечает с устройства, на котором
будет выполняться приложение.

## Локальная переменная API

Создайте `apps/mobile/.env` на основе `.env.example`.

Android Emulator:

```env
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000/api/v1
```

Физическое устройство в локальной сети:

```env
EXPO_PUBLIC_API_BASE_URL=http://<LAN-IP-компьютера>:3000/api/v1
```

При работе через USB можно пробросить backend:

```powershell
adb reverse tcp:3000 tcp:3000
```

и использовать:

```env
EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:3000/api/v1
```

После изменения `.env` Metro перезапускается, чтобы сформировать bundle с новым значением.

## Firebase configuration

Поместите клиентский файл Android Firebase сюда:

```text
C:\patrol-system\apps\mobile\google-services.json
```

Package name внутри файла должен соответствовать `android.package` из `app.json`. Файл исключён
из Git. Отсутствие или несовпадение конфигурации приводит к ошибке prebuild, Gradle либо
регистрации FCM.

## Development build через EAS

Development profile создаёт APK с dev client:

```powershell
cd C:\patrol-system\apps\mobile
npx eas-cli build --profile development --platform android
```

После установки запустите Metro из корня:

```powershell
cd C:\patrol-system
npm run start -w @patrol/mobile
```

Телефон открывает установленный dev client и подключается к Metro. Для удалённого устройства Metro
также должен быть доступен по сети или tunnel-механизму Expo.

## Локальная Android-сборка

После изменения `app.json`, config plugin, нативной зависимости или Android permission
перегенерируйте native project:

```powershell
cd C:\patrol-system\apps\mobile
npx expo prebuild --clean --platform android
npx expo run:android --device
```

Рабочий каталог принципиален. Запуск `expo prebuild` из корня монорепозитория создаёт ложную Expo
конфигурацию и добавляет mobile-зависимости в корневой package.

Каталог `apps/mobile/android` генерируется из app config и находится в `.gitignore`. Ручные
изменения внутри него исчезнут после `--clean`; постоянная нативная настройка оформляется через
Expo config plugin или app config.

## Подключение устройства

На телефоне включаются Developer options и USB debugging. После подключения:

```powershell
adb devices
```

Состояние `device` означает готовность. `unauthorized` требует подтверждения RSA-ключа на телефоне.
Для Metro через USB используется:

```powershell
adb reverse tcp:8081 tcp:8081
```

## Автоматические проверки

Из корня проекта:

```powershell
npm run test -w @patrol/mobile
npm run typecheck -w @patrol/mobile
npm run lint -w @patrol/mobile
```

Unit-тесты не требуют Metro, Android или backend. Физическая интеграция NFC, GPS, камеры и push
проверяется на нативной сборке.

## Рабочий цикл

Изменение TypeScript, React-компонентов и обычных assets подхватывается Metro. Новый prebuild не
требуется, пока не изменилась нативная конфигурация.

После изменений API следует запускать backend и mobile проверки вместе. Изменения shared DTO
сначала собираются в `@patrol/shared`, затем проверяются потребителями.

Временные debug-логи не должны содержать ключи доступа, токены, NFC UID, ФИО, тексты обращений или
координаты. Диагностика production выполняется через общий logger и Crashlytics.
