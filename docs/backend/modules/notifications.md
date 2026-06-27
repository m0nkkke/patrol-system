# Модуль уведомлений (Notifications)

Модуль `notifications` отвечает за хранение push-токенов мобильных устройств. На текущем этапе backend принимает Expo push-токены от mobile-клиента и связывает их с пользователем и устройством. Фактическая отправка push-уведомлений через Expo API подключается отдельным шагом после настройки retry, логирования и production-переменных окружения.

## Endpoint для mobile

```http
POST /api/v1/mobile/devices/push-token
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "deviceId": "android-device-01",
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "platform": "android",
  "appVersion": "1.0.0"
}
```

Ответ:

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "deviceId": "android-device-01",
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "isActive": true
}
```

## Бизнес-правила

- Endpoint доступен любой авторизованной роли, потому что push-токен нужен и обходчику, и менеджеру, и администратору мобильной админки.
- Пара `userId + deviceId + pushToken` регистрируется идемпотентно.
- Если тот же `pushToken` пришел от другого пользователя или устройства, backend переносит запись на новый `userId/deviceId`.
- Если устройство прислало новый `pushToken`, прежние токены этого же `userId + deviceId` деактивируются.
- В таблице `device_push_tokens` хранится только актуальность токена (`is_active`), платформа и версия приложения. Секретов в этой таблице нет.

## Следующий шаг

Для отправки реальных уведомлений нужно добавить отправитель Expo Push API и очередь/retry. События, которые должны создавать уведомления:

- новый инцидент обхода `short_interval`, `long_interval`, `missed_point`;
- перевод обхода в `overdue`;
- возможно, отмена обхода сотрудником с причиной.
