import { describe, expect, it } from '@jest/globals';

import { ACTOR_FULL_NAME_REQUIRED_CODE, requiresActorFullName } from './login-flow';

describe('requiresActorFullName', () => {
  it('recognizes the backend challenge for a universal route setter', () => {
    expect(requiresActorFullName(ACTOR_FULL_NAME_REQUIRED_CODE)).toBe(true);
  });

  it('does not treat invalid credentials or network errors as a universal account', () => {
    expect(requiresActorFullName('UNAUTHORIZED')).toBe(false);
    expect(requiresActorFullName('NETWORK_ERROR')).toBe(false);
  });
});
