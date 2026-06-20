import { createHash, randomInt } from 'crypto';

const ACCESS_KEY_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ACCESS_KEY_GROUP_LENGTH = 4;
const ACCESS_KEY_GROUPS = 3;

export function generateAccessKey(): string {
  let normalized = '';

  for (let index = 0; index < ACCESS_KEY_GROUP_LENGTH * ACCESS_KEY_GROUPS; index += 1) {
    normalized += ACCESS_KEY_ALPHABET[randomInt(ACCESS_KEY_ALPHABET.length)];
  }

  return formatAccessKey(normalized);
}

export function normalizeAccessKey(accessKey: string): string {
  return accessKey.replace(/[\s-]/g, '').toUpperCase();
}

export function formatAccessKey(accessKey: string): string {
  const normalized = normalizeAccessKey(accessKey);
  const groups: string[] = [];

  for (let index = 0; index < normalized.length; index += ACCESS_KEY_GROUP_LENGTH) {
    groups.push(normalized.slice(index, index + ACCESS_KEY_GROUP_LENGTH));
  }

  return groups.join('-');
}

export function hashAccessKey(accessKey: string): string {
  return createHash('sha256').update(normalizeAccessKey(accessKey)).digest('hex');
}
