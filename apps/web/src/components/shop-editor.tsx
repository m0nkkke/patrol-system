import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, getApiErrorMessage } from '../lib/api';
import type { Shop } from '../types/api';

export function ShopEditor({
  shop,
  onSaved,
}: {
  shop?: Shop;
  onSaved: (id: string) => void;
}): React.JSX.Element {
  const client = useQueryClient();
  const [name, setName] = useState(shop?.name ?? '');
  const [address, setAddress] = useState(shop?.address ?? '');
  const [externalId, setExternalId] = useState(shop?.externalId ?? '');
  const [timezone, setTimezone] = useState(shop?.timezone ?? 'Asia/Krasnoyarsk');
  const [message, setMessage] = useState('');
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['setup-shops'] });
    void client.invalidateQueries({ queryKey: ['shops'] });
  };
  const save = useMutation({
    mutationFn: async () => {
      new Intl.DateTimeFormat('ru-RU', { timeZone: timezone }).format();
      const body = {
        name: name.trim(),
        address: address.trim(),
        externalId: externalId.trim() || undefined,
        timezone,
      };
      return shop
        ? (await api.patch<Shop>(`/shops/${shop.id}`, body)).data
        : (await api.post<Shop>('/shops', body)).data;
    },
    onSuccess: (result) => {
      refresh();
      setMessage('Магазин сохранён');
      onSaved(result.id);
    },
  });
  const archive = useMutation({
    mutationFn: async () => {
      if (shop) await api.post(`/archive/shops/${shop.id}`);
    },
    onSuccess: () => {
      refresh();
      onSaved('');
    },
  });
  return (
    <details className="admin-card">
      <summary>{shop ? 'Параметры магазина' : 'Создать магазин'}</summary>
      <form
        className="admin-form"
        onSubmit={(event) => {
          event.preventDefault();
          setMessage('');
          save.mutate();
        }}
      >
        <label className="field">
          <span>Название</span>
          <input
            required
            minLength={2}
            maxLength={200}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Адрес</span>
          <input value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <label className="field">
          <span>Код магазина</span>
          <input
            required={!!shop?.externalId}
            maxLength={50}
            value={externalId}
            onChange={(event) => setExternalId(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Часовой пояс IANA</span>
          <input
            required
            list="shop-timezones"
            value={timezone}
            onChange={(event) => setTimezone(event.target.value)}
          />
          <datalist id="shop-timezones">
            {[
              'Europe/Moscow',
              'Asia/Yekaterinburg',
              'Asia/Novosibirsk',
              'Asia/Krasnoyarsk',
              'Asia/Irkutsk',
              'Asia/Vladivostok',
            ].map((zone) => (
              <option key={zone} value={zone} />
            ))}
          </datalist>
        </label>
        <button className="primary-button" disabled={save.isPending || archive.isPending}>
          Сохранить магазин
        </button>
        {shop ? (
          <button
            type="button"
            className="secondary-button"
            disabled={archive.isPending || save.isPending}
            onClick={() => {
              if (
                window.confirm(
                  `Архивировать «${shop.name}»? Магазин исчезнет из активных объектов; его можно будет восстановить в архиве.`,
                )
              )
                archive.mutate();
            }}
          >
            Архивировать магазин
          </button>
        ) : null}
        {save.isError || archive.isError ? (
          <p role="alert" className="form-error">
            {save.error instanceof RangeError
              ? 'Укажите действующий часовой пояс IANA'
              : getApiErrorMessage(save.error ?? archive.error)}
          </p>
        ) : null}
        {message ? (
          <p role="status" className="admin-note">
            {message}
          </p>
        ) : null}
      </form>
    </details>
  );
}
