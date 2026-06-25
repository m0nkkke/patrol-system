export const ACCESS_KEY_RAW_LENGTH = 12;
export const ACCESS_KEY_MASK_LENGTH = 14;

export function formatAccessKey(input: string): string {
  const cleaned = input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ACCESS_KEY_RAW_LENGTH);
  const groups = cleaned.match(/.{1,4}/g);
  return groups ? groups.join('-') : '';
}

export function isAccessKeyComplete(formatted: string): boolean {
  return formatted.replace(/-/g, '').length === ACCESS_KEY_RAW_LENGTH;
}
