# NUcleus Mobile — Implementation Plan: Mobile UX Remodel

> **STATUS: IN PROGRESS** — Branch `feat/ux-remodel`, cut from `dev`.
> Showcase-first remodel of the mobile experience in a 25% NUcleus / 75% Anthropic "warm paper" design language. Builds the design-system + motion foundation, then polishes 3 hero screens to pitch quality.

**Canonical product context:** [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)
**Process conventions:** [CONVENTIONS.md](../CONVENTIONS.md)
**Predecessor undertaking:** [SUBMIT_RESEARCH.md](./SUBMIT_RESEARCH.md) (complete)

---

## 1. Context & strategy

Five forward goals exist: hybrid semantic search, web/mobile design uniformity, mobile UX remodel, AI paper-chat, and a pitch to the web colleague for a web UI overhaul. Search and AI chat are backend-gated and require coordination with the shared Supabase DB / web codebase (mobile is anon-key + RLS only and cannot hold an LLM key). Uniformity needs a design language to exist first.

The **mobile UX remodel is the first move**: 100% mobile-owned, no backend or colleague dependency, it is itself the visual proof artifact the web-overhaul pitch needs, and it produces the design language uniformity later syncs toward.

**Design-authority inversion (this undertaking only):** Submit Research treated web as the parity authority. For *visual design only* (never data/feature contracts), mobile becomes the source-of-truth that web syncs toward.

---

## 2. Design foundation

**Governing skills** (installed at `~/.claude/skills/`, precedence order):
1. **frontend-design** (master) — distinctive, non-templated, subject-grounded; one signature element; plan→critique→build.
2. **brand-guidelines** (palette/type method) — Anthropic default colors **overridden with NUcleus tokens**; palette preserved exactly.
3. **theme-factory** (reference only).

**Approved brief (Phase 1a):**
- **Direction:** 25% NUcleus / 75% Anthropic. Keep navy/gold/Lora identity; shift surfaces from cool slate-on-white to warm paper, editorial spacing, calm restraint.
- **Typefaces — two only:** Lora (titles/display) + Outfit (all UI). **No monospace, no third face.** (See [[feedback-design-aesthetic]].)
- **No decorative brand motifs in the background** (orbital/atom watermark rejected). The small N logo mark in headers is fine.
- **Color (palette preserved):** Paper `#F7F3EA` · Card `#FFFDF8` · Sunken `#FCFAF4` · Warm rule `#E9E2D3` · Navy `#1B3A8C` (primary/nav/links) · Gold `#F5A623` (single emphasis per screen) · Ink `#0F172A`.
- **Signature:** "the catalog card" — eyebrow tag → Lora title → hairline rule → metadata, structure carrying information (like a citation). Calm, student-friendly.
- Concept approved via inline mockups (Browse + ResearchDetail).

---

## 3. Phased plan

### Phase 1a — Design brief & signature
✅ **COMPLETED (stable)** — Brief and signature confirmed with Christian via mockups; monospace and background watermark rejected and removed; two-typeface direction locked. Recorded in §2.

### Phase 1 — Design foundation (tokens + native deps)
✅ **COMPLETED (stable)**

- Extend `src/theme` (additive — existing cool-slate screens unaffected):
  - `colors.ts` — `palette.warm` group + `surface.paper*` + `border.warm*`.
  - `motion.ts` — real motion system (durations, spring presets, press scale, entrance) atop existing skeleton/list tokens.
  - `radii.ts` (`xl: 18`), `spacing.ts` (`3xl: 40`) for the generous warm rhythm.
- Native deps: `react-native-reanimated`, `@gorhom/bottom-sheet`, `expo-haptics` (`react-native-gesture-handler` already present). Add `babel.config.js` (`babel-preset-expo` auto-includes the reanimated plugin).
- **Exit:** `npx tsc --noEmit` green. ⚠️ A fresh EAS dev build is required after this phase (native modules added).

### Phase 2 — Motion & interaction primitives
⏳ **NOT STARTED**
- Rebuild `BottomSheet.tsx` on `@gorhom/bottom-sheet`; reanimated press feedback on `Button`/`Card`; port `ListEntranceItem`; add `Toast`; register in `ui/index.ts`.
- Page transitions touch `AppNavigator.tsx` (frozen) — out of scope unless explicitly approved.

### Phase 3 — Hero screen: Browse
⏳ **NOT STARTED** — `BrowseScreen.tsx`; warm catalog aesthetic, semantic-search-styled bar (placeholder), animated chips/cards. Reuse `researchApi`.

### Phase 4 — Hero screen: ResearchDetail
⏳ **NOT STARTED** — `ResearchDetailScreen.tsx`; title-page reading view, gold "Ask this paper" placeholder (previews AI chat). Reuse `researchApi`.

### Phase 5 — Hero screen: Dashboard + pitch packaging
⏳ **NOT STARTED** — `DashboardScreen.tsx`; warm aesthetic, animated stat grid. Capture hero-screen recordings/screenshots for the colleague pitch. Draft handoff.

---

## 4. Constraints

- `npx tsc --noEmit` green at every phase exit.
- Palette preserved exactly — never apply Anthropic orange/blue/green.
- Two typefaces only (Lora + Outfit).
- Token changes additive; non-remodeled screens keep working.
- Commits staged specifically and presented for review (CONVENTIONS §2); no Co-Authored-By trailer.

## 5. Frozen files (do not touch)

`AppNavigator.tsx`, `navigation/types.ts`, `SubmitResearchScreen.tsx`, `AuthContext.tsx`, `supabase.ts`, `domain.ts`, `src/auth/`, `src/storage/authStorage.ts`, deployed SQL snapshots.

## 6. Success criteria

- 3 hero screens polished to pitch quality in the warm two-typeface system.
- Foundation (warm tokens, motion system, gesture bottom sheet, spring feedback) reusable for the later full remodel.
- Pitch artifact (recordings/screenshots) captured.
- `npx tsc --noEmit` green throughout.
