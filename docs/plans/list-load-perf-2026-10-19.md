# List Loading Performance — Papers, Review Queue, Browse

Status: **Phases 0–4 DONE** (Phase 4 not device-verified yet). Phase 5 next.
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
| 4 — Disk persistence (ADR 0007) | Done, **not device-verified** | `8566147` |
| 5 — Browse server filtering | Next | — |
| 6 — Faculty head-count queries | Last | — |

Gates each phase: `npx jest` (now 17 suites / 196 tests), `eslint src`
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
  `research:categories`, `submit:departments`, `submit:programs:*`.
  **Not** faculty (always revalidate).
- ADR `docs/adr/0007-list-snapshot-disk-persistence.md`. AsyncStorage manual
  mock at `__mocks__/@react-native-async-storage/async-storage.js` (plain
  functions — survives `jest.resetAllMocks`); cold-start tests construct a
  second `ApiCache` (class exported for tests).

Commits: `feat(api): persist list snapshots to disk for instant cold start`
+ `docs(adr): record list snapshot persistence contract`.

## Phase 5 — Browse server-side filtering + pagination

- `docs/sql/browse_papers_rpc.sql`:
  `browse_papers(p_category, p_department, p_program, p_year_from, p_year_to, p_limit, p_offset)`
  — SECURITY DEFINER, `status IN ('approved','published')` + eq-filters +
  `date_part('year', coalesce(published_date, submission_date, created_at))`
  range, `ORDER BY coalesce(...) DESC`, returns rows + `count(*)`.
  **User deploys to Supabase.**
- `getPublishedPapers` switches to the RPC with 50/page paging; the current
  client-filter path stays as fallback if the RPC errors.
- BrowseScreen: infinite scroll via `onEndReached`; filters/year trigger a
  fresh paged query; the `matched` memo only filters server-search results.

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
6. Browse filtering via RPC + SQL file, deployed by the user.

## Out of scope

Reader path. Query-library migration (hand-rolled SWR stays — it works now).

## Verification

User verifies on a physical phone dev build. Ask for a `[perf]` excerpt:
`Select-String -Path .expo\dev\logs\start.log -Pattern '\[perf\]' | ForEach-Object Line`
— the raw log contains `EXPO_PUBLIC_SUPABASE_*`; never paste verbatim.

Next capture owed: one **force-stopped cold launch** after Phase 4 — it settles
both Phase 3's Dashboard leg and Phase 4's hydration (expect a `cache:hydrate`
span and list rows before any paper fetch settles). Plus the Phase 3 visual
check: Browse card author names, and the My Papers Request-Publication button
on approved rows.
