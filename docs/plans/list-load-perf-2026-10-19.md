# List Loading Performance — Papers, Review Queue, Browse

Status: **Phases 0–5 DONE.** Phase 6 next.
Started 2026-10-19. Continues the reader perf work in ADR 0005/0006.

Goal: time-to-first-row on the three list surfaces. Reader path is done —
do not reopen it.

## Status

| Phase | State | Commit(s) |
| --- | --- | --- |
| 0 — Commit pending UI/reader work | Done | `841ce6f` `06d0102` `0760188` `4cd79b8` |
| 1 — Instrument the lists | Done | `0a6e990` `b473b55` |
| 2 — Kill duplicate fetches | Done, device-verified | `95b44c7` `61c14e3` |
| 3 — Lean list select | Done, partly measured (see Baselines) | `cbe9bf5` |
| 4 — Disk persistence (ADR 0007) | Done, device-verified | `8566147` |
| 4.5 — Dashboard paint gate + profile seed | Done, device-verified | `1b9d894` `f3e7648` |
| 5 — Browse server filtering | Next | — |
| 6 — Faculty head-count queries | Last | — |

Gates each phase: `npx jest` (now 17 suites / 198 tests), `eslint src`
(0 errors), `npx tsc --noEmit` (22 pre-existing jest-globals errors only).
Never `prettier --write` on `ResearchDetailScreen.tsx`. Never push unless asked.

## Baselines (Android dev build)

Cold: Dashboard paint 2857 ms → 2023 ms; `dash:papers` 2392 → 1749 ms;
Browse `papers` 1086 ms; My Papers ~1580 ms.
Warm after Phase 2: My Papers rows 46 ms (was ~1580 ×2), Dashboard papers
2 ms (was ~1421), Browse categories/depts/programs 44/3/3 ms.
Phase 3 should move cold `dash:papers` (1749) and `browse:papers` (1079).

Phase 3 capture (2026-10-20) — **post-sign-in session, not a force-stopped
cold launch**, so treat as directional:

- Browse `papers` **510 ms** (was 1079) → −569 ms / −53%; paint 610 ms.
- My Papers rows 47 ms — warm: Dashboard had already populated
  `research:myPapers` from the same cache key.
- Dashboard `papers` 2207 ms is **not comparable**: the sample followed a
  student sign-in with three overlapping `fetchAppUserProfile` lookups, one
  serial inside `getMyPapers` (the profile lookup sits inside the span). Needs a
  clean cold launch before it is recorded as a regression or a win.
- Review Queue 784 ms (faculty; Phase 6 territory, not Phase 3).
- Owed still: visual check of Browse card author names and the My Papers
  Request-Publication button, plus one force-stopped cold launch.

Phase 4 capture (2026-10-20, module reload = cold cache; snapshots written by
the preceding session):

- `cache:hydrate` **5 entries / 19 ms** — the write/read round trip works.
- `dash:papers` **171 ms** (was 2895 ms in the same session with an empty
  disk); `browse:papers` 577 ms (was 1079).
- `papers-settled` / `paint` still landed at 1714 / 2781 ms because the
  notifications leg (1705 ms) gated the whole body — fixed in Phase 4.5.
- Browse card author names confirmed on-device.

Phase 4.5 capture (2026-10-20, cold launch with snapshots on disk):

- `cache:hydrate` **2 entries / 15 ms**; one `fetchAppUserProfile` lookup at
  startup.
- `dash:papers` **148 ms**, `papers-settled` **156 ms**, `paint` **547 ms**
  (was 2685 ms on the sign-in launch, where rows took 2195 ms with an empty
  disk).
- `notifications` **1100 ms**, i.e. **after** paint — the feed no longer gates
  the body.
- Sign-in launch still shows two `fetchAppUserProfile` lookups (auth listener
  + `signIn`); that duplicate needs the auth-flow refactor and stays out of
  scope. The third lookup — the first list read — is gone.
- My Papers Request-Publication flow confirmed working on approved rows; the
  two Phase 3 surfaces are now both checked.

## Deviations from the original plan

- **`apiCache` double-scoping** (`95b44c7`) — not in the plan; the largest
  win. `fetchWithSWR` passed an already-scoped key into the fetch helpers,
  which scoped again on write: entries landed under `scope:scope:key` and the
  cache had never served a hit. Every warm load was a real round trip.
- **Phase 2 queue fix** shipped as an explicit `opts.refresh` parameter on
  `load`, not a `refreshing` ref. Same intent, cleaner call sites.
- **Phase 3** dropped abstract from `filterPublishedRows`' search target
  entirely rather than keeping the branch.
- **Phase 1 grew**: added `perfSpan` (standalone stopwatch for concurrent
  legs); fixed first-paint marks that measured skeleton layout, not rows
  (`b473b55`).
- **Phase 4 also closed a scoping hole**: a fetch that outlived an account
  switch used to write the previous account's rows into the new scope (memory;
  with persistence, disk too). It is now dropped when the scope changed
  mid-flight.
- **Phase 4 moved the persistence seam** from `persistentSwr.ts` into
  `ApiCache` + `apiCacheStorage.ts`; see the Phase 4 section for why.
- **Phase 4.5 was added** (not in the original plan): the dashboard body was
  gated on the notifications leg, so rows ready at 171 ms painted at 2781 ms.
  Paint now gates on papers + categories. The same pass seeds the identity memo
  from the profile `applyUser` already resolved, removing one `public.users`
  lookup on cold start and the duplicate hydrate in the sign-in flow.

## Phase 4 — Disk persistence for list snapshots (ADR 0007)

The "rows instantly, always" change. The tab navigator unmounts inactive
tabs, so a tab return is a full remount; the in-memory cache dies with the
process. AsyncStorage@2.2.0 is already a dependency.

- `src/utils/apiCacheStorage.ts` (AsyncStorage I/O only) + policy inside
  `ApiCache`. The original draft put this in a `persistentSwr.ts` wrapper;
  rejected because a wrapper cannot see `apiCache.invalidate()` calls from
  `faculty.ts`, so snapshots would outlive mutations.
- Disk key `apiCache:v1:<scope>:<rawKey>`; `SWROptions.persist?: boolean`
  (opt-in, default false).
- Write `{data, timestamp}` after a successful foreground **or background**
  fetch. Fire-and-forget, deferred to a macrotask so `JSON.stringify` never
  lands in the frame where rows arrive. 512 KB cap per entry; an oversized
  snapshot is skipped and any existing one deleted.
- `hydrateFromDisk(scope)`, called by `AuthContext.applyUser` and **awaited
  before `setUser`**. The scope is `public.users.id`, so it cannot start
  before the profile lookup; the tab navigator is gated on `loading`, so the
  await is free on screen. Seeds entries with `timestamp: 0` — always stale,
  so they are served instantly and revalidated in the background. Never
  clobbers a live entry; aborts if the scope changed mid-read.
- Hydration is bounded (2 s) and never throws. A hung AsyncStorage must not
  trip the auth-bootstrap timeout and log the user out.
- Disk is never trusted fresh. `MAX_DISK_AGE` 24 h discards older entries;
  corrupt, wrongly shaped, or oversized entries are deleted.
- `setUserScope` change drops the **previous** scope's disk keys;
  `invalidate()`/`clear()` also clear disk.
- Persists: `research:myPapers`, `research:published:*`,
  `research:browse:*` (unfiltered page 0 only), `research:categories`,
  `submit:departments`, `submit:programs:*`.
  **Not** faculty (always revalidate).
- ADR `docs/adr/0007-list-snapshot-disk-persistence.md`. AsyncStorage manual
  mock at `__mocks__/@react-native-async-storage/async-storage.js` (plain
  functions — survives `jest.resetAllMocks`); cold-start tests construct a
  second `ApiCache` (class exported for tests).

Commits: `feat(api): persist list snapshots to disk for instant cold start`
+ `docs(adr): record list snapshot persistence contract`.

## Phase 4.5 — Dashboard paint gate + profile seeding

Added 2026-10-20 after the Phase 4 capture, when rows arrived at 171 ms but the
screen painted at 2781 ms.

- `DashboardScreen.loadData` awaits **papers + categories only**. Notifications
  run in parallel and fill Recent Activity when they land; they never hold the
  body on skeletons. Pull-to-refresh ends with the rows too.
  `list:dash:papers-settled` is emitted at the papers leg, so the mark reports
  rows-ready rather than all-legs-settled.
- `seedCurrentProfile(authUser, user)` feeds the profile `applyUser` already
  resolved into `currentProfile`'s memo. Keyed by the **auth** session user
  (id + email), not `public.users.id`. `applyUser` now hydrates and clears only
  on an actual scope change, so the second apply in the sign-in flow cannot
  re-read disk or drop the memo it just seeded.
- Effect: one `public.users` lookup on cold start (was two), two on sign-in
  (was three), one `cache:hydrate` line per identity change.

Commits: `perf(auth): seed the identity memo from the resolved profile`
+ `perf(dash): stop gating the dashboard body on notifications`.

## Phase 5 — Browse server-side filtering + pagination

Implemented 2026-10-21.

- `docs/sql/browse_papers_rpc.sql` (deployed as migration `browse_papers_rpc`):
  `browse_papers(p_categories text[], p_departments text[], p_programs uuid[],
  p_year_from int, p_year_to int, p_limit int, p_offset int)` returns
  `jsonb { items, total }`.
  - Status gate `approved`/`published`, `deleted_at is null`, year range on
    `coalesce(published_date, submission_date, created_at)` (same key as
    `paperDate()`), `ORDER BY` that key `desc nulls last, id asc` for stable
    paging. `LIMIT`/`OFFSET` clamped 1–100 / ≥0.
  - Items are shaped exactly like `PAPER_LIST_SELECT` (including nested
    `program` and `author`), so `toResearchPaper` is reused unchanged.
  - `total` comes from one `count(*)` over the same CTE — one round trip.
  - Partial index `idx_research_papers_browse_sort` on the sort key.
- `researchApi.browsePapers(filters, { page })` calls the RPC. Page 0 goes
  through SWR and persists **only when unfiltered** (filter combinations would
  multiply disk snapshots); later pages are plain reads the screen appends.
- `BrowseScreen`: 20/page (`BROWSE_PAGE_SIZE`), `onEndReached` infinite scroll
  with a footer spinner, filter changes debounced 250 ms and reset to page 0,
  result count shows `total` rather than the loaded-row count. In-flight
  responses are invalidated by a load token, and a page append is blocked while
  the filter key is changing (no mixed result sets).
- Fallback: if the RPC errors on page 0, `browsePapers` uses the pre-Phase-5
  fetch-all path and reports `serverFiltered: false`; the screen then filters,
  sorts and skips paging as before. Later-page errors just retry on the next
  scroll.

Deviations from the original plan:

1. **`security invoker`, not definer.** The existing policies already expose
   `approved` publicly and `published` to authenticated users, so running as
   the caller keeps exactly today's row visibility. `execute` is revoked from
   `public`/`anon` and granted to `authenticated`.
2. **Array facets.** The filter sheet is multi-select, so single-value params
   would have silently dropped selections.
3. **Departments are matched by name**, not id, because that is what the sheet
   stores (`department_id` is also denormalized on every row but unused here).
   Comparison is `lower(btrim(...))` on both sides.
4. **jsonb return** instead of a row set with a per-row `count(*) over()`;
   avoids repeating the total on every item.
5. **20/page**, not 50 — one comfortable screen of rows, and the table is 19
   rows today.
6. **Local query filtering when `flags.hybridSearch` is off** now only sees
   loaded pages. Accepted: the flag is `true`, so non-empty queries go through
   hybrid search (unpaged, limit 20) and never hit this path.
7. The old `research:published:{}` disk snapshot is orphaned by the new
   `research:browse:*` key and is dropped by hydration's 24 h age-out.

Commit: `perf(browse): filter and paginate published papers server-side`.

## Phase 6 — Faculty counts

- `getDashboardSummary` (`faculty.ts:717`): replace the full-row
  `select('status')` with 5 parallel
  `select('status', { count: 'exact', head: true })` queries. No SQL deploy.
  Leave `getUpNextPaper` unless the marks say otherwise.
- Verify the Review Queue `submission_date, created_at` index exists
  server-side; add `docs/sql/faculty_review_queue_indexes.sql`
  (composite b-tree + optional trigram for the `ilike` search).

Commit: `perf(faculty): count workload with head queries instead of
transferring rows`.

## Decisions (settled — do not re-ask)

1. Commit-first, 4-way split. Done.
2. Goal is rows instantly, always — brief cold skeleton not acceptable.
3. Browse will grow past a few hundred papers → server filtering mandatory.
4. Review Queue always revalidates; no disk snapshot for faculty.
5. Drop abstract from list rows; My Papers search = title/keywords/author.
6. Browse filtering via RPC + SQL file, deployed 2026-10-21 (migration
   `browse_papers_rpc`).

## Out of scope

Reader path. Query-library migration (hand-rolled SWR stays — it works now).

## Verification

User verifies on a physical phone dev build. Ask for a `[perf]` excerpt:
`Select-String -Path .expo\dev\logs\start.log -Pattern '\[perf\]' | ForEach-Object Line`
— the raw log contains `EXPO_PUBLIC_SUPABASE_*`; never paste verbatim.

Next: Phase 6 (faculty counts). Phase 5's RPC is deployed; the client uses it
on page 0 and falls back to the old fetch-all path if it is ever missing.
