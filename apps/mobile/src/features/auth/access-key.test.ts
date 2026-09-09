import { describe, expect, it } from '@jest/globals';

import {
  ACCESS_KEY_MASK_LENGTH,
  formatAccessKey,
  isAccessKeyComplete,
} from './access-key';

describe('formatAccessKey', () => {
  it('normalizes pasted input and groups it by four characters', () => {
    expect(formatAccessKey('ab12 cd34-ef56')).toBe('AB12-CD34-EF56');
  });

  it('keeps a separator typed after a complete group', () => {
    expect(formatAccessKey('ABCD-')).toBe('ABCD-');
    expect(formatAccessKey('ABCD-EFGH-')).toBe('ABCD-EFGH-');
  });

  it('removes unsupported characters and limits the key length', () => {
    const formatted = formatAccessKey('ABCD_efgh!1234-extra');

    expect(formatted).toBe('ABCD-EFGH-1234');
    expect(formatted).toHaveLength(ACCESS_KEY_MASK_LENGTH);
  });
});

describe('isAccessKeyComplete', () => {
  it('accepts only a complete masked access key', () => {
    expect(isAccessKeyComplete('AB12-CD34-EF56')).toBe(true);
    expect(isAccessKeyComplete('AB12-CD34-EF5')).toBe(false);
    expect(isAccessKeyComplete('AB12_CD34_EF56')).toBe(false);
    expect(isAccessKeyComplete('AB12-CD34-EF!6')).toBe(false);
  });
});
