/** Rejects if `promise` does not settle within `ms`. The underlying operation is
 *  not cancelled (Supabase queries are not abortable at this seam) — the caller
 *  just stops waiting, so UI loading states can never spin forever on a stalled
 *  socket. Regression: a hung profile query left the app on the loader forever.
 */
export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`${label} timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'Operation'): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}
