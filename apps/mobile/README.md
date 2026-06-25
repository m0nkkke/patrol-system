# @patrol/mobile

Мобильное приложение Patrol System на Expo (React Native, TypeScript).

## Требования

- Node.js 20 LTS, npm 10+
- Android Studio (эмулятор) или физическое устройство с Expo Dev Client
- Запущенный backend (см. `docs/backend/guides/local-setup.md`)

## Установка

Зависимости ставятся из корня монорепозитория:

```bash
npm install
```

## Конфигурация

Базовый URL API задаётся переменной окружения `EXPO_PUBLIC_API_BASE_URL`.
Скопируйте `.env.example` в `.env` и при необходимости измените значение.

- Android-эмулятор: `http://10.0.2.2:3000/api/v1`
- Физическое устройство: `http://<IP-вашего-компьютера>:3000/api/v1`

Если переменная не задана, используется `extra.apiBaseUrl` из `app.json`.

## Запуск

```bash
npm run start -w @patrol/mobile
```

NFC и фоновая синхронизация требуют сборки Dev Client (`expo run:android`),
в Expo Go нативный NFC-модуль недоступен.

## Структура

- `app/` — экраны и навигация (expo-router).
- `src/api/` — HTTP-клиент, контракты ответов, маппинг доменных ошибок.
- `src/store/` — состояние приложения (zustand).
- `src/storage/` — безопасное хранилище токенов и `deviceId`.
- `src/config/` — конфигурация окружения.

Контракты запросов импортируются из `@patrol/shared` как типы.
