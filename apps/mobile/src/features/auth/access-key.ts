export const ACCESS_KEY_RAW_LENGTH = 12;
export const ACCESS_KEY_MASK_LENGTH = 14;

export function formatAccessKey(input: string): string {
  const upper = input.toUpperCase();
  const cleaned = upper
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ACCESS_KEY_RAW_LENGTH);
  const groups = cleaned.match(/.{1,4}/g);
  const formatted = groups ? groups.join('-') : '';
  const separatorCount = Math.floor((cleaned.length - 1) / 4);
  const shouldKeepTypedSeparator =
    upper.endsWith('-') &&
    (cleaned.length === 4 || cleaned.length === 8) &&
    formatted.length === cleaned.length + separatorCount;

  return shouldKeepTypedSeparator
    ? `${formatted}-`.slice(0, ACCESS_KEY_MASK_LENGTH)
    : formatted;
}

export function isAccessKeyComplete(formatted: string): boolean {
  return formatted.replace(/-/g, '').length === ACCESS_KEY_RAW_LENGTH;
}
