/**
 * Epoch key for LegendList instances.
 *
 * LegendList 3.x performs a render-phase store write (`resetInitialRenderState`
 * → observable `.set()`) whenever a mounted list transitions from empty data
 * to non-empty data, which React reports as "Cannot update a component
 * (`ContainersLayer2`) while rendering (`LegendListInner2`)" (upstream
 * legend-list#502 — e.g. search → no matches → new results on the same list
 * instance). Segmenting the React key on emptiness forces a remount exactly at
 * empty↔non-empty flips, so every 0→N batch arrives on a fresh instance
 * (`isFirst`), where the reset branch is skipped. Same-epoch N→M updates
 * (search narrowing, pagination appends, pull-to-refresh) keep the instance and
 * never satisfy that branch (`previousDataLength > 0`).
 */
export const listEpochKey = (isEmpty: boolean) => (isEmpty ? 'epoch-empty' : 'epoch-full');
