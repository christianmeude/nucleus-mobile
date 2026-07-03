---
undertaking: "UX Remodel"
phase: "1 complete (foundation reset); 2 next"
date: 2026-06-27
branch: feat/ux-remodel
last_commit: "feat(theme): adopt cool surfaces + Source Serif 4 / IBM Plex Sans"
status: in-progress
---

# NUcleus Mobile — Session Handoff (UX Remodel — Phase 1 reset / foundation)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`) on the post-Submit-Research baseline. The **UX Remodel** undertaking has been **re-grounded** to a clean, minimalist, professional, readability-first direction. **Phase 1 (foundation — cool surfaces + font swap) is complete and committed.** **Phase 2 (Browse / Hybrid) is next and should be implemented right away.**

> ⚠️ **Work in the worktree:** `C:\Users\Christian\Projects\capstone-nucleus-rn-ux-remodel` (branch `feat/ux-remodel`). The main repo dir is checked out on `dev` — do not edit app code there. `node_modules` is installed in the worktree.

**Canonical docs:** `docs/plans/UX_REMODEL.md` (redefined plan), `docs/PRODUCT_ROADMAP.md`, `docs/CONVENTIONS.md`, `docs/PROJECT_CONTEXT.md`. The full 6-phase plan is also at `~/.claude/plans/good-with-the-worktree-swift-snowglobe.md`.

This handoff **supersedes** `HANDOFF_UX-R_PHASE-1.md` (the retired warm-paper Phase 1).

## Direction (reset 2026-06-27)

- **Cool slate** surfaces (warm cream dropped). Navy `#1B3A8C` primary/nav/links; Gold `#F5A623` = one emphasis per screen.
- **Two typefaces:** Source Serif 4 (titles, used with restraint) + IBM Plex Sans (all UI). Lora + Outfit retired.
- **Per-screen picks:** Browse → *Hybrid* (tile grid + filter/sort + featured hero). ResearchDetail → *Hybrid* + read-paper/bookmark/collections + related papers. Dashboard → **launch-pad** (no 4-box tally). **Continue-reading dropped.**
- Follow the `frontend-design` skill: one signature element per screen, spend boldness there, serif sparingly, minimal = precision.
- **Design reference:** imported Claude Design project `NUcleus Mobile` (id `861320dc-7b49-471b-a4a3-0d0d74dbff58`); Hybrid Browse mock = `browse/hybrid.html`. (DesignSync needs `/design-login` in an interactive terminal.)

## What Changed Since HANDOFF_UX-R_PHASE-1

- **Direction reset.** Warm→cool; Lora+Outfit→Source Serif 4 + IBM Plex Sans; per-screen direction chosen by reviewing the imported design project. Three decisions locked: Dashboard = launch-pad; saves = **bookmarks + collections together** (unified model, bookmark = default "Saved" collection); related-papers = **client-side heuristic now** (+ a deferred-semantic GitHub issue to be opened in Phase 3).
- **Phase 1 foundation committed** (`b7ebd86`): removed `palette.warm`/`surface.paper*`/`border.warm*` from `colors.ts`; swapped `families` in `typography.ts` + loaders in `App.tsx`; deps `lora`/`outfit` → `source-serif-4`/`ibm-plex-sans`. `tsc` green; **fonts verified on device by Christian**.
- **Plan reset committed** (`7282b38`): `UX_REMODEL.md` rewritten; Phase 1 marked complete.

## Critical Architectural Context (session-specific)

- **Worktree, not main dir.** All UX Remodel work happens in `capstone-nucleus-rn-ux-remodel`.
- **Navigation is frozen → NO new routes.** Collections (Phases 4–5) surface via bottom sheets / in-screen sections only. If a route seems required, stop and ask.
- **`OrbitalAccent` (atom motif) is still consumed by `Logo.tsx`** — deferred brand-mark decision, untouched this session.
- New types (collections, etc.) live in API facades, not `domain.ts` (frozen).
- Sign-out currently lives **only on Dashboard** — must remain reachable after the Phase 5 launch-pad rebuild.

## Open Issues

- 🔴 #5 — Browse category filter shows unresolved UUIDs — carry the `categoryLineForDisplay` display guard into Phase 2.
- 🔴 #6 — Browse list/tile view — **satisfied by the Phase 2 Hybrid tile grid** (close on completion).
- 🔴 #8 — ResearchDetail download button always visible (no `allow_download`) — unchanged.
- Phase 3 will OPEN an issue logging deferred semantic related-papers (post Hybrid Search merge).
- **Current cap: #8. Do not invent issue numbers beyond #8.**

## Supabase

No RLS/RPC/schema changes this session. Phase 4 (save features) will add `collections` + `collection_papers` tables with email-resolved RLS + SECURITY DEFINER RPCs — **pre-flight brief required before any deploy** (CLAUDE.md rule 3).

## Current State of the Codebase (gotchas only)

- Foundation now: cool slate surfaces + Source Serif 4 (`fontFamilies.display`) / IBM Plex Sans (`fontFamilies.ui`). Type scale/weights unchanged — only the underlying families swapped, so existing screens keep working; serif is applied to titles at the screen level going forward.
- `ResearchCard` is the single-column card (keep it); Phase 2 adds a separate `ResearchTile` for the 2-col grid.
- `researchApi` (in `src/api/research.ts`) already exposes `getPublishedPapers`, `getCategories`, `getResearchById`, `getResearchFile`, `trackView` — reuse for Browse/Detail.

## Current Git State

Branch `feat/ux-remodel` (worktree). After this handoff commits, working tree is clean.
Workflow: `feat/ux-remodel → dev → main` (all local; pushes held by Christian).

## Commit History (most recent first)

```
(this handoff) docs(handoff): add HANDOFF_UX-R_PHASE-1-RESET
7282b38 docs(plans): reset UX Remodel plan to cool/minimal direction
b7ebd86 feat(theme): adopt cool surfaces + Source Serif 4 / IBM Plex Sans
2f7d7cc chore(design-sync): add Browse direction mockups A, B, C
f6c1552 Merge branch 'dev' into feat/ux-remodel
```

## Immediate Next Steps — Phase 2 (Browse / Hybrid), implement right away

1. In the worktree, rebuild `src/screens/main/BrowseScreen.tsx` to the Hybrid layout: navy **featured hero** (most-recent or most-viewed published paper) → search bar → **filter + sort** controls → **2-column tile grid**.
2. Add `src/components/ResearchTile.tsx` — compact 2-col card: Source Serif 4 title (`theme.fontFamilies.display`), category dot, author, views/date. Keep `ResearchCard` for single-column lists.
3. Reuse `researchApi.getPublishedPapers` / `getCategories`, `ListEntranceItem`, `ui/Chip`; use `ui/BottomSheet` for filter/sort if it stays clean.
4. Palette discipline: cool slate; **gold once** (the featured badge). Subtle press feedback only (`theme.motion.spring.press`).
5. Carry the #5 UUID display guard; the tile grid satisfies #6 (note for closing).
6. `npx tsc --noEmit` green (use the worktree's tsc: `node_modules/.bin/tsc --noEmit -p tsconfig.json`); verify on the Android dev-client. Stage specific files; present the commit for review (no Co-Authored-By).
