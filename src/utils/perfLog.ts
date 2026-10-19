/**
 * Dev-only timing marks for the paper-open path.
 *
 * Why this exists: the paper-open delay was originally diagnosed by reading
 * millisecond-stamped `console.log` lines out of the Metro dev log after the
 * fact, which made before/after comparison guesswork — the log had no marker for
 * when the user actually tapped a paper or when the reader first painted.
 *
 * These marks add that spine. Each `perfStart()` resets a clock; each
 * `perfMark()` logs the elapsed milliseconds since it. Every line is tagged
 * `[perf]` so a session can be filtered with a single grep.
 *
 * Compiled out of release builds (`__DEV__`), so this costs nothing in
 * production and never ships user-visible logging.
 */

let clockOrigin: number | null = null;

function now(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/** Starts (or restarts) the clock that `perfMark()` measures against. */
export function perfStart(stage: string): void {
  if (!__DEV__) return;
  clockOrigin = now();
  console.log(`[perf] ${stage} (clock reset)`);
}

/** Logs elapsed milliseconds since the last `perfStart()`. */
export function perfMark(stage: string, details?: Record<string, unknown>): void {
  if (!__DEV__) return;
  const elapsed = clockOrigin === null ? null : Math.round(now() - clockOrigin);
  console.log(`[perf] ${stage}`, {
    ...(elapsed === null ? {} : { sinceMs: elapsed }),
    ...details,
  });
}

/**
 * Starts a standalone stopwatch and returns a function that logs its elapsed
 * milliseconds. Unlike `perfStart()`/`perfMark()`, a span does not touch the
 * shared clock — so the concurrent network legs of one list load (rows,
 * categories, filter lookups) each report their own duration instead of
 * clobbering each other's origin.
 */
export function perfSpan(stage: string): () => void {
  if (!__DEV__) return () => {};
  const origin = now();
  console.log(`[perf] ${stage} (span started)`);
  return () => {
    console.log(`[perf] ${stage}`, { spanMs: Math.round(now() - origin) });
  };
}
