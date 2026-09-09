# Сборки, релизы и обновления

## Профили EAS

Конфигурация `apps/mobile/eas.json` содержит три независимых профиля.

| Профиль | Результат | Назначение | Metro |
|---|---|---|---|
| `development` | APK с dev client | Разработка и отладка | Требуется |
| `preview` | Самостоятельный APK | Внутреннее тестирование | Не требуется |
| `production` | Подписанный Android App Bundle | Публикация через Google Play | Не требуется |

Channel задан непосредственно в каждом профиле. Поле `environment` в текущем `eas.json` не
указано, поэтому EAS выбирает среду автоматически: `development` для dev client, `preview` для
internal distribution и `production` для store-сборки. Переменные выбранной среды разрешаются во
время сборки и должны существовать до её запуска.

## Проверка конфигурации

Перед облачной сборкой полезно проверить итоговый Expo config:

```powershell
cd C:\patrol-system\apps\mobile
npx expo config --type public
```

В конфигурации должны присутствовать правильные package name, project ID, runtime version, update
URL, Android permissions и путь к Firebase configuration. Секретные значения не выводятся в
публичную конфигурацию.

EAS environment проверяется отдельно:

```powershell
npx eas-cli env:list --environment preview
npx eas-cli env:list --environment production
```

## Preview APK

Preview используется для передачи сборки заказчику или тестировщику без Google Play:

```powershell
cd C:\patrol-system\apps\mobile
npx eas-cli build --profile preview --platform android
```

После завершения EAS предоставляет страницу и прямую ссылку установки. APK работает без Metro и
получает обновления своего channel. Доступ к ссылке регулируется настройками Internal Distribution
проекта Expo.

Если preview обращается к backend на машине разработчика через туннель, backend, база и туннель
должны оставаться запущенными. Такой режим не используется как постоянная среда.

## Production AAB

Production-сборка создаётся командой:

```powershell
cd C:\patrol-system\apps\mobile
npx eas-cli build --profile production --platform android
```

Результирующий AAB загружается в Google Play. Перед общим выпуском тот же артефакт проходит
Internal Testing или закрытый тестовый track, поскольку поведение store-сборки и прямого preview
APK может отличаться системными ограничениями и подписью.

Для отправки последней или выбранной сборки через EAS Submit используется:

```powershell
npx eas-cli submit --platform android
```

Первая настройка Google Play может требовать ручного создания приложения, заполнения карточки,
политик конфиденциальности и предоставления EAS доступа через Google service account.

## Android signing

Все APK/AAB с одним application ID должны подписываться совместимым Android keystore. Потеря
ключа вне механизма Play App Signing может исключить обновление уже установленного приложения.

EAS Credentials может управлять keystore. Владелец проекта обязан обеспечить корпоративный
доступ и резервное хранение выгрузки в защищённом хранилище. Keystore, alias и пароли не
коммитятся.

Google Play различает upload key и app signing key. Порядок владения и восстановления фиксируется
в [документе передачи доступов](access-handover.md).

## Нумерация выпуска

`version` — отображаемая пользователю версия приложения. `android.versionCode` — монотонное целое
число, по которому Android и Google Play определяют более новую сборку. Каждый новый store-релиз
получает увеличенный `versionCode`.

`runtimeVersion` определяет совместимость нативной оболочки с OTA bundle. Он изменяется при
несовместимом изменении native runtime. Номер runtime не обязан описывать бизнес-релиз, но правила
его увеличения должны применяться последовательно.

## EAS Update

OTA обновляет JavaScript bundle и assets без установки нового APK/AAB. Preview и production имеют
разные channels, поэтому тестовое обновление не попадает конечным пользователям.

Preview:

```powershell
cd C:\patrol-system\apps\mobile
npx eas-cli update --channel preview --environment preview -m "Описание изменения"
```

Production:

```powershell
npx eas-cli update --channel production --environment production -m "Описание изменения"
```

Не-development приложение проверяет наличие обновления при старте. Доступный bundle загружается,
после чего приложение перезапускается. Сбой сервиса обновлений не блокирует запуск уже установленной
версии.

## Что допускает OTA

OTA подходит для:

- экранов и компонентов React;
- исправления бизнес-логики TypeScript;
- текстов и локальных assets;
- сетевого клиентского кода;
- изменения публичной конфигурации, используемой только JavaScript bundle;
- исправлений навигации, не требующих новой native registration.

Новая нативная сборка требуется при изменении:

- Expo SDK или React Native;
- native library или config plugin;
- Android permission;
- Firebase native configuration;
- package name;
- Android manifest или Gradle;
- иконки и native splash configuration;
- схемы deep link, требующей Android manifest;
- runtime version.

Если OTA опубликован для несовместимого runtime, установленное приложение его не получит.

## Порядок доставки изменений

JavaScript-изменение сначала публикуется в preview channel и проверяется на реальном preview APK.
После подтверждения тот же исходный commit и production environment используются для production
channel. Это исключает сборку production bundle из непроверенного рабочего дерева.

Native-изменение проходит новую preview-сборку, физическую проверку и только затем production AAB.
Backend-изменение разворачивается отдельно; пересборка клиента не требуется при сохранении
совместимости API.

## Откат

При проблеме OTA доставка останавливается или на тот же channel публикуется последний проверенный
bundle, совместимый с runtime установленной базы. При критическом native defect выпускается новая
сборка с увеличенным `versionCode`.

Если ошибка связана с backend, откат или исправление выполняется на сервере. Mobile OTA не должен
использоваться для маскирования несовместимого или недоступного production API.
