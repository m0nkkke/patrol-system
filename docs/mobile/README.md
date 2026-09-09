# Мобильное приложение Patrol System

Документация описывает Android-клиент Patrol System как готовый к передаче и сопровождению
компонент. Она предназначена для владельца продукта, пользователей, разработчиков, тестировщиков
и специалистов, отвечающих за выпуск и эксплуатацию приложения.

## Состав документации

### Продукт и пользовательские сценарии

- [Возможности приложения](product/capabilities.md) — назначение, функции, сетевые и аппаратные
  требования, границы ответственности клиента.
- [Роли и пользовательские сценарии](product/roles-and-flows.md) — доступные разделы и основные
  последовательности действий для каждой роли.

### Архитектура

- [Общая архитектура](architecture/overview.md) — устройство проекта, слои, состояние и
  навигация.
- [Авторизация и безопасность](architecture/auth-security.md) — вход, хранение токенов,
  обновление и отзыв сессий, защита локальных данных.
- [Обходы, NFC и офлайн-режим](architecture/patrol-nfc-offline.md) — двухфазное посещение точек,
  локальная очередь, восстановление после перезапуска и геолокация.
- [Данные, фотографии и отчёты](architecture/data-media.md) — сетевой слой, кэширование,
  постраничные списки, защищённые файлы и формы отчётности.

### Интеграции

- [Взаимодействие с backend](integrations/backend-api.md) — границы API, авторизация запросов,
  ошибки, идемпотентность и совместимость контрактов.
- [Firebase и уведомления](integrations/firebase-notifications.md) — FCM, Expo Push,
  локальные напоминания и Crashlytics.

### Поставка и сопровождение

- [Окружения и конфигурация](delivery/environments.md) — разделение development, preview и
  production, переменные приложения и backend.
- [Разработка и локальный запуск](delivery/development.md) — подготовка рабочего места,
  development-сборка и подключение устройства.
- [Сборки, релизы и обновления](delivery/build-release-updates.md) — APK, AAB, подпись Android,
  EAS Build и EAS Update.
- [Эксплуатация production](delivery/production-operation.md) — инфраструктурные зависимости,
  наблюдаемость, отказоустойчивость и порядок выпуска.
- [Передача доступов](delivery/access-handover.md) — владение Expo, Firebase, Google Play и
  криптографическими материалами.
- [Контроль качества](delivery/quality-assurance.md) — автоматические проверки, функциональная и
  физическая проверка релизов.
- [Диагностика проблем](troubleshooting.md) — типовые сбои сборки, сети, NFC, push и OTA.

## Источники истины

- Исходный код клиента: [`apps/mobile`](../../apps/mobile/).
- Команды пакета и зависимости: [`apps/mobile/package.json`](../../apps/mobile/package.json).
- Нативная конфигурация: [`apps/mobile/app.json`](../../apps/mobile/app.json) и
  [`apps/mobile/app.config.js`](../../apps/mobile/app.config.js).
- Профили EAS: [`apps/mobile/eas.json`](../../apps/mobile/eas.json).
- DTO и enum, общие с backend: [`packages/shared`](../../packages/shared/).
- Каноническое описание серверной части: [`docs/backend`](../backend/README.md).
- Локальный и production-запуск backend: [`docs/backend/guides/local-setup.md`](../backend/guides/local-setup.md)
  и [`docs/deployment/backend-production.md`](../deployment/backend-production.md).

Документация mobile описывает поведение клиента и правила интеграции. Полные серверные модели,
схема базы данных и внутренняя реализация endpoint поддерживаются владельцем backend и не
дублируются здесь.
