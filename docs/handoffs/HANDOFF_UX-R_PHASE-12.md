---
undertaking: "UX Remodel"
phase: "12 (all screens complete)"
date: 2026-07-02
branch: feat/ux-remodel
last_commit: "feat(ux-remodel): refine Browse to one-column + complete headerless tabs"
status: in-progress
---

# NUcleus Mobile — Session Handoff (UX Remodel — Phase 12 / screens complete)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`), UX Remodel undertaking on `feat/ux-remodel` (worktree `C:\Users\Christian\Projects\capstone-nucleus-rn-ux-remodel`; main repo dir stays on `dev`). The undertaking was **extended** past its original 3-hero-screen scope: Phases 7–12 rebuilt the **new Profile screen + every remaining screen** to the cool-slate / Source Serif 4 + IBM Plex Sans system. **All screen implementations are complete and committed; the branch is not yet merged**, and a revisions pass on the built screens is queued.

**Canonical docs:** `docs/PROJECT_CONTEXT.md`, `docs/CONVENTIONS.md`, `docs/plans/UX_REMODEL.md`. **Repo:** `christianmeude/capstone-nucleus-rn`.

## UX Remodel Status

- ✅ Phases 1–6 — foundation + 3 hero screens (Browse/ResearchDetail/Dashboard), save features (prior handoff `HANDOFF_UX-R_PHASE-6`)
- ✅ Phase 7 — Profile (new) + navigation wiring
- ✅ Phase 8 — My Papers (status-led list + gold FAB)
- ✅ Phase 9 — Notifications (date groups + type icons)
- ✅ Phase 10 — Invitations (avatar cards + inline actions)
- ✅ Phase 11 — Submit Research (carded sections, visual-only)
- ✅ Phase 12 — Browse refinement (one-column + view toggle) + headerless completion
- ⏳ Revisions pass on built screens (queued by Christian — held until all screens done)
- ⏳ Merge `feat/ux-remodel` → `dev`

## What Changed Since HANDOFF_UX-R_PHASE-6

All work built from Claude Design mockups (project `NUcleus Mobile`) via the DesignSync MCP. Chosen directions: Profile C · My Papers B · Notifications A+B · Invitations B · Submit A · Browse Refinement B (dot variant).

- **New `ProfileScreen.tsx`** (stack route, reached by an initials-avatar in the Dashboard header). Soft-navy band + stats (Papers/Saved) + account rows + app-preferences placeholder + sign-out link. Sign-out **moved off** the Dashboard into Profile.
- **New `MyPaperCard.tsx`**; My Papers rebuilt to a status-led list with a **gold Submit FAB**.
- **`NotificationCard.tsx`** rebuilt (tinted per-type icons keyed off `NotificationItem.type`, unread band, navy dot); Notifications screen now date-grouped (Today/This week/Earlier).
- **`InvitationCard.tsx`** rebuilt (inviter avatar, status pill, inline navy Accept pill + subtle Decline link, receding expired cards).
- **`SubmitResearchScreen.tsx`** re-skinned into numbered carded sections + sticky gold footer — **visual only, no logic/field-order change**.
- **`BrowseScreen.tsx`** refined: one-column dot cards by default, **1-/2-column view toggle**, category topic-chips (replaced the Filters bottom sheet), navy hero kept.
- **Headerless tab model:** all 5 student tabs now `headerShown: false` with in-body serif titles + `useSafeAreaInsets`.
- **Shared util `src/utils/category.ts`** — `resolveCategoryName` / `buildCategoryNameById` / `UUID_PATTERN`, deduped out of Browse/ResearchDetail/My Papers.
- **UI skills swapped** (personal `~/.claude/skills/`): removed web-oriented (frontend-design/brand-guidelines/theme-factory); installed `building-native-ui`, `mobile-app-ui-design`, `material-3`, `swiftui-skills` (parked). Plan §2 updated.
- **`docs/CONVENTIONS.md` §10 "Project-Wide Standards"** added **on `dev`** (commit `c8eef38`) — shared utils + design system are app-wide and propagate to `feat/faculty-access` on merge. *(This lives on `dev`, not yet merged into `feat/ux-remodel`.)*

## Critical Architectural Context (session-specific)

- **Headerless tabs:** tab headers are hidden in `AppNavigator` per-screen; each screen owns its serif title and top safe-area inset. When adding a tab screen, follow this pattern (no native header).
- **Scoped unfreezes on this branch only:** `AppNavigator.tsx` + `navigation/types.ts` (Phase 7, Profile route) and `SubmitResearchScreen.tsx` (Phase 11) had their deny rules removed from **this branch's** `.claude/settings.json`. The session-critical core (Auth/supabase/domain/auth/authStorage) stays frozen. The harness **auto-mode classifier blocks the agent from editing `settings.json` itself** and snapshots deny rules at session start — Christian must delete deny lines and restart Claude for an unfreeze to take effect.
- **Category display:** always via `resolveCategoryName(value, categoryNameById)` (UUID-guarded, Issue #5) — never re-implement.

## Resolved / Open Issues

- ✅ **#6** closed this session — Browse 1-/2-column toggle delivered (Phase 12).

Open (unchanged): 🔴 #13, #12, #11, #9, #8, #5. **Current cap: #13. Do not invent issue numbers beyond #13.**

## Supabase

No Supabase / RLS / RPC changes this session (all work was mobile-client UI). Save-features backend (`collections`, `toggle_paper_saved`) from Phase 4 is unchanged; snapshot at `docs/sql/collections_rls_rpcs.sql`.

## Current Git State

Branch `feat/ux-remodel` — working tree **clean**. All phases committed. **Merge-pending** (not yet merged to `dev`). Note `dev` is **ahead** by the CONVENTIONS §10 commit (`c8eef38`), which will merge into this branch (and later faculty-access) via `git merge dev`.

## Commit History (most recent first)

```
ad72c29 (HEAD -> feat/ux-remodel) feat(ux-remodel): refine Browse to one-column + complete headerless tabs
d869f20 feat(ux-remodel): restyle Submit Research into carded sections
ed0e378 feat(ux-remodel): rebuild Invitations to avatar cards with inline actions
4796ead feat(ux-remodel): rebuild Notifications to grouped list with type icons
ba7b9f4 refactor(ux-remodel): extract shared category-name resolver
ee46148 feat(ux-remodel): rebuild My Papers to status-led list with FAB
2a87042 feat(ux-remodel): add Profile screen and navigation wiring
feda4bf docs(ux-remodel): swap governing skills to mobile stack in plan §2
(dev only) c8eef38 docs(conventions): add §10 project-wide standards
```

## Immediate Next Steps

1. **Dev-client QA** the remaining screens end-to-end: Profile (avatar entry, stats, sign-out), My Papers (FAB, status bars), Notifications (groups, type icons, mark-all), Invitations (accept/decline + acting spinner, expired), Submit (full flow + resubmit), Browse (one-column, view toggle, topic chips, sort). Check all headerless titles clear the notch.
2. **Revisions pass** on the built screens (Christian has queued specific tweaks — collect and apply as Phase 13).
3. **Merge `dev` → `feat/ux-remodel`** first to pull CONVENTIONS §10, then when ready **`feat/ux-remodel` → `dev`** with a structured merge commit (CONVENTIONS §1, phases 1–12).
4. After merge to `dev`: `feat/faculty-access` inherits the shared utils + design system + §10 standards on its next `git merge dev`.
