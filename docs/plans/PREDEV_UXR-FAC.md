# NUcleus Mobile — Implementation Plan: Pre-Dev Integration (UXR × FAC)

> **STATUS: IN PROGRESS** — Branch `predev/uxr-fac`, cut from `dev`.
> Fuses **UX Remodel** (`feat/ux-remodel`) and **Faculty Access**
> (`feat/faculty-access`) into one uniform tree, reconciles them into a single
> visual + feature standard, then merges to `dev` and retires both feature
> branches. Workflow: [`docs/predev/README.md`](../predev/README.md).

**Canonical product context:** [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)
**Process conventions:** [CONVENTIONS.md](../CONVENTIONS.md)
**Participant plans:** [UX_REMODEL.md](./UX_REMODEL.md) · [FACULTY_ACCESS.md](./FACULTY_ACCESS.md)

---

## 1. Goal

Produce a **UNIFORM PRODUCT**: the faculty side adopts UX Remodel's full layout
language (headerless tabs with in-body serif titles + safe-area insets, the
cool-slate / Source Serif 4 + IBM Plex Sans design system, the new card patterns,
gold-once-per-screen), and the student side gains faculty's in-app `PdfViewer`
("Read paper" wiring). All docs sync. The branch clears to `dev` only through the
full exit gate (§4). Both feature branches are retired at the final merge;
remaining faculty scope (#14 annotation write, #15 overlay verify) becomes a
fresh undertaking cut from the new `dev`.

## 2. Merge base (Phase 0)

- Base cut from `dev @ 24b733d` (carries the pre-dev workflow docs + registry).
- `feat/ux-remodel` merged first (`9471502`, conflict-free) — design source of truth.
- `feat/faculty-access` merge pending (Session B) — resolves the 6-file conflict
  surface: `.claude/settings.json`, `package.json`, `package-lock.json`,
  `AppNavigator.tsx`, `navigation/types.ts`, `ResearchDetailScreen.tsx`.
  Resolution policy per [`docs/predev/README.md`](../predev/README.md) §Procedure
  and the approved plan.

## 3. Phased plan

Each phase is one session turn (house Phase Protocol: investigate → report → wait
→ implement → tsc → update markers → stage → present → stop).

### Phase 0 — Base merges
✅ **COMPLETED (stable)**

**Implementation summary**
- Both base merges landed: UX-R (`9471502`) + FAC (`aa13b33`, 6 conflicts resolved
  per plan/kickoff: settings/ResearchDetail/lock `--ours`; package.json + nav files
  unioned; lora/outfit dropped). `npm install` + `npx tsc --noEmit` **green**.
- Boot smoke-QA on the existing dev-client passed: **both roles reachable in one
  build**, fonts load, no crash from the removed Lora/Outfit (token-flow proof).

**Smoke-QA observations (both expected — logged, not blockers):**
- *Faculty screens look un-remodeled.* Not a font bug: every faculty surface already
  consumes the same IBM Plex Sans `theme.typography.*` tokens as the student side
  (screens, tab labels, native header titles). The gap is the remodel **layout
  language** — faculty still uses **native headers** (kept verbatim by the merge) and
  lacks the headerless in-body-title / card / safe-area patterns. This is precisely
  the **Phase 3–8** re-skin scope. (Note: the Source Serif 4 `display` token is wired
  into *zero* screens today, student included — no screen shows serif yet.)
- *"Mock papers" in student Browse.* Not code: `getPublishedPapers()` reads
  `research_papers` from Supabase; there is no mock/seed data in the codebase. These
  are pre-existing test rows in the **shared** DB (shared with web), untouched by the
  integration. Optional later Supabase data cleanup, not an integration task.

**Exit criteria met:** both feature branches fused; tsc green; both roles boot in one
build with the new UI font loaded.

### Phase 1 — Student "Read paper" → in-app PdfViewer
✅ **COMPLETED (stable)**

**Implementation summary**
- Ported FAC's pattern into UX-R's `ResearchDetailScreen`: a mount effect resolves
  the (signed) file URL via `getResearchFile` into `fileUri`/`fileError`; a new
  "Paper" section renders the shared `<PdfViewer>` inline (loading→`Skeleton`,
  failure→`InlineNotice`). `trackView` moved from button-tap to the viewer's
  `onFirstLoad` (fires once on first render).
- Dropped the `WebBrowser.openBrowserAsync` path, the "Read paper" `Button`, and
  the `openFile`/`openingFile` machinery. Bookmark control kept, right-aligned in
  its own row (option A). `expo-web-browser` stays — `PdfViewer` still uses it for
  its error fallback (Phase 2 removal decision unaffected).
- `npx tsc --noEmit` **green**; no orphaned references.

**Exit criteria met:** student ResearchDetail reads PDFs in-app via the same shared
viewer as faculty; no external-browser handoff in the happy path.

### Phase 2 — Dead-dependency cleanup
✅ **COMPLETED (stable)**

**Implementation summary**
- Removed `react-native-pdf`, `react-native-blob-util`, and both `@config-plugins/*`
  from `package.json`; removed the two `@config-plugins/*` entries from `app.json`
  `plugins` (atomic manifest+config edit). `npm install` regenerated the lockfile
  (−101 lines). `npx tsc --noEmit` **green**.
- `lora` / `outfit` needed no action — already dropped in the Phase 0 merge; no
  residual references anywhere.
- **`expo-web-browser` retained** (plan's "now import-free" assumption was wrong):
  `PdfViewer.tsx` still imports it for its "Open in browser" error fallback, and it
  stays in `app.json` plugins.
- The `react-native-pdf`/`blob-util` mention left in `PdfViewer.tsx` is a *comment*
  documenting why the viewer uses WebView + pdf.js instead — kept as rationale.

**Native delta:** removal-only. The existing 2026-06-28 dev-client remains a valid
superset for QA; the dead-dep removal only materializes in Phase 11's fresh build.

**Exit criteria met:** no dead PDF/blob native deps or config-plugins in the tree;
tsc green; lockfile consistent.

### Phase 3 — Faculty shell + Dashboard re-skin
✅ **COMPLETED (stable)**

**Implementation summary**
- `FacultyTabs.tsx`: `headerShown: false` on all 5 tabs (dropped the now-dead
  native-header styling). Faculty now matches the student headerless-tabs shell.
- `FacultyDashboardScreen`: added `useSafeAreaInsets` → `paddingTop: insets.top +
  spacing.md` on the scroll content (replacing the removed native header's top
  spacing), plus `paddingBottom: 3xl` so cards clear the tab bar. In-body h1
  greeting kept (mirrors the student Dashboard's in-body title). Card patterns
  already tokenized (`PressableCard`/`Stat`/`Skeleton`) — no change needed.
- Gold-once audit: single conditional `Stat` "warning" tone on pending-review; no
  other accent. `npx tsc --noEmit` **green**.

**Note (transient):** flipping `headerShown: false` ×5 also removed native headers
from Review/Repository/Notifications/Profile, which don't yet carry safe-area
insets — **Phases 4, 6, 8 add `useSafeAreaInsets` to each as they re-skin.** No
intermediate QA happens before then (Christian tests post-Phase-11).

**Exit criteria met:** faculty shell is headerless; Dashboard is inset-correct and
tokenized; tsc green.

### Phase 4 — Faculty Review queue re-skin
✅ **COMPLETED (stable)**

**Implementation summary**
- `FacultyReviewScreen`: added `useSafeAreaInsets` → the sticky search/filter header
  now insets under the status bar (`paddingTop: insets.top + spacing.md`), fixing
  the Phase-3 header-removal. Added a serif in-body title ("Review",
  `fontFamilies.display.semibold` 26/32 — matching the student Browse title). Added
  `paddingBottom: 3xl` so the list clears the tab bar.
- Kept the sticky search + count-badged filter chips (deliberate: persistent
  filtering is core to a review queue). Cards already tokenized
  (`PressableCard`/`Chip`/`Skeleton`). No decorative gold. `npx tsc --noEmit`
  **green**.

**Correction to the Phase-0 note:** serif *is* used on student screens — via
`theme.fontFamilies.display.*` directly (Browse/ResearchDetail titles, abstract),
not the `typography.display` token (which is what that grep checked). The faculty
re-skin adopts the same `fontFamilies.display` serif for in-body titles.

**Exit criteria met:** Review is inset-correct with a serif title; tokenized; tsc green.

### Phase 5 — FacultyReviewDetail re-skin
✅ **COMPLETED (stable)**

**Implementation summary**
- Adopted the student ResearchDetail header pattern: `FacultyReviewDetail` now uses
  the shared `ResearchDetailHeader` custom header (`header: props =>
  <ResearchDetailHeader {...props}/>` in `AppNavigator`) — themed back chevron,
  safe-area inset, hairline border — replacing the default native header. The header
  is generic (reads `options.title`), so "Paper Review" flows straight through.
- Switched the screen title from `typography.h1` (sans) to the serif
  `fontFamilies.display.semibold` 26/32 (matches the student ResearchDetail title).
  Added `paddingBottom: 3xl` for home-indicator clearance.
- The rest was already tokenized (PdfViewer + annotation overlays, `Card` timeline,
  `BottomSheet` decision flows, `Chip` status). Approve = primary navy; no
  decorative gold. `npx tsc --noEmit` **green**.

**Exit criteria met:** ReviewDetail wears the student header pattern + serif title;
tsc green.

### Phase 6 — FacultyRepository re-skin
✅ **COMPLETED (stable)**

**Implementation summary**
- Adopted `src/utils/category.ts` (§10): replaced the screen-local
  `new Map(categories…)` + `.has/.get` with `buildCategoryNameById` +
  `resolveCategoryName` — the UUID-guarded, single-source category resolver. This
  also brings the Issue-#5 UUID-leak guard to Repository for free.
- Added the tab-screen safe-area inset (`paddingTop: insets.top + spacing.md` on the
  sticky header) + serif "Repository" title, matching Review. Added
  `paddingBottom: 3xl`. Cards already use the shared `PressableCard` pattern.
- `npx tsc --noEmit` **green**.

**Scope note:** kept `PressableCard` rather than adopting the student `ResearchTile`
— `getPublishedPapers` returns `FacultyAssignedPaper`, not the `ResearchPaper` shape
`ResearchTile`/`ResearchCard` consume; a full tile adoption needs a shape adapter
(candidate for a follow-up, not this integration).

**Exit criteria met:** Repository uses the shared category util + design-system card
pattern; inset-correct with a serif title; tsc green.

### Phase 7 — FacultyPaperDetail re-skin
✅ **COMPLETED (stable)**

**Implementation summary**
- Gave `FacultyPaperDetail` the shared `ResearchDetailHeader` custom header in
  `AppNavigator` (matches Phase 5 / student ResearchDetail).
- Switched the title to the serif `fontFamilies.display.semibold` 26/32; added
  `paddingBottom: 3xl`.
- The Phase-1 inline-PDF pattern was already present here (`<PdfViewer uri={fileUri}/>`
  inline with `Skeleton`/`InlineNotice` fallbacks) — no change needed.
- Kept the screen intentionally lean (title, meta, PDF, abstract, keywords — no
  review chrome), consistent with its read-only Repository-detail role. `npx tsc
  --noEmit` **green**.

**Exit criteria met:** PaperDetail wears the student header pattern + serif title and
already uses the inline viewer; tsc green.

### Phase 8 — FacultyNotifications + FacultyProfile re-skin
⏳ **NOT STARTED** — Both small; NotificationCard already shared; Profile mirrors
UX-R's ProfileScreen. Closes the gold-once sweep.

### Phase 9 — Queued revisions pass
⏳ **NOT STARTED** — Christian's held UX-R revision list + faculty QA findings.
Split 9a/9b if long.

### Phase 10 — Docs sync + guardrail re-freeze
⏳ **NOT STARTED** — CLAUDE.md Key Files additions (PdfViewer, `src/api/faculty.ts`,
FacultyTabs); close #12; **re-freeze** nav + SubmitResearch via
`git checkout dev -- .claude/settings.json` + commit (git-level write, flagged;
must come after all nav-editing phases).

### Phase 11 — Exit QA + fresh EAS dev-client
⏳ **NOT STARTED** — Full both-role regression on the existing APK; tsc; then
`eas build -p android --profile development`; re-run both roles + both PDF flows
on the fresh client. Exit gate = §4.

### Phase 12 — Final merge + retirement
⏳ **NOT STARTED** — `predev/uxr-fac → dev` (two-undertaking merge body); tag +
delete both feature branches + worktrees; registry flips to `complete`; instance
record `docs/predev/PREDEV_UXR-FAC_<date>.md` on dev; hybrid-search syncs `dev`.

## 4. Exit gate ("clear for dev")

All queued revisions applied · full both-role QA on the **fresh** dev-client ·
`npx tsc --noEmit` green · docs synced (registry, statuses, handoffs, snapshots) ·
Christian's explicit go.

## 5. Constraints

- `npx tsc --noEmit` green at every phase exit.
- Palette discipline: navy + gold + slate; gold once per screen. Two typefaces
  only (Source Serif 4 + IBM Plex Sans).
- Session-critical core stays frozen (Auth/supabase/domain/auth/authStorage).
  Nav files + SubmitResearchScreen are unfrozen on this branch (inherited from
  the participant branches) until Phase 10 re-freezes them.
- No SQL changes expected (both branches' SQL already deployed; snapshots union
  cleanly).
- Commits staged specifically, presented for review; no Co-Authored-By trailer.
