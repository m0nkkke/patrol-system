# Модуль уведомлений

Модуль `notifications` отвечает за регистрацию Expo push-токенов мобильных устройств и отправку push-уведомлений через Expo Push API.

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

- Endpoint доступен любой авторизованной роли: `employee`, `manager`, `admin`.
- Регистрация токена идемпотентна.
- Если то же устройство прислало новый `pushToken`, старые активные токены этого `userId + deviceId` деактивируются.
- Если тот же `pushToken` пришел от другого пользователя или устройства, запись переносится на текущий `userId/deviceId`.
- Если Expo вернул `DeviceNotRegistered`, backend деактивирует такой токен.
- Ошибка отправки push не должна ломать основной бизнес-сценарий: скан NFC, отмена обхода или фоновая проверка просрочки продолжают работать.

## Получатели

Уведомления об инцидентах, просрочках и отменах уходят:

- менеджерам, назначенным на магазин через основной `shopId` или список `user_shop_assignments`.

Администраторы и обходчик не получают уведомления о нарушениях через этот канал.

## События

Backend отправляет push-уведомления при следующих событиях:

- создан инцидент обхода: `short_interval`, `long_interval`, `missed_point`;
- обход автоматически переведен в `overdue`;
- сотрудник отменил обход с причиной или без нее.

Payload уведомления содержит служебные поля в `data`: `type`, `shopId`, `patrolId` и, для инцидентов, `incidentId`.

`missed_point` может появиться двумя способами:

- backend принял NFC-событие с перескоком через точки маршрута;
- mobile-клиент заблокировал скан не по порядку и отправил `POST /api/v1/mobile/patrols/:id/missed-point-attempts`.

В обоих случаях используется общий `notifyIncidentCreated`, поэтому уведомления уходят тем же получателям: менеджерам магазина. Администраторы и обходчик не получают push о нарушении.

## Переменные окружения

```bash
PUSH_NOTIFICATIONS_ENABLED=false
EXPO_PUSH_ENDPOINT=https://exp.host/--/api/v2/push/send
EXPO_PUSH_ACCESS_TOKEN=
```

`PUSH_NOTIFICATIONS_ENABLED` по умолчанию выключен, чтобы локальная разработка и тесты не отправляли реальные уведомления. Для production нужно выставить `true`.

`EXPO_PUSH_ACCESS_TOKEN` нужен только если в Expo-проекте включена дополнительная защита push-уведомлений access token'ом.
