import { RUSSIAN_TIMEZONES } from './timezones';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function offsetMinutesFor(timeZone?: string): number | null {
  if (!timeZone) {
    return null;
  }
  const zone = RUSSIAN_TIMEZONES.find((item) => item.value === timeZone);
  if (!zone) {
    return null;
  }
  const match = zone.offset.match(/UTC([+-]\d+)(?::(\d+))?/);
  if (!match) {
    return null;
  }
  const hours = Number.parseInt(match[1], 10);
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
  return hours * 60 + (hours < 0 ? -minutes : minutes);
}

type WallClock = {
  day: number;
  month: number;
  year: number;
  hours: number;
  minutes: number;
};

function wallClock(iso?: string, timeZone?: string): WallClock | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const offset = offsetMinutesFor(timeZone);
  if (offset === null) {
    // Часовой пояс магазина неизвестен — показываем локальное время устройства.
    return {
      day: date.getDate(),
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
    };
  }

  const shifted = new Date(date.getTime() + offset * 60000);
  return {
    day: shifted.getUTCDate(),
    month: shifted.getUTCMonth() + 1,
    year: shifted.getUTCFullYear(),
    hours: shifted.getUTCHours(),
    minutes: shifted.getUTCMinutes(),
  };
}

export function formatDateTime(iso?: string, timeZone?: string): string {
  const wall = wallClock(iso, timeZone);
  if (!wall) {
    return '—';
  }
  return `${pad(wall.day)}.${pad(wall.month)}.${wall.year} ${pad(wall.hours)}:${pad(wall.minutes)}`;
}

export function formatTime(iso?: string, timeZone?: string): string {
  const wall = wallClock(iso, timeZone);
  if (!wall) {
    return '—';
  }
  return `${pad(wall.hours)}:${pad(wall.minutes)}`;
}

export function formatSeconds(totalSeconds?: number): string {
  if (totalSeconds === undefined || Number.isNaN(totalSeconds)) {
    return '—';
  }
  const total = Math.max(0, Math.round(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} ч`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} мин`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds} сек`);
  }
  return parts.join(' ');
}

export function formatDuration(fromIso?: string, toIso?: string): string {
  if (!fromIso || !toIso) {
    return '—';
  }
  const fromMs = new Date(fromIso).getTime();
  const toMs = new Date(toIso).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs) || toMs < fromMs) {
    return '—';
  }
  const totalMinutes = Math.round((toMs - fromMs) / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  }
  return `${minutes} мин`;
}
