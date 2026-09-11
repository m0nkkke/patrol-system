import { useCallback, useRef } from 'react';

const DEFAULT_PRESS_GUARD_MS = 750;

export function useGuardedPress(
  onPress: (() => void) | undefined,
  guardMs = DEFAULT_PRESS_GUARD_MS,
): (() => void) | undefined {
  const latestOnPress = useRef(onPress);
  const lastAcceptedPressAt = useRef<number | null>(null);

  latestOnPress.current = onPress;

  const guardedPress = useCallback(() => {
    const handler = latestOnPress.current;
    if (!handler) {
      return;
    }

    const now = Date.now();
    const lastPress = lastAcceptedPressAt.current;
    if (lastPress !== null && now - lastPress < guardMs) {
      return;
    }

    lastAcceptedPressAt.current = now;
    handler();
  }, [guardMs]);

  return onPress ? guardedPress : undefined;
}
