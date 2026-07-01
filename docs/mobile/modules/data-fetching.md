# Mobile — поиск, фильтры, сортировка, infinite scroll

Все списки используют **серверные** поиск/фильтр/сортировку и подгрузку по странице
(не клиентскую фильтрацию одной страницы).

## Инфраструктура
- [`src/api/use-infinite-paginated.ts`](../../../apps/mobile/src/api/use-infinite-paginated.ts) —
  `useInfinitePaginated<T>(queryKey, fetchPage)` поверх `useInfiniteQuery`. `PAGE_SIZE = 30`.
  `getNextPageParam` считает суммарно загруженные элементы против `total` и не зацикливается на
  пустой странице. Возвращает плоский `items`.
- [`src/lib/use-debounced-value.ts`](../../../apps/mobile/src/lib/use-debounced-value.ts) —
  дебаунс строки поиска (350мс); попадает в `queryKey`, поэтому смена ключа рефетчит с 1-й страницы.
- [`src/ui/ListFooter.tsx`](../../../apps/mobile/src/ui/ListFooter.tsx) — спиннер подгрузки внизу списка.

## Паттерн экрана со списком
```
const debouncedSearch = useDebouncedValue(search);
const { items, isPending, isError, error, refetch, isRefetching,
        hasNextPage, fetchNextPage, isFetchingNextPage } =
  useInfiniteXxx({ search: debouncedSearch, ...filters, sort });

<FlatList
  data={items}
  refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
  onEndReachedThreshold={0.4}
  onEndReached={() => { if (hasNextPage && !isFetchingNextPage) void fetchNextPage(); }}
  ListFooterComponent={<ListFooter loading={isFetchingNextPage} />}
/>
```
Фильтры/сортировка задаются через `FilterSheet` / `SheetButton`. Значения `sort` и enum-фильтров
должны совпадать с белыми списками бэкенда (`*_SORT_FIELDS`, `PatrolStatus`, `PatrolIncidentType`)
— иначе сервер вернёт 400.

## Где применяется
Магазины (список + пикеры + мультивыбор), пользователи, сотрудники, история по магазину/сотруднику,
нарушения. Доменные хуки — в соответствующих `src/features/*/queries.ts`
(`useInfiniteShops`, `useInfiniteUsers`, `useInfiniteShopPatrols`, `useInfiniteEmployeePatrols`,
`useInfiniteIncidents`).

## Точечная подгрузка по id
`useShopsByIds(ids)` ([`src/features/route-setup/queries.ts`](../../../apps/mobile/src/features/route-setup/queries.ts))
через `useQueries` догружает магазины по id (переиспользует кэш `['shop', id]`). Используется в
мультивыборе магазинов (закрепить выбранные сверху, даже если они вне загруженных страниц) и в
подстановке названий после создания пользователя. Серверная уникальность `externalId` магазина
проверяется ответом сервера (`SHOP_EXTERNAL_ID_TAKEN`), а не выгрузкой всех магазинов.
