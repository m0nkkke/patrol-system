# Mobile — OTA-обновления

JS-бандл и ассеты обновляются «по воздуху» через `expo-updates` — без пересборки APK и без
публикации в стор. Нативную часть (новые библиотеки, разрешения, плагины) OTA обновить **не может**
— для этого нужен `eas build`.

## Конфигурация (`app.json`)
```json
"runtimeVersion": { "policy": "appVersion" },
"updates": { "enabled": true, "fallbackToCacheTimeout": 0 }
```
`updates.url` прописывается командой `eas update:configure` (привязка к `projectId`).

## Проверка в приложении
[`src/features/updates/use-ota-updates.ts`](../../../apps/mobile/src/features/updates/use-ota-updates.ts)
(`useOtaUpdates`, подключён в `app/_layout.tsx`): **только в production** (`!__DEV__` и
`Updates.isEnabled`) на старте выполняет `checkForUpdateAsync` → `fetchUpdateAsync` →
`reloadAsync`. Ошибки молча игнорируются (обновление не критично).

## Концепции
- **runtimeVersion** — «отпечаток» нативной части (здесь = версия приложения `0.1.0`). Обновление
  прилетает только сборке с совпадающим runtime.
- **channel** — ветка доставки (`development` / `preview` / `production`, см. `eas.json`). Сборка
  подписана на канал.
- Три заголовка запроса к серверу обновлений: `runtime-version`, `channel-name`, `platform`.
  Приложение шлёт их автоматически; открытие `updates.url` в браузере вернёт ошибку «missing
  headers» — это нормально.

## Выпуск обновления
```
npx eas-cli update --branch production -m "описание"
```

## Когда нужен новый APK (а не OTA)
- новая нативная библиотека/плагин (например Firebase для пушей),
- изменение разрешений в AndroidManifest,
- мажорное обновление Expo SDK,
- смена иконки/сплеша.
