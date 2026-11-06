import { useCallback, useEffect, useState } from 'react';

// Counts down whole seconds from `start`; restart(n) begins again. Used for OTP expiry and resend cooldown.
export function useCountdown(start = 0) {
  const [left, setLeft] = useState(start);
  useEffect(() => {
    if (left <= 0) return undefined;
    const id = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(id);
  }, [left]);
  const restart = useCallback((seconds) => setLeft(seconds), []);
  return [left, restart];
}
export const mmss = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
