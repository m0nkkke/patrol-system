# Диагностика мобильного приложения

## Приложение не собирается без API URL

Сообщение `API base URL is not configured` означает отсутствие
`EXPO_PUBLIC_API_BASE_URL`. Для локального запуска проверьте `apps/mobile/.env`, для EAS Build —
переменную соответствующего environment.

После изменения локального `.env` перезапустите Metro. После изменения EAS environment запустите
новую сборку или OTA; само изменение в dashboard уже установленный bundle не меняет.

## `expo prebuild` изменил корень монорепозитория

Команда была запущена не из `apps/mobile`. Удалите созданный в корне `app.json` и удалите только
случайно добавленный корневой блок зависимостей `expo`, `react` и `react-native`. Не выполняйте
безусловный `git restore package.json`, если в нём были другие незакоммиченные изменения.

Правильный запуск:

```powershell
cd C:\patrol-system\apps\mobile
npx expo prebuild --clean --platform android
```

## Не найден `google-services.json`

Локальная сборка ожидает `apps/mobile/google-services.json`. EAS Build использует file variable
`GOOGLE_SERVICES_JSON`. Проверьте:

```powershell
cd C:\patrol-system\apps\mobile
npx eas-cli env:list --environment preview
```

Файл должен принадлежать Firebase Android app с package name приложения. Изменение Firebase
native configuration требует новой сборки, OTA недостаточно.

## Телефон не видит локальный backend

`localhost` на телефоне означает сам телефон. Android Emulator обращается к хосту через
`10.0.2.2`. Физическое устройство использует LAN IP, публичный tunnel URL или USB forwarding.

При USB:

```powershell
adb reverse tcp:3000 tcp:3000
```

Сначала откройте `/api/v1/health` в браузере самого устройства. Если health недоступен, проблема
находится в адресе, firewall, tunnel, TLS или backend, а не в форме входа приложения.

## Preview APK перестал видеть временный tunnel

Quick tunnel существует только пока запущен его процесс и обычно получает новый адрес после
перезапуска. Обновите `EXPO_PUBLIC_API_BASE_URL` в EAS preview environment и выпустите совместимый
OTA либо новую APK. Для регулярного тестирования используйте постоянный staging-домен.

## `adb devices` не показывает телефон

Проверьте USB debugging, режим передачи данных и драйвер производителя. Состояние `unauthorized`
устраняется подтверждением RSA fingerprint на телефоне. Иногда требуется отозвать USB debugging
authorizations в Developer options и подключить устройство заново.

## Development build не подключается к Metro

Убедитесь, что Metro запущен:

```powershell
npm run start -w @patrol/mobile
```

При USB выполните:

```powershell
adb reverse tcp:8081 tcp:8081
```

Preview и production не подключаются к Metro и должны запускаться автономно.

## NFC не считывается

Проверьте наличие NFC на устройстве, включённый адаптер и разблокированный экран. Метку следует
поднести к зоне антенны конкретной модели телефона и удерживать до реакции.

Если UID считывается, но точка отклоняется, проверьте привязку метки, активность точки, магазин,
снимок маршрута и ожидаемое действие. `arrive` и `depart` используют одну метку; будущая точка не
может закрыть текущую.

После ошибки или ухода с экрана незавершённый NFC request должен быть отменён. Повторяющееся
сообщение о занятом reader указывает на проблему жизненного цикла listener.

## Таймер сбросился или показывает неверную фазу

Сравните server wait-state, локальные события текущего пользователя и время устройства. Таймер
строится от `lockedUntil`, а не от повторного открытия экрана. При офлайн-восстановлении необходим
сохранённый wait-state и снимок маршрута.

После возвращения сети дождитесь синхронизации и повторной загрузки серверного состояния. Ручное
изменение системных часов может привести к серверному конфликту и должно фиксироваться в
диагностике.

## Pending events не синхронизируются

Проверьте сеть, действительность сессии и принадлежность обхода текущему пользователю. Менеджер не
отправляет очередь без access-токена и никогда не отправляет записи другого `user_id`.

Откройте приложение, верните его в foreground или запустите явную синхронизацию. При серверной
ошибке записи остаются `pending`. Не очищайте данные приложения до выяснения причины.

## Геолокация отсутствует

GPS является best-effort атрибутом и не блокирует скан. Проверьте foreground permission,
включённую геолокацию Android и условия приёма сигнала. В помещении запрос может завершиться по
таймауту, после чего событие будет сохранено без координат.

## Не приходят push-уведомления

Проверьте последовательно:

1. Системное разрешение Android и notification channel.
2. Реальное устройство и доступ к интернету.
3. Наличие EAS project ID в app config.
4. Регистрацию Expo Push Token на backend.
5. `PUSH_NOTIFICATIONS_ENABLED` в backend environment.
6. FCM V1 service account в EAS Credentials.
7. Принадлежность FCM credential и `google-services.json` одному Firebase-проекту.
8. Ответы Expo Push и отсутствие `DeviceNotRegistered` или `MismatchSenderId`.

Push не проверяется через Expo Go. После изменения native Firebase configuration создаётся новая
сборка.

## Crashlytics не показывает событие

Debug-сбор Crashlytics отключён. Используйте preview или production build, вызовите ошибку через
общий logger и дайте приложению доступ к сети. Native crash часто отправляется при следующем
запуске.

Проверьте Firebase project, package name и инициализацию React Native Firebase. Не добавляйте
ручной production-экран, позволяющий конечному пользователю создавать crash.

## OTA не устанавливается

Сравните channel установленной сборки, channel публикации и runtime version. Preview update не
получает production build и наоборот. Native-изменение не доставляется OTA.

Публикуйте update с соответствующим environment, чтобы bundle получил правильный API URL. Затем
полностью перезапустите приложение. Ошибка `missing headers` при ручном открытии update URL в
браузере не является проверкой работоспособности EAS Update.

## Ошибка входа после смены ключа или роли

Backend отзывает связанные сессии. Приложение обнаруживает это при heartbeat или следующем
защищённом запросе и возвращает экран входа. Выполните вход новым ключом; переустановка APK не
требуется.

Сетевая ошибка отличается от подтверждённого `401`: при отсутствии сети клиент может использовать
недавний локальный снимок, а при серверном отказе очищает сессию.

## Источники диагностики

- Metro console — ошибки development bundle;
- `adb logcat` — Android и native-модули;
- backend logs — HTTP и доменные ошибки;
- Firebase Crashlytics — release-mode сбои;
- EAS build logs — prebuild, Gradle и credentials;
- EAS update dashboard — channel и runtime;
- `/api/v1/health` — доступность API.

Логи передаются без access keys, токенов, полного Authorization, ФИО, NFC UID, точных координат,
текста обращений и содержимого файлов.
