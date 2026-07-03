---
undertaking: "Pre-Dev Integration"
phase: "kickoff (Phase 0 — base merges)"
date: 2026-07-02
branch: predev/uxr-fac
last_commit: "Merge branch 'feat/ux-remodel' into predev/uxr-fac"
status: in-progress
---

# NUcleus Mobile — Session Handoff (Pre-Dev Integration — Kickoff)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`). New undertaking **Pre-Dev
Integration** (short `P-D`) fuses **UX Remodel** and **Faculty Access** into one
uniform tree on `predev/uxr-fac` (worktree
`C:\Users\Christian\Projects\capstone-nucleus-rn-predev`), reconciles them into a
single visual + feature standard, then merges to `dev` and retires both feature
branches. Full design and rationale in the approved plan and
[`docs/plans/PREDEV_UXR-FAC.md`](../plans/PREDEV_UXR-FAC.md); workflow in
[`docs/predev/README.md`](../predev/README.md).

## What Changed This Session (Session A)

- **On `feat/ux-remodel`:** committed the loose `HANDOFF_UX-R_PHASE-12.md` (`1714be8`).
- **On `dev`:** authored the pre-dev workflow (`docs/predev/README.md`), archived
  the confluence workflow with a deprecation banner, added the `predev/*` branch
  note to CONVENTIONS §1 (`ad8713c`); added the P-D registry row, flipped UX-R +
  FAC to the new `integrating` status, added the status-vocabulary/routing note
  (`24b733d`).
- **Created** worktree `capstone-nucleus-rn-predev` on new branch `predev/uxr-fac`
  from `dev @ 24b733d`.
- **Merged `feat/ux-remodel`** into predev (`9471502`, `--no-ff`, conflict-free).
  `npm install` clean (no lockfile drift); `npx tsc --noEmit` **green**.
- Authored this handoff + the P-D plan doc (branch-scoped on predev).

## Immediate Next Steps (Session B — start here)

> **Restart Claude in the predev worktree first.** Session B must start with
> predev's `.claude/settings.json` snapshot (nav files + SubmitResearchScreen
> unfrozen, inherited from UX-R) so nav conflicts can be resolved with the Edit
> tool. This is the whole reason Session A stopped here.

1. **Merge `feat/faculty-access`** (`git merge --no-ff feat/faculty-access`) and
   resolve the 6 conflicts:
   - `.claude/settings.json` → `git checkout --ours` (UX-R = the unfreeze union;
     **flag for Christian's audit** — git-level write bypasses the Edit block).
   - `src/screens/main/ResearchDetailScreen.tsx` → `git checkout --ours`
     (UX-R rebuild wholesale; PdfViewer re-applied as Phase 1).
   - `package-lock.json` → `git checkout --ours`, regenerate via `npm install`.
   - `package.json` → manual union: UX-R base + FAC-only deps
     (`react-native-webview@13.16.1`, `react-native-pdf`, `react-native-blob-util`,
     both `@config-plugins/*`); **keep dead deps until Phase 2**; no lora/outfit.
   - `src/navigation/types.ts` → union: FAC param lists + faculty routes + UX-R
     `Profile: undefined`.
   - `src/navigation/AppNavigator.tsx` → union: FAC three-way role gate skeleton;
     student branch = UX-R (5 headerless tabs + Profile stack screen); faculty
     branch = FAC verbatim (native headers until re-skin); union imports.
   - Then `npm install` + `npx tsc --noEmit` (expect green — NotificationCard
     props identical, all faculty-imported ui primitives still exported). Present
     the merge with a structured FAC body (phases 0–14 + v4 tabs).
2. **Smoke QA** on the existing 2026-06-28 confluence APK:
   `npx expo start --dev-client -c` (`-c` mandatory — stale Metro cache can 404
   removed Outfit/Lora). Boot both roles; confirm faculty renders in the new
   fonts automatically (token-flow proof).
3. Update the plan doc: mark **Phase 0 ✅ COMPLETED**, then proceed to **Phase 1**
   (student "Read paper" → in-app PdfViewer).

## Critical Context / Gotchas

- **settings.json harness:** deny rules snapshot at session start; the Edit tool
  is blocked on this file. Resolve its conflict via `git checkout --ours`
  (Christian audits). Nav stays unfrozen through the re-skin phases; **Phase 10
  re-freezes** it before the final merge (or dev silently inherits the unfreeze).
- **QA vehicle:** the existing dev-client's native layer is a superset of the
  integrated tree (webview + reanimated + gorhom + pdf/blob-util all baked in on
  2026-06-28). No mid-stream rebuild — only Phase 11's fresh build nets the
  dead-dep removals.
- **Faculty v4** (Repository/Notifications/Profile tabs, delivers #12) has no
  handoff after PHASE-14 and a pending runtime check — Phases 3–8 exercise every
  v4 screen; Phase 11 is the formal check.
- **FAC PHASE-14's "do not merge until instructed"** is superseded — this
  undertaking is that instruction.
- **Issue cap is #15** (dev's CONVENTIONS); ignore stale branch-local caps.

## Current Git State

Branch `predev/uxr-fac` @ `9471502` (working tree carries this handoff + plan doc,
to be committed at Session A close). `dev @ 24b733d`. `feat/ux-remodel @ 1714be8`,
`feat/faculty-access @ 096a4e3` (both `integrating`). Everything local-only (no
push — dev is 27 ahead of origin by design).
