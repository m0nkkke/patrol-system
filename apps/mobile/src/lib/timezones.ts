export type Timezone = {
  value: string;
  city: string;
  offset: string;
};

export const RUSSIAN_TIMEZONES: Timezone[] = [
  { value: 'Europe/Kaliningrad', city: 'Калининград', offset: 'UTC+2' },
  { value: 'Europe/Moscow', city: 'Москва', offset: 'UTC+3' },
  { value: 'Europe/Samara', city: 'Самара', offset: 'UTC+4' },
  { value: 'Asia/Yekaterinburg', city: 'Екатеринбург', offset: 'UTC+5' },
  { value: 'Asia/Omsk', city: 'Омск', offset: 'UTC+6' },
  { value: 'Asia/Krasnoyarsk', city: 'Красноярск', offset: 'UTC+7' },
  { value: 'Asia/Irkutsk', city: 'Иркутск', offset: 'UTC+8' },
  { value: 'Asia/Yakutsk', city: 'Якутск', offset: 'UTC+9' },
  { value: 'Asia/Vladivostok', city: 'Владивосток', offset: 'UTC+10' },
  { value: 'Asia/Magadan', city: 'Магадан', offset: 'UTC+11' },
  { value: 'Asia/Kamchatka', city: 'Камчатка', offset: 'UTC+12' },
];

export function timezoneCurrentTime(zone: string): string {
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      timeZone: zone,
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
  } catch {
    return '';
  }
}
