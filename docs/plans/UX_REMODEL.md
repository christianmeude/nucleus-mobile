# NUcleus Mobile — Implementation Plan: Mobile UX Remodel

> **STATUS: IN PROGRESS** — Branch `feat/ux-remodel`, cut from `dev`.
> Showcase-first remodel of the mobile experience in a **clean, minimalist, professional, readability-first** design language. Builds the design-system + motion foundation, then polishes 3 hero screens to pitch quality and adds save (bookmarks + collections) features.

**Canonical product context:** [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)
**Process conventions:** [CONVENTIONS.md](../CONVENTIONS.md)
**Product/design reference:** [PRODUCT_ROADMAP.md](../PRODUCT_ROADMAP.md)
**Predecessor undertaking:** [SUBMIT_RESEARCH.md](./SUBMIT_RESEARCH.md) (complete)

---

## 1. Context & strategy

Five forward goals exist: hybrid semantic search, web/mobile design uniformity, mobile UX remodel, AI paper-chat, and a pitch to the web colleague for a web UI overhaul. The **mobile UX remodel is the first move**: mobile-owned, no colleague dependency, and itself the visual proof artifact the web-overhaul pitch needs.

**Design-authority inversion (this undertaking only):** for *visual design only* (never data/feature contracts), mobile is the source-of-truth that web syncs toward.

### Direction reset (2026-06-27)

The earlier "25% NUcleus / 75% Anthropic warm-paper" brief and its locks are **retired**. We keep only the core palette (navy + gold + supporting slate neutrals) and adopt one north star: **clean, minimalist, stylish, professional, student-friendly, readability-first**. Direction selected by reviewing the imported Claude Design project (`NUcleus Mobile`, 4 directions × 3 screens):

- **Browse** → *Hybrid* ("The Reader's Index"): titled tile grid + filter/sort + featured hero.
- **ResearchDetail** → *Hybrid* neatness **+** Reading Room's read-paper button, bookmark, collections **+** Stacks' related papers.
- **Dashboard** → **Launch-pad home** (the 4-box stat tally is removed).
- **Dropped:** continue-reading entirely.

---

## 2. Design foundation

**Governing skills** (installed at `~/.claude/skills/`, precedence order):
1. **frontend-design** (master) — one signature element per screen, spend boldness there, keep the rest quiet; serif used with restraint; structure encodes meaning, not decoration; minimal = precision in spacing/type.
2. **brand-guidelines** — *method only*; its Anthropic colors/fonts do not apply (NUcleus navy/gold win).
3. **theme-factory** (reference only).

**Approved brief (reset):**
- **Surface — cool slate:** page `slate-50 #F8FAFC` · card `#FFFFFF` · sunken `slate-100 #F1F5F9` · dividers `slate-200/300` · ink `slate-900 #0F172A`. (Aligns with [PRODUCT_ROADMAP.md](../PRODUCT_ROADMAP.md) §2; deliberately **not** the warm-cream AI-default.)
- **Brand:** Navy `#1B3A8C` (primary/nav/links) · Gold `#F5A623` (single emphasis per screen — never decoration).
- **Typefaces — two only:** **Source Serif 4** (titles/display, with restraint) + **IBM Plex Sans** (all UI/body/metadata). Lora + Outfit retired.
- **No decorative brand motifs** behind content (orbital/atom watermark stays rejected).
- **Signature per screen:** Browse = navy featured-paper hero; ResearchDetail = serif "title page" reading view; Dashboard = calm greeting + single status line.

---

## 3. Phased plan

### Phase 1a — Design brief & signature
✅ **COMPLETED (stable)** — Reset brief confirmed with Christian (cool surfaces, Source Serif 4 + IBM Plex Sans, Hybrid Browse, merged ResearchDetail, launch-pad Dashboard, no continue-reading). Recorded in §1–§2.

### Phase 1 — Foundation: cool surfaces + font swap
✅ **COMPLETED (stable)** — mobile-only; unblocks all screens.
- ✅ `colors.ts` — removed `palette.warm`, `surface.paper*`, `border.warm*`; committed to cool slate (no screen consumers).
- ✅ Fonts — installed `@expo-google-fonts/source-serif-4` + `@expo-google-fonts/ibm-plex-sans`, removed `lora`/`outfit`; updated `App.tsx` loaders and `families` in `typography.ts` (`ui` → IBM Plex Sans, `display` → Source Serif 4). Type scale unchanged; serif applied to titles at the screen level in later phases.
- Motion system, `radii.xl`, `spacing.3xl`, reanimated/gorhom/haptics from the prior foundation retained.
- `OrbitalAccent` is still consumed by `Logo.tsx` — flagged, deferred (brand-mark decision), not touched here.

**Implementation summary**
- Design foundation is now cool slate surfaces + Source Serif 4 (display) / IBM Plex Sans (ui). No warm tokens remain; the type scale and weights are unchanged (only the underlying families swapped).

**Exit criteria met:** `npx tsc --noEmit` green. On-device dev-client visual check recommended before merge.

### Phase 2 — Hero screen: Browse (Hybrid)
✅ **COMPLETED (stable)** — Faithful port of the fetched `browse/hybrid.html` design (Claude Design project `NUcleus Mobile`) onto cool-slate tokens.

**Implementation summary**
- ✅ New `src/components/ResearchTile.tsx` — compact 2-col tile: color-dot category eyebrow, Source Serif 4 title, author, views · date footer, subtle press scale. `ResearchCard` left untouched for single-column lists.
- ✅ `src/screens/main/BrowseScreen.tsx` rebuilt to the Hybrid layout: search → **filter bar** (`Filters` button + active-count badge → category `BottomSheet`; `Sort` control → Newest / Most viewed `BottomSheet`) → navy **featured hero** (gold "Featured Paper" badge, serif title, faint concentric rings) → `N Papers` row head → **2-column tile grid**.
- ✅ Featured = most-viewed published paper, shown only on the unfiltered default view and excluded from the grid; hidden once a search/category filter is active.
- ✅ Issue #5 UUID guard carried via `categoryNameForDisplay` (bare, UUID-guarded name); category dot colors drawn from a navy/blue set so **gold stays once-per-screen** (hero badge). Loading = hero + 2-col tile skeletons; empty/error/refresh states preserved.
- Reused `researchApi.getPublishedPapers` / `getCategories`, `ui/BottomSheet`, `ui/Chip` (search Clear), `Skeleton`, `EmptyState`, `InlineNotice`.

**Exit criteria met:** `npx tsc --noEmit` green (worktree tsc). Satisfies Issue #6 via the tile grid (design commits to tiles only — no list/tile toggle). On-device dev-client visual check recommended before merge.

### Phase 3 — Hero screen: ResearchDetail (+ related papers)
⏳ **NOT STARTED** — `ResearchDetailScreen.tsx`: serif title-page → meta → keywords → **"Read paper"** → abstract → **Related papers** (client-side: same category + shared keywords) → workflow (owner-only). Bookmark/collection buttons deferred to Phase 5. Opens a GitHub issue logging that semantic related-papers is deferred to the Hybrid Search merge.

### Phase 4 — Save features backend (Supabase)
⏳ **NOT STARTED** — Pre-flight brief required (CLAUDE.md rule 3). Unified model: `collections` + `collection_papers` (bookmark = membership in default "Saved" collection). Email-resolved RLS + SECURITY DEFINER RPCs. New facade `src/api/collections.ts`. Snapshots to `docs/sql/`.

### Phase 5 — Save UI + Dashboard (Launch-pad)
⏳ **NOT STARTED** — ResearchDetail bookmark toggle + "Save to collection" bottom sheet (no new routes — nav frozen). `DashboardScreen.tsx` rebuilt to launch-pad: greeting + quick actions + single status line + recent submissions + notifications/invitations peek + Saved section. **Sign-out retained** in header.

### Phase 6 — Polish + pitch packaging
⏳ **NOT STARTED** — Cross-screen QA, a11y/contrast, hero screenshots/recordings for the pitch, optional cool-mockup sync to the Claude Design project, handoff.

---

## 4. Constraints

- `npx tsc --noEmit` green at every phase exit.
- Palette discipline: navy + gold + slate only; gold once per screen; never Anthropic orange/blue/green.
- Two typefaces only: **Source Serif 4 + IBM Plex Sans**.
- Token changes keep non-remodeled screens working.
- **Navigation frozen → no new routes**; collections surface via bottom sheets / in-screen sections only.
- New types live in API facades, not `domain.ts` (frozen).
- Commits staged specifically and presented for review (CONVENTIONS §2); no Co-Authored-By trailer.

## 5. Frozen files (do not touch)

`AppNavigator.tsx`, `navigation/types.ts` (no new routes), `SubmitResearchScreen.tsx`, `AuthContext.tsx`, `supabase.ts`, `domain.ts`, `src/auth/`, `src/storage/authStorage.ts`, deployed SQL snapshots.

## 6. Success criteria

- 3 hero screens polished to pitch quality in the cool, two-typeface system.
- Save features (bookmarks + collections) working under anon-key + RLS.
- Foundation (cool tokens, motion system, gesture bottom sheet) reusable for the later full remodel.
- Pitch artifact (recordings/screenshots) captured.
- `npx tsc --noEmit` green throughout.
