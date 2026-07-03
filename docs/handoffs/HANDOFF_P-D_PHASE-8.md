---
undertaking: "Pre-Dev Integration"
phase: "8 (faculty re-skin complete; Phases 9–12 are the closeout)"
date: 2026-07-02
branch: predev/uxr-fac
last_commit: "feat(faculty): re-skin Notifications + rebuild Profile; close gold-once sweep"
status: in-progress
---

# NUcleus Mobile — Session Handoff (Pre-Dev Integration — Phase 8)

## Project Overview

React Native Expo app. **Pre-Dev Integration** (`P-D`) fuses UX Remodel + Faculty
Access into one uniform tree on `predev/uxr-fac` (worktree
`C:\Users\Christian\Projects\capstone-nucleus-rn-predev`). This session ran
autonomously (Christian's authorization) through **Phases 0–8**; **Phases 9–12 are
the interactive closeout** gated on his testing. Plan:
[`docs/plans/PREDEV_UXR-FAC.md`](../plans/PREDEV_UXR-FAC.md).

## What Changed Since Last Handoff (Kickoff → Phase 8)

Twelve commits on `predev/uxr-fac` (`aa13b33` → `f8d7527`), tsc green at every step:

- **Phase 0 — Base merges.** Merged `feat/faculty-access` (`aa13b33`); 6 conflicts
  resolved per plan (settings/ResearchDetail/lock `--ours`; package.json + nav
  unioned; lora/outfit dropped). Smoke-QA: both roles boot in one build.
- **Phase 1 — Student in-app PDF** (`d08eb63`). ResearchDetail resolves the file on
  mount and renders the shared `<PdfViewer>` inline in a "Paper" section;
  `trackView` moved to the viewer's `onFirstLoad`; `WebBrowser.openBrowserAsync`
  path + "Read paper" button removed; bookmark kept (right-aligned).
- **Phase 2 — Dead-dep cleanup** (`591a745`). Removed `react-native-pdf`,
  `react-native-blob-util`, both `@config-plugins/*` from package.json + app.json;
  lockfile −101 lines. `expo-web-browser` **retained** (PdfViewer error fallback).
- **Phase 3 — Faculty shell + Dashboard** (`d3055bd`). `FacultyTabs`:
  `headerShown: false` ×5. FacultyDashboard: safe-area top inset + bottom padding.
- **Phase 4 — Review queue** (`a1932e5`). Sticky header safe-area inset + serif
  "Review" title. Sticky search/filters kept (queue UX).
- **Phase 5 — ReviewDetail** (`ffd39b8`). Shared `ResearchDetailHeader` custom
  header + serif title.
- **Phase 6 — Repository** (`2e593ee`). Adopted `src/utils/category.ts`
  (`buildCategoryNameById`/`resolveCategoryName`) — brings the Issue-#5 UUID guard;
  tab inset + serif title.
- **Phase 7 — PaperDetail** (`adb4a80`). Shared custom header + serif title; inline
  PdfViewer already present.
- **Phase 8 — Notifications + Profile** (`f8d7527`). Notifications: tab inset +
  serif title. **Profile rebuilt** to mirror the student ProfileScreen (band +
  avatar + serif name + role pill + Account card + single gold "Member since" dot +
  styled sign-out); faculty-adapted (no student-only stats/preference rows).
  **Faculty-wide gold-once sweep closed** (every faculty screen ≤1 gold accent).

No Supabase/SQL changes this session (none were needed).

## Critical Architectural Context (session-specific)

- **Serif is applied via `theme.fontFamilies.display.*` directly**, not the
  `typography.display` token (which is unused). Student in-body screen titles
  (Browse/Notifications/ResearchDetail) use `fontFamilies.display.semibold` 26/32 —
  the faculty re-skin now matches. (Corrects the Phase-0 "serif wired into zero
  screens" note, which only checked the token.)
- **Faculty tab screens are headerless** (Phase 3). Every faculty tab screen now
  supplies its own `useSafeAreaInsets` top padding; the two faculty **stack** screens
  (ReviewDetail, PaperDetail) use the shared `ResearchDetailHeader` for their top
  inset. If a *new* faculty tab screen is added, it must add its own inset.
- **Guardrails still open:** nav files + `SubmitResearchScreen` remain **unfrozen**
  in `.claude/settings.json` on this branch. Phase 10 re-freezes them
  (`git checkout dev -- .claude/settings.json`) — **must run before the dev merge**
  or dev inherits the unfreeze.

## Open Issues

- **#12** faculty additional tabs (Repository/Notifications/Profile) — **delivered**
  in code (integrated + re-skinned); close in Phase 10 after Christian's QA confirms.
- #5/#8/#9/#11/#13/#14/#15 untouched this session. #14/#15 (annotation write/verify)
  become a fresh undertaking off the new `dev` post-merge (per plan §1).

## Current RLS Policy State / Supabase RPCs

Unchanged this session. Faculty RPC snapshot lives at
`docs/sql/faculty_access_rpcs.sql` (merged in from FAC). No new objects.

## Current State of the Codebase

- **Design system:** cool-slate + navy/gold, Source Serif 4 (display) + IBM Plex
  Sans (UI), realized in `src/theme/`. Faculty now fully conforms.
- **Shared components exercised by faculty:** `PdfViewer`, `ResearchDetailHeader`,
  `NotificationCard`, `ListEntranceItem`, ui primitives (`PressableCard`, `Stat`,
  `Chip`, `Card`, `Divider`, `BottomSheet`, `Skeleton`, `EmptyState`,
  `InlineNotice`, `Button`), `src/utils/category.ts`, `src/utils/format.ts`.
- **Faculty API:** `src/api/faculty.ts` (read paths + review write RPCs).
- **tsc:** `npx tsc --noEmit` green.

## Current Git State

Branch `predev/uxr-fac` @ `f8d7527`. Working tree: `docs/plans/PREDEV_UXR-FAC.md`
staged with this session's status updates (commit alongside this handoff). All local
(no push). `dev @ 24b733d`.

## Commit History (most recent first)

`f8d7527` P8 Notifications+Profile · `adb4a80` P7 PaperDetail · `2e593ee` P6
Repository · `ffd39b8` P5 ReviewDetail · `a1932e5` P4 Review · `d3055bd` P3
shell+Dashboard · `591a745` P2 dep cleanup · `d08eb63` P1 student PDF · `17d38c4` P0
close · `aa13b33` FAC merge · `cd50545` plan+kickoff.

## Immediate Next Steps

1. **Christian: Phase 11 QA** on the existing dev-client (still a valid superset —
   no rebuild needed to test behavior/layout). Boot **both roles**; walk the
   checklist in the session's testing guide. Collect any tweaks.
2. **Phase 9 — revisions:** provide the held UX-R revision list and/or the QA
   findings; a session applies them (currently 🔴 BLOCKED for lack of documented
   inputs — do not fabricate).
3. **Phase 10 — closeout:** CLAUDE.md Key Files additions (PdfViewer,
   `src/api/faculty.ts`, FacultyTabs); close #12; **re-freeze** settings.json. Run
   *after* Phase 9 (revisions may touch nav).
4. **Phase 11 — fresh build:** `eas build -p android --profile development`; re-run
   both roles + both PDF flows on the fresh client (nets the dead-dep removals).
5. **Phase 12 — merge on go:** `predev/uxr-fac → dev` (two-undertaking body); tag;
   delete both feature branches + worktrees; flip registry to `complete`; add
   `docs/predev/PREDEV_UXR-FAC_<date>.md` on dev; hybrid-search syncs `dev`.
