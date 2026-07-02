---
undertaking: "UX Remodel"
phase: "6 (final — all phases complete)"
date: 2026-06-29
branch: feat/ux-remodel
last_commit: "docs(ux-remodel): mark Phase 5 complete in plan"
status: complete
---

# NUcleus Mobile — Session Handoff (UX Remodel — Phase 6 / complete)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`), UX Remodel undertaking on `feat/ux-remodel`. All 6 phases are complete and committed. The branch is **merge-ready** — the immediate next step is `git merge --no-ff feat/ux-remodel` into `dev`.

> ⚠️ **Work in the worktree:** `C:\Users\Christian\Projects\capstone-nucleus-rn-ux-remodel`. The main repo dir stays on `dev`.

## What Changed Since HANDOFF_UX-R_PHASE-1-RESET

This handoff covers phases 2–6, which were not previously captured.

**Phase 2 — Browse (Hybrid)**
- `src/components/ResearchTile.tsx` — compact 2-col tile (category dot, serif title, author, views/date)
- `src/screens/main/BrowseScreen.tsx` — rebuilt: navy featured hero (gold "Featured Paper" badge, concentric rings) + filter/sort bottom sheets + 2-col tile grid
- Featured = most-viewed published paper; hidden once search/category filter is active
- Satisfies Issue #6 (tile grid; no toggle — product decision)

**Phase 3 — ResearchDetail (Hybrid + related papers)**
- `src/screens/main/ResearchDetailScreen.tsx` — rebuilt: serif "title page" layout → "Read paper" button → keywords → abstract → related papers (client-side heuristic) → workflow history (owner-only, pre-approval)
- Issue #13 opened for deferred semantic related-papers
- "Read paper" still opens system browser (PDF viewer swap deferred to faculty-access mini-merge)

**Phase 4 — Save features backend**
- Supabase: `collections` + `collection_papers` tables deployed with RLS
- SELECT-only direct RLS (email-resolved); all writes via SECURITY DEFINER RPC
- `toggle_paper_saved(p_paper_id uuid) RETURNS boolean` — finds/creates "Saved" collection, toggles membership
- `src/api/collections.ts` — `togglePaperSaved`, `getSavedPaperIds`, `getSavedPapers`, `getMyCollections`
- Snapshot: `docs/sql/collections_rls_rpcs.sql`

**Phase 5 — Save UI + Dashboard launch-pad**
- ResearchDetailScreen: gold bookmark icon (filled/outline) alongside "Read paper"; optimistic toggle; saved state loaded in parallel with paper data
- DashboardScreen rebuilt: greeting + single status line + quick action cards (Submit / Browse) + notifications row with unread badge + recent papers (3) + Saved section (gold bookmark icons); 4-stat grid removed; sign-out retained
- `Promise.allSettled` in `loadData` — sub-fetch failures never block the screen
- `collections.ts`: added `SavedPaper` type and `getSavedPapers` facade

**Phase 6 — Polish + QA**
- Cross-screen QA: palette discipline, a11y, edge/empty states all clean across all three hero screens
- `npx tsc --noEmit` green throughout

## Critical Architectural Context (session-specific)

**Collections pattern (new this undertaking):**
- Bookmark = membership in the default "Saved" collection (`is_default = true`)
- Direct writes to `collections`/`collection_papers` are blocked by RLS (no INSERT/DELETE policies) — all writes go through `toggle_paper_saved` RPC
- `toggle_paper_saved` creates the "Saved" collection on first call atomically (INSERT … ON CONFLICT DO NOTHING)
- `getSavedPaperIds().catch(() => [])` pattern used in ResearchDetail to silently absorb saved-state fetch failures without breaking the paper load

**PDF viewer (deferred):**
- "Read paper" still opens `expo-web-browser`. Swap to the shared in-app `PdfViewer` (from `feat/faculty-access`) is deferred to a mini-merge session. The `openFile` handler in ResearchDetailScreen is isolated — it's a one-spot change.

## Open Issues

| # | Title | Status |
|---|---|---|
| 13 | `research detail: related papers via semantic search` | 🔴 Open |
| 12 | `faculty: additional tabs` | 🔴 Open |
| 11 | `faculty review: annotation threads` | 🔴 Open |
| 9 | `faculty review actions: email and push notifications` | 🔴 Open |
| 8 | `ResearchDetail: Download button always visible` | 🔴 Open |
| 6 | `Browse: add toggleable list and tile view` | Close manually — satisfied by Phase 2 Hybrid tile grid |
| 5 | `Browse: category filter shows unresolved UUIDs` | 🔴 Open (UUID guard in place; underlying data issue in Supabase unresolved) |

**Current cap: #13.**

## Current RLS Policy State (Supabase) — UX Remodel additions

All pre-existing policies unchanged. New policies from Phase 4:

| Table | Policy | Operation | Condition |
|---|---|---|---|
| `collections` | `collections_select_own` | SELECT | email-resolved `user_id` |
| `collection_papers` | `collection_papers_select_own` | SELECT | ownership chain through `collections` |

No INSERT/UPDATE/DELETE policies on either table — direct writes blocked; all writes via RPC.

## Supabase RPCs — UX Remodel additions

| Function | Type | Purpose |
|---|---|---|
| `toggle_paper_saved(p_paper_id uuid)` | SECURITY DEFINER | Creates "Saved" collection if needed, toggles paper membership, returns `boolean` (true = now saved) |

Pre-existing RPCs (see `docs/sql/` snapshots on `dev`): `increment_view_count`, `get_faculty_members`, `search_students`, `create_co_author_invitations`, `get_user_basic_info`.

## Current State of the Codebase

- **Design system:** cool slate surfaces, Source Serif 4 (display/titles) + IBM Plex Sans (UI/body). No warm tokens remain.
- **Hero screens:** Browse (Hybrid tile grid + hero), ResearchDetail (serif title page + related), Dashboard (launch-pad) — all rebuilt to pitch quality.
- **Collections facade:** `src/api/collections.ts` — full save-features API.
- **SQL snapshot:** `docs/sql/collections_rls_rpcs.sql` — canonical record of Phase 4 Supabase deploy.
- **Frozen files:** all respected throughout (navigation, auth, domain types untouched).
- **OrbitalAccent:** still consumed by `Logo.tsx` — brand-mark decision deferred, untouched.

## Current Git State

Branch `feat/ux-remodel` (worktree `capstone-nucleus-rn-ux-remodel`). Working tree is **clean**. All phases committed. **Merge-ready.**

## Commit History (most recent first)

```
eb6b8c2 docs(ux-remodel): mark Phase 5 complete in plan
ea2ecd3 feat(ux-remodel): add bookmark toggle and rebuild Dashboard to launch-pad
f9609a7 docs(ux-remodel): mark Phase 4 complete in plan
7ca9b95 feat(ux-remodel): add save-features backend — tables, RLS, RPC, and facade
34016bc Merge branch 'dev' into feat/ux-remodel (conventions sync)
68e7e19 feat(ux-remodel): rebuild ResearchDetail to Hybrid title page + related papers
2e826cf feat(ux-remodel): rebuild Browse to Hybrid hero + tile grid
```

## Immediate Next Steps

**Before merging:**
1. On-device dev-client verification — test all three hero screens on the Android dev-client:
   - Browse: featured hero, filter/sort sheets, tile grid, category UUID guard
   - ResearchDetail: serif title page, bookmark toggle (gold filled/outline, persists on nav back), related papers
   - Dashboard: status line, quick action cards, notifications badge, Saved section — and the full bookmark flow (save → navigate to Dashboard → paper appears in Saved)
2. Close GitHub Issue #6 manually — comment that Phase 2 Hybrid tile grid satisfies it (no list/tile toggle — product decision)

**Merge:**
3. On `dev`: `git merge --no-ff feat/ux-remodel` with the structured merge commit (CONVENTIONS §1):
   ```
   Merge branch 'feat/ux-remodel' into dev

   UX Remodel — rebuilt Browse, ResearchDetail, and Dashboard to cool minimalist design system; added save (bookmarks + collections) backend and UI

   - Phase 1: Design-system foundation (cool surfaces, Source Serif 4 + IBM Plex Sans)
   - Phase 2: Browse — Hybrid hero + tile grid
   - Phase 3: ResearchDetail — serif title page + related papers
   - Phase 4: Save features backend (Supabase collections + toggle_paper_saved RPC)
   - Phase 5: Save UI + Dashboard launch-pad
   - Phase 6: QA + polish
   ```
4. After merge: update UX Remodel status to `complete` in CLAUDE.md Undertaking Registry on `dev`

**After merge — recommended next sessions:**
- **PDF viewer mini-merge** — integrate `PdfViewer` from `feat/faculty-access` into the "Read paper" button on ResearchDetail (one-spot swap in `openFile`); requires EAS dev-client rebuild to test both student/faculty roles
- **Hybrid Search** (`feat/hybrid-search`) — active undertaking, pick up where it left off
- **Faculty Access** (`feat/faculty-access`) — active, annotations (#11) is next
