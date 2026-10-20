# List Snapshots Persist to Disk, but Are Never Trusted Fresh

The tab navigator unmounts inactive tabs, so returning to My Papers or Browse is a full remount, not a refocus. Phase 2 made those remounts instant by serving the in-memory SWR cache while revalidating behind the UI. That cache dies with the process: a cold launch, or a kill while backgrounded, still paid the full network round trip before the first row — measured at 1.0–1.8 s on the list legs. The goal is rows instantly, always; a brief skeleton on cold start is not acceptable.

We persist a small, explicit set of list snapshots to AsyncStorage and hydrate them into the in-memory cache before the first list screen mounts. A snapshot is `{data, timestamp}` under a versioned, per-user key (`apiCache:v1:<scope>:<rawKey>`). `AuthContext` re-scopes the cache to `public.users.id` and awaits `hydrateFromDisk` before `setUser`, so the tab navigator's first mount already has rows. The scope cannot be known before the profile lookup, and the app loader is up until then, so the read costs nothing on screen. Hydrated entries carry `timestamp: 0`: a read returns them immediately and always triggers a background revalidation. Disk is never treated as fresh, and a 24-hour cap discards anything older, which bounds how wrong a stale title can be.

Only opt-in call sites persist: My Papers (shared with Dashboard), published papers for Browse, categories, departments, and programs. Faculty data — the Review Queue and workload counts — always revalidates, by decision. Entries are written after successful foreground and background fetches, fire-and-forget and deferred past the frame that paints the rows. Writes over 512 KB are dropped rather than gambling on a flaky large AsyncStorage write.

Invalidation mirrors to disk: `invalidate(prefix)` and `clear()` remove the matching snapshots, and a scope change drops the previous scope's keys, so signing out leaves no rows for the next account. Hydration never clobbers a live memory entry, aborts if the account switched mid-read, and is bounded at 2 s — a stuck native store must not trip the auth-bootstrap timeout and log the user out.

## Alternatives rejected

- A wrapper module around `apiCache` (the original sketch, `persistentSwr.ts`). It cannot see the `apiCache.invalidate()` calls in the mutation paths, so a mutation would leave a pre-mutation snapshot on disk to be replayed on the next cold start.
- Treating disk entries as fresh within their TTL. A day-old snapshot would skip the revalidation that is the whole point of SWR; `timestamp: 0` keeps the read instant and the data honest.
- Hydrating after `setUser` (fire-and-forget). Screens mount as soon as the user is set, so the first list render would race the disk read and sometimes show a skeleton — the exact outcome this phase exists to remove.
- Persisting every cached query. Reader and detail payloads and per-paper annotations are large, change often, and are not part of the instant-rows path.

## Consequences

- Paper metadata (titles, authors, statuses) now sits unencrypted in app-private AsyncStorage for up to 24 hours. It is scoped per app user, dropped on sign-out and on account switch, and never contains a signed file URL.
- A snapshot can be up to one revalidation behind on first paint. It is corrected as soon as the background fetch lands; list screens already repaint from `onUpdate`.
- Cold start now includes a bounded disk read before the navigator mounts. It is logged as `[perf] cache:hydrate`; expected in the low milliseconds for these five keys.
- Snapshot writes add one `JSON.stringify` and one `setItem` per fetch, off the paint task. The 512 KB cap keeps a growing Browse list from becoming a slow write; Browse pagination (Phase 5) keeps it well under the cap.
- The AsyncStorage test mock is plain functions rather than `jest.fn()`s, because `jest.resetAllMocks()` in the API suites wipes Jest-mock implementations and silently empties the store.
