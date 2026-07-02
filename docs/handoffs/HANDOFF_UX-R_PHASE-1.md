---
undertaking: "UX Remodel"
phase: "1 complete; 2 blocked on decision"
date: 2026-06-18
branch: feat/ux-remodel
last_commit: "feat(theme): add warm surface and motion-system tokens"
status: blocked
---

# NUcleus Mobile — Session Handoff Context (UX Remodel, Phase 1)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`) on a stable post-Submit-Research baseline, now running Expo SDK 56 with EAS dev-build infrastructure. The **UX Remodel** undertaking is in progress on branch `feat/ux-remodel` (cut from `dev`): Phase 1 (design foundation) is complete and committed; **Phase 2 is blocked on a design-architecture decision** (see Immediate Next Steps).

**Canonical docs in the repo:**
- `docs/PROJECT_CONTEXT.md` — product identity, audience, navigation, domain types
- `docs/CONVENTIONS.md` — all process conventions
- `docs/plans/UX_REMODEL.md` — active undertaking plan (approved brief + signature)

**GitHub repo:** `christianmeude/capstone-nucleus-rn`

---

## Previous Undertaking Status

✅ **Submit Research** — complete and stable. See `docs/plans/SUBMIT_RESEARCH.md`.

This session also: merged `dev → main` (no-ff) as a production-ready baseline, and stood up EAS dev builds (`expo-dev-client`, `eas.json`, project linked: `projectId cfc58fb4-…`, `owner christianmeude`, app name "NUcleus Mobile", android package `com.christianmeude.nucleus`).

> ⚠️ **Pushes are held by Christian.** `dev`, the `dev → main` merge, and `feat/ux-remodel` are all **local only** — nothing has been pushed to origin. Do not push without explicit instruction.

---

## UX Remodel Status

Branch `feat/ux-remodel`, branched off `dev`.

- ✅ Phase 1a — Design brief & signature (approved)
- ✅ Phase 1 — Design foundation (tokens + native deps) — committed
- 🔴 Phase 2 — Motion & interaction primitives ← **blocked on decision**
- ⏳ Phase 3 — Hero screen: Browse
- ⏳ Phase 4 — Hero screen: ResearchDetail
- ⏳ Phase 5 — Hero screen: Dashboard + pitch packaging

**Approved design direction (Phase 1a):** 25% NUcleus / 75% Anthropic "warm paper." Two typefaces only — **Lora (titles) + Outfit (UI)**; monospace and a background orbital/atom watermark were tried and **rejected**. Palette preserved exactly (navy `#1B3A8C`, gold `#F5A623`, slate). Signature = "the catalog card" (eyebrow → Lora title → hairline rule → metadata). Concept approved via inline mockups (Browse + ResearchDetail). See [[feedback-design-aesthetic]] memory.

---

## What Changed Since HANDOFF_POST-SUBMIT-RESEARCH

### dev → main merge + EAS dev build (✅ done, local)
- `dev` merged to `main` (no-ff). EAS configured; **two** Android dev builds produced.

### Design foundation acquired (✅ done)
- Three Anthropic skills installed at `~/.claude/skills/`: `frontend-design`, `brand-guidelines`, `theme-factory` (sparse-cloned from `anthropics/skills`). Precedence: frontend-design (master) > brand-guidelines (palette/type method, **NUcleus palette overrides its Anthropic defaults**) > theme-factory (reference).

### Phase 1 — Design foundation (✅ committed, 3 commits)
- `feat(theme)`: additive tokens — `palette.warm` + `surface.paper*` + `border.warm*`; expanded `motion` (durations, reanimated spring presets, `pressScale`, `entrance`); `radii.xl=18`; `spacing.3xl=40`. Existing cool-slate screens unaffected.
- `chore(deps)`: `react-native-reanimated 4.3.1` (+ `react-native-worklets 0.8.3` transitively), `@gorhom/bottom-sheet ^5.2.14`, `expo-haptics ~56.0.3`; new `babel.config.js` (`babel-preset-expo`, auto-includes worklets plugin).
- `docs(plans)`: added `docs/plans/UX_REMODEL.md`; repointed `CLAUDE.md` protocol step 3 + Key Files to it.

### Second EAS dev build (✅ finished — installable)
- Build with the new native modules: [136826d2](https://expo.dev/accounts/christianmeude/projects/nucleus-student-mobile/builds/136826d2-e893-4f1c-8521-daddd484acde). Install on Android, then `npx expo start --dev-client`. (Check status anytime via `eas build:list`.)

---

## Critical Architectural Context (session-specific)

### Design-authority inversion (this undertaking only)
For **visual design only** (never data/feature contracts), mobile is the source-of-truth that web syncs toward — opposite of Submit Research's "web parity is non-negotiable."

### Frozen-screen ↔ shared-primitive constraint (the Phase 2 blocker)
`BottomSheet`, `Button`, and `Card` are shared primitives consumed by the **frozen** `SubmitResearchScreen.tsx`. `BottomSheet` specifically drives 4 critical spots there — category/department/faculty pickers + the submission-checklist confirmation ([SubmitResearchScreen.tsx:862–1005](../../src/screens/main/SubmitResearchScreen.tsx#L862)). Rebuilding these in place changes a locked, validated flow at runtime even without editing its file. **Phase 2 must not regress Submit Research.**

### gorhom / reanimated wiring (not yet done)
- `@gorhom/bottom-sheet` needs a `GestureHandlerRootView` at the app root **and** a `BottomSheetModalProvider` — both belong in `App.tsx` (**not frozen**; currently only wraps `SafeAreaProvider`). Neither is added yet.
- gorhom requires its **own** `BottomSheetScrollView` for inner scrolling; a plain `ScrollView` inside it can fight the drag gesture (relevant if rebuilding the existing pickers).
- `react-native-reanimated 4` requires the New Architecture — already enabled (`app.json: newArchEnabled: true`).

---

## Open Issues

Unchanged this session:
- 🔴 #5 — Browse: category filter shows unresolved UUIDs (display logic; opportunistic fix possible in Phase 3)
- 🔴 #6 — Browse: add toggleable list and tile view
- 🔴 #8 — ResearchDetail: Download button always visible — no `allow_download` column

**Current cap: #8. Do not invent issue numbers beyond #8.**

## Supabase

No RLS, RPC, or schema changes this undertaking. State as recorded in `HANDOFF_POST-SUBMIT-RESEARCH.md` / `docs/sql/`.

---

## Current Git State

Branch: `feat/ux-remodel` — one uncommitted doc change pending (to be committed with this handoff).

**Modified (uncommitted):**
- `M docs/plans/UX_REMODEL.md` — Phase 1 marker bumped to COMPLETED
- (this handoff file, untracked, once written)

**Branch workflow:** `feat/ux-remodel → dev → main` (all local; pushes held by Christian).

## Commit History (most recent first)

```
7223fb8 (HEAD -> feat/ux-remodel) feat(theme): add warm surface and motion-system tokens
5e0a1b5 chore(deps): add reanimated, gorhom bottom-sheet, haptics
18c6426 docs(plans): add UX Remodel plan and repoint session protocol
e141909 (main) chore(eas): set app name, android package, and appVersionSource
a659280 Merge branch 'chore/eas-dev-build' into dev
```

---

## Immediate Next Steps

1. **DECIDE the Phase 2 approach (the blocker).** Two questions:
   - **Gesture sheet:** (a) *Recommended* — build a new gorhom `Sheet` for hero screens, leave the existing `BottomSheet` untouched (zero risk to frozen Submit Research); (b) rebuild `BottomSheet` in place preserving `{visible,onClose,children}` (upgrades everywhere, requires re-testing Submit Research); (c) defer gesture sheet.
   - **Button/Card press feedback:** (a) *Recommended* — upgrade in place with reanimated spring + optional haptic (API-preserved, visual-only, low risk); (b) new animated variants for hero screens only; (c) leave as-is.
2. **Install the new dev build** ([136826d2](https://expo.dev/accounts/christianmeude/projects/nucleus-student-mobile/builds/136826d2-e893-4f1c-8521-daddd484acde)) on the Android device; `npx expo start --dev-client` to verify the foundation runs.
3. **Implement Phase 2 per the decision:** add `GestureHandlerRootView` + (if gorhom modal) `BottomSheetModalProvider` to `App.tsx`; build the sheet + press feedback; add a `Toast` primitive; register in `src/components/ui/index.ts`; `npx tsc --noEmit` green; present diff + commit for review.
4. **Christian-owned:** all pushes (none done yet); decide when to push `main`, `dev`, and `feat/ux-remodel` to origin.
