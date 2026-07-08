import { useEffect, useState } from 'react';

/**
 * Returns `value` only after it has stopped changing for `delayMs`. Used to
 * throttle server-side search so a network request fires once the user pauses
 * typing rather than on every keystroke.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
