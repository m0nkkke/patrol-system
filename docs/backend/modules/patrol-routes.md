# Модуль Patrol Routes

Модуль `patrol-routes` управляет несколькими маршрутами одного магазина. Маршрут хранит категорию `internal` или `external` и отдельный порядок контрольных точек.

## Эндпоинты

- `POST /api/v1/patrol-routes` — создать маршрут из точек магазина; роли `admin`, `route_setter`, `local_route_setter`.
- `GET /api/v1/patrol-routes/shop/:shopId` — список маршрутов магазина; роли `admin`, `route_setter`, `local_route_setter`, `inspector`.
- `GET /api/v1/patrol-routes/:id` — карточка маршрута с точками; роли `admin`, `route_setter`, `local_route_setter`, `inspector`.
- `PATCH /api/v1/patrol-routes/:id` — изменить название, категорию, активность или состав точек; роли `admin`, `route_setter`, `local_route_setter`.
- `POST /api/v1/patrol-routes/:id/archive` — архивировать маршрут через `isActive=false`; роли `admin`, `route_setter`, `local_route_setter`.

## Правила

- Все точки маршрута должны принадлежать тому же магазину, что и маршрут.
- Порядок маршрута хранится в `patrol_route_points.sort_order`, отдельно от `patrol_points.sort_order`.
- Расписание может быть привязано к маршруту через `routeId`.
- Обход может быть запущен с `routeId`; backend считает количество точек по маршруту и отклоняет NFC-событие для точки вне маршрута.
- Архивный маршрут не используется для новых обходов, но остаётся доступен в истории через уже сохранённые связи.
