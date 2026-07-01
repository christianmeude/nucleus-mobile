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

**Governing skills** (installed at `~/.claude/skills/`, precedence for this RN/Expo app). The earlier web/artifact skills (`frontend-design`, `brand-guidelines`, `theme-factory`) were **removed 2026-06-30** — too web-aligned and a source of styling drift in the native app. Replaced with a mobile stack:

1. **building-native-ui** (Expo — primary) — RN/Expo styling + behavior standards. Apply: flex `gap` over margin/padding; account for top **and** bottom safe-area insets (`ScrollView`/`FlatList` `contentInsetAdjustmentBehavior="automatic"`, padding via `contentContainerStyle`); entering/exiting animations on state changes; `borderCurve: 'continuous'` on rounded corners (not capsules); the `boxShadow` style prop, never legacy `shadow*`/`elevation`; `selectable` on data/error `Text`; `fontVariant: ['tabular-nums']` on counts/metrics; iOS haptics. **Ignore its routing half** — it assumes expo-router file-routing + `NativeTabs` + `Link`; NUcleus uses classic React Navigation and navigation is frozen. Its `expo-router` `Color` / SF-Symbols / glass library prefs are optional, not mandates.
2. **mobile-app-ui-design** (design lens) — structure-first: primary actions in the **thumb zone** (bottom third — validates the My Papers FAB), reduce interaction cost, empty states as guided opportunities with a CTA, peak-end emotional polish. Visual: 60/30/10 color (slate base / ink / navy+gold accent), hierarchy via size + weight + opacity, soft tinted shadows, ≥44×44 tap targets, 8-pt spacing. **Two NUcleus overrides:** (a) it caps "two font families" — we are exactly at two (Source Serif 4 + IBM Plex Sans), so no third; (b) it suggests *monospace* for large numbers — we ship no monospace (design reset), so use `tabular-nums` on IBM Plex Sans instead.
3. **material-3** (reference only) — Android/Compose-first; a pattern catalogue for FABs, bottom sheets, segmented controls, tonal elevation, and shape/8dp tokens. **Not a styling authority:** its dynamic-color + Roboto type system does **not** apply — NUcleus navy/gold + Source Serif 4 / IBM Plex Sans win. Useful mainly to keep Android-flavored components feeling native.
4. **swiftui-skills** — parked for a future iOS build; dormant on Windows (`os: ["darwin"]`, needs `xcodebuild`).

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
✅ **COMPLETED (stable)** — visual title-page + related papers landed; in-app PDF viewer sequenced after the faculty-access mini-merge (see below).

**Implementation summary**
- ✅ `ResearchDetailScreen.tsx` rebuilt to the Hybrid "title page" reading view: navy category eyebrow (Issue #5 UUID guard) → serif title → *italic* serif authors (primary + co-authors) → department affiliation → meta row (date / views / downloads) with bottom rule → **"Read paper"** button → square keyword tags → serif abstract → **Related papers** → workflow history as index rows with a gold bar on the current step (shown only to the owner while the paper is still in review; hidden once approved/published, so the public Browse view never exposes reviewer comments).
- ✅ **Related papers** — client-side heuristic: `getPublishedPapers()` scored by same-category (×2) + shared-keyword count, top 3, excludes current paper; tap `push`es a new ResearchDetail. Opened **Issue #13** logging the deferral to semantic/hybrid search.
- ✅ Data honesty: dropped mock-only fields with no backing data (reference ID, "Peer-reviewed", "Cited by"); affiliation uses real `paper.department`.
- ✅ Bookmark/collection buttons deferred to Phase 5.

**PDF viewer sequencing (decided this session):** the "Read paper" button keeps the existing system-browser open for now (pure JS, testable on the current dev-client). Next, a **mini-merge `feat/ux-remodel` ↔ `feat/faculty-access`** syncs the shared `PdfViewer` + `react-native-webview` dep across both branches, followed by one EAS dev-client rebuild (QA both student/faculty roles). Then branch back to ux-remodel to wire "Read paper" → the in-app fullscreen `PdfViewer` and finish Phases 4–6. The `openFile` handler is isolated so this swap is a one-spot change.

**Exit criteria met:** `npx tsc --noEmit` green (worktree tsc). On-device dev-client visual check recommended before merge.

### Phase 4 — Save features backend (Supabase)
✅ **COMPLETED (stable)** — Unified model: `collections` + `collection_papers` (bookmark = membership in default "Saved" collection). Email-resolved RLS + SECURITY DEFINER RPCs. New facade `src/api/collections.ts`. Snapshot at `docs/sql/collections_rls_rpcs.sql`.

**Implementation summary**
- ✅ `collections` table (id, user_id, name, is_default, created_at) — unique index enforces one default "Saved" per user; RLS enabled
- ✅ `collection_papers` table (id, collection_id, paper_id, added_at) — ON DELETE CASCADE on both FKs; RLS enabled
- ✅ SELECT-only RLS policies on both tables (email-resolved project convention); direct writes blocked by default
- ✅ `toggle_paper_saved(p_paper_id uuid) RETURNS boolean` SECURITY DEFINER RPC — creates "Saved" collection on first call, toggles membership, returns current saved state; `GRANT … TO anon, authenticated`
- ✅ `src/api/collections.ts` — `togglePaperSaved`, `getSavedPaperIds`, `getMyCollections`

**Exit criteria met:** `npx tsc --noEmit` green.

### Phase 5 — Save UI + Dashboard (Launch-pad)
✅ **COMPLETED (stable)**

**Implementation summary**
- ✅ ResearchDetailScreen: gold bookmark icon button alongside "Read paper"; optimistic toggle via `togglePaperSaved` RPC; saved state loaded in parallel with paper data (`.catch(() => [])` so failure is silent)
- ✅ DashboardScreen rebuilt to launch-pad: greeting + single status line (urgent = semibold, not gold) + quick action cards (Submit / Browse) + notifications row with unread badge + recent papers (3) + Saved section (gold bookmark icons — screen's one gold element); sign-out retained in header
- ✅ `Promise.allSettled` in `loadData` — a failed sub-fetch never blocks the rest of the screen
- ✅ `collections.ts`: added `SavedPaper` type and `getSavedPapers` facade

**Exit criteria met:** `npx tsc --noEmit` green.

### Phase 6 — Polish + pitch packaging
✅ **COMPLETED (stable)**

**Implementation summary**
- ✅ Cross-screen QA: all three hero screens reviewed — palette discipline, a11y labels, edge/empty states, token consistency all clean
- ✅ A11y: `accessibilityRole` and `accessibilityLabel` confirmed on all interactive elements across Browse, ResearchDetail, Dashboard
- ✅ `npx tsc --noEmit` green across all phases
- ✅ Hero screenshots/recordings dropped by request
- ✅ DesignSync mockup sync skipped (requires interactive terminal)
- ✅ Issue #6 (Browse list/tile view) to be closed manually — satisfied by Phase 2 Hybrid tile grid
- ✅ Handoff written

**Exit criteria met:** `npx tsc --noEmit` green. Branch `feat/ux-remodel` is merge-ready.

---

## 3b. Extension — full-app coherence (2026-07-01)

Phases 1–6 delivered the three hero screens but were **not merged**. The undertaking is extended to bring the whole app to one coherent system: remodel the remaining screens (My Papers, Notifications, Invitations, Submit) and add a new **Profile** section, from fresh Claude Design mockups (project `NUcleus Mobile`). Chosen directions: **Profile C · My Papers B · Notifications A+B · Invitations B · Submit A (core, +b/c) · Browse B (refinement)**. Governed by the mobile skill stack (§2). Navigation is unfrozen on this branch to add the Profile route.

### Phase 7 — Profile (new) + navigation wiring
✅ **COMPLETED (stable)** — New account section, reached via an initials-avatar in the Dashboard header.

**Implementation summary**
- ✅ `src/screens/main/ProfileScreen.tsx` (new) — ported from `profile/direction-c`: soft-navy header band (navy initials avatar + serif name + role pill) → overlapping stats card (Papers / Saved via `getMyPapers` + `getSavedPaperIds`, `Promise.allSettled`) → Account card (Email / Department / Program / Member since — the gold dot on Member since is the screen's one gold accent) → App preferences placeholder card (non-functional rows) → subtle Sign out text link.
- ✅ `src/navigation/types.ts` — added `Profile: undefined` to `RootStackParamList` (scoped nav unfreeze).
- ✅ `src/navigation/AppNavigator.tsx` — registered the `Profile` stack screen (native header, title "Profile").
- ✅ `src/screens/main/DashboardScreen.tsx` — sign-out `IconButton` replaced with an initials-avatar button → `navigate('Profile')`; sign-out now lives in Profile.
- ✅ `src/utils/format.ts` — `formatMonthYear` helper for "Member since".
- Skills applied: flex `gap`, `borderCurve: 'continuous'`, `tabular-nums` on stats, ≥44×44 tap targets, `selectable` email, native-header safe area.

**Exit criteria met:** `npx tsc --noEmit` green.

### Phase 8 — My Papers (direction B)
✅ **COMPLETED (stable)** — Status-led list with a gold Submit FAB; first tab converted to the headerless in-body-title model.

**Implementation summary**
- ✅ `src/components/MyPaperCard.tsx` (new) — status-led row: left status color-bar (tone-matched via `state.*` / navy), category eyebrow (UUID-guarded), `PaperStatusChip`, serif title, meta line (Submitted/Published date + views·downloads for published).
- ✅ `src/screens/main/MyPapersScreen.tsx` — rebuilt to direction B: in-body serif title + computed subtitle ("N submissions · M need your attention") → sunken search → status filter chips (All / In review / Needs revision / Published) → `MyPaperCard` list → **gold "+ Submit" FAB** (screen's one gold accent) replacing the header button. Categories fetched for name resolution (`Promise.allSettled`, best-effort). Skeleton / empty / error preserved.
- ✅ `src/navigation/AppNavigator.tsx` — `MyPapers` tab `headerShown: false`.
- Skills applied: thumb-zone gold FAB, one-column list + whitespace, `tabular-nums` meta, `borderCurve: 'continuous'`, ≥44×44 targets, safe-area top inset via `useSafeAreaInsets`.

**Headerless rollout:** Decision = headerless across all 5 tabs, reached incrementally so no un-remodeled screen is left jammed under the status bar: ✅ My Papers (Phase 8), ✅ Notifications (Phase 9), ✅ Invitations (Phase 10), ✅ Browse + Dashboard (Phase 12). **Complete — all 5 tabs headerless with in-body serif titles.** Each tab hides its native header only when it gains an in-body title + safe-area inset.

**Exit criteria met:** `npx tsc --noEmit` green.

### Phase 9 — Notifications (directions A + B)
✅ **COMPLETED (stable)** — Date-grouped list combining A's tinted type-icons with B's soft-navy unread band; headerless.

**Implementation summary**
- ✅ `src/components/NotificationCard.tsx` — rebuilt to the combined row: tinted rounded-square type icon (invite→navy, comment/revision→amber, publish/approved→green, else slate bell — keyed off `NotificationItem.type`), body (primary text + optional secondary + relative time), navy unread dot, soft-navy unread band. `Badge`/`PressableCard` dropped.
- ✅ `src/screens/main/NotificationsScreen.tsx` — headerless serif title + "Mark all read" link + "N unread / You're all caught up" subtitle; notifications bucketed into Today / This week / Earlier. All logic preserved (loadData, openNotification mark-read + navigate, markAllAsRead, unreadCount).
- ✅ `src/navigation/AppNavigator.tsx` — `Notifications` tab `headerShown: false`.
- Skills applied: distinct per-type icons for fast scanning, calm utility screen (no forced gold), `borderCurve: 'continuous'`, safe-area top inset, preserved empty/loading/error.

**Exit criteria met:** `npx tsc --noEmit` green.

### Phase 10 — Invitations (direction B)
✅ **COMPLETED (stable)** — Inviter-avatar cards with inline navy Accept pill + subtle Decline link; expired cards recede; headerless.

**Implementation summary**
- ✅ `src/components/InvitationCard.tsx` — rebuilt to direction B: inviter initials avatar + name + sub-line (Invited/Expired date — inviter affiliation is not in the data) + status pill (pending→warning, accepted→success, declined→danger, expired→neutral) + serif research title + "Expires in N days" + inline actions: navy **Accept** pill (spinner + "Accepting" while acting) and subtle **Decline** text link. Expired cards recede (grey avatar/title) with disabled actions. `Card`/`Button` dropped for a custom Pressable layout.
- ✅ `src/screens/main/InvitationsScreen.tsx` — headerless serif "Invitations" title + pending subtitle; all logic preserved (loadData, runAction accept/decline, isExpired→status coercion, counts, actingToken).
- ✅ `src/navigation/AppNavigator.tsx` — `Invitations` tab `headerShown: false`.
- Skills applied: inline actions, navy Accept / neutral Decline (palette discipline — no green/red), `borderCurve: 'continuous'`, safe-area inset, ≥44×44 targets, preserved empty/loading/error.

**Exit criteria met:** `npx tsc --noEmit` green.

### Phase 11 — Submit Research (direction A, visual-only)
✅ **COMPLETED (stable)** — Frozen file unfrozen on this branch (deny lifted + restart). Re-skinned into carded sections; **no field reordered, no handler touched**.

**Implementation summary**
- ✅ `src/screens/main/SubmitResearchScreen.tsx` — visual-only restyle: added a local `FormSection` (numbered navy badge + uppercase title + carded body) and grouped the existing fields into **1 Attachment** (dashed upload Pressable → existing `handleChooseFile`), **2 Paper details** (title/abstract/keywords), **3 Classification** (category/department/faculty pickers → existing bottom sheets), **4 Co-authors** (search + chips), **5 Notes**. Serif header title + green **autosave** indicator (fed by `draftSyncMessage`); field borders softened to `border.subtle`; sticky **gold "Review & submit"** footer (screen's one gold accent) → existing `handleSubmitPress` → checklist modal; safe-area top/bottom insets. Bottom-sheet pickers + checklist modal unchanged. Inline Cancel dropped (header back covers it).
- All state, effects, autosave, draft-sync, and submit/checklist logic preserved exactly.
- ⚠️ `SubmitResearchScreen.tsx` deny removed from this branch's `.claude/settings.json` (scoped unfreeze, mirroring the Phase 7 navigation unfreeze).
- Skills applied: carded sections, thumb-zone sticky CTA, `borderCurve: 'continuous'`, safe-area insets.

**Exit criteria met:** `npx tsc --noEmit` green.

### Phase 12 — Browse refinement + headerless completion
✅ **COMPLETED (stable)** — Browse rebuilt to the calmer one-column direction (Refinement B, dot variant); headerless rollout completed across Browse + Dashboard.

**Implementation summary**
- ✅ `src/screens/main/BrowseScreen.tsx` — addressed the text-heavy / two-column feedback: **default one-column** cards (category dot + colored category + serif title + author·date — lighter, more whitespace) with a **1-/2-column view toggle** (grid mode reuses `ResearchTile`); scrolling category **topic chips** replace the Filters bottom sheet; slim subbar (count + Sort link + toggle); navy featured hero kept; serif "Browse" title; headerless + safe-area inset. Sort bottom sheet retained. Reuses `resolveCategoryName` / `colorForCategory`.
- ✅ `src/screens/main/DashboardScreen.tsx` — headerless + safe-area inset (final tab).
- ✅ `src/navigation/AppNavigator.tsx` — `Browse` and `Dashboard` tabs `headerShown: false` → **all 5 student tabs now headerless**.
- Satisfies **Issue #6** (toggleable list/tile view) properly — the 1-/2-column toggle is implemented (close on GitHub as delivered).
- Skills applied: reduce density + whitespace, one-column default, `borderCurve: 'continuous'`, safe-area insets, ≥44×44 targets.

**Exit criteria met:** `npx tsc --noEmit` green. **All UX Remodel screens (Phases 7–12) complete.**

---

## 4. Constraints

- `npx tsc --noEmit` green at every phase exit.
- Palette discipline: navy + gold + slate only; gold once per screen; never Anthropic orange/blue/green.
- Two typefaces only: **Source Serif 4 + IBM Plex Sans**.
- Token changes keep non-remodeled screens working.
- **Navigation** unfrozen on this branch only to add the `Profile` route (Phase 7); no further routes without cause. Collections still surface via bottom sheets / in-screen sections.
- New types live in API facades, not `domain.ts` (frozen).
- Commits staged specifically and presented for review (CONVENTIONS §2); no Co-Authored-By trailer.

## 5. Frozen files (do not touch)

`AuthContext.tsx`, `supabase.ts`, `domain.ts`, `src/auth/`, `src/storage/authStorage.ts`, deployed SQL snapshots. (Navigation files and `SubmitResearchScreen.tsx` were unfrozen on this branch — Phases 7 and 11 — for the Profile route and the Submit restyle; the session-critical core stays frozen.)

## 6. Success criteria

- 3 hero screens polished to pitch quality in the cool, two-typeface system.
- Save features (bookmarks + collections) working under anon-key + RLS.
- Foundation (cool tokens, motion system, gesture bottom sheet) reusable for the later full remodel.
- Pitch artifact (recordings/screenshots) captured.
- `npx tsc --noEmit` green throughout.
