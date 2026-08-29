# Handoff — Polish Parity (Post-D&P): Sheets, Filters, Up Next, Watermark & Annotations — capstone-nucleus-rn

**Status:** PLAN LOCKED via `grill-with-docs` (10 questions). Build mode now active. Prior D&P handoff at `C:\Users\Christian\AppData\Local\Temp\opencode\handoff-dandp-parity.md` remains canonical for W1-W6; this file extends it and is the **single reference before handoff**. Do not lose context — it captures every screenshot defect, extra request, grilled decision, and execution plan.

**Base:** `18d707b` + uncommitted D&P tree (146 tests/9 suites green, user-verified on device). `docs/sql/programs_read_policy.sql` deployed.

---

## 1. What the previous D&P did (preserved)

Bring `capstone-nucleus-rn` to web parity for Departments & Programs (read side). Key rule: **FK id wins, free-text fallback; program implies parent department** — `research_papers` has `department`+`department_id`+`program_id` but no `program` text; reads via `programs!research_papers_program_id_fkey` (`supabase/schema_backup.ts:1060-1086`). Search filters client-side. See full `handoff-dandp-parity.md` W1-W6.

---

## 2. Defects verified in screenshots + user notes (new scope)

1. **S1 SubmitResearch wizard Select Program clips** — `SubmitResearchScreen.tsx:1113` `BottomSheetScrollView style={styles.sheetList}` with `maxHeight:360` + `BottomSheet.tsx:41-46` `flex:1` view cuts tail (BSMA cropped, Screenshot 1).
2. **S2 Browse All departments missing SECA** — `BrowseScreen.tsx:556-608` groups `programs.filter(p.department_id===dept.id)`; `submitApi.getPrograms()` filtered `is_active=true`; `getDepartments()` reads `departments`. Screenshot 2 shows only SASE + SBMA headings; **SECA = School of Engineering, Computing, and Architecture** expected but absent (seed/RLS or `is_active` gap).
3. **S3 Browse All Years sheet crops Apply Filter** — `BrowseScreen.tsx:413` `BottomSheet` (no snapPoints, dynamic sizing) + `yearInputsRow` + `Button label="Apply Filter"` sits under home indicator (insets.bottom not added).
4. **Forgot? sheet in auth broken** — `LoginScreen.tsx:248-254,413-578` sets `showForgotPassword=true` but never `bottomSheetRef.current?.present()`; conditional `{showForgotPassword && <BottomSheet ref={...}>}` mounts closed (migration off raw gorhom broke open path).
5. **Reject/Revision/Approve sheets short** — `FacultyReviewDetailScreen.tsx:451` `<BottomSheet ref={actionSheetRef} onDismiss>` no snapPoints/scroll → does not extend enough.

**Extra requests to bake in:**

- **Download purge:** strip all download info (count, "Download unavailable") — zero mention. Keep Supabase intact for web.
- **App logo:** installed icon is generic Expo; use NU mark at `assets/images/nucleus-mark.png` (Navy N + Gold orbit), delete placeholders, keep white bg.
- **Search/segment inconsistency:** `BrowseHeader.tsx:101-112` vs `MyPapersScreen.tsx:288-304` search wraps diverge; `BrowseFilterBar.tsx:149-167` `viewToggle` vs `MyPapersScreen.tsx:305-324` `pillContainer`; dropdown links `BrowseFilterBar.tsx:43-76` look clunky (13px chevron, maxWidth 120/128).
- **Up Next:** `DashboardScreen.tsx:87-93` (student) shows rejected (not actionable); `FacultyDashboardScreen.tsx:45` / `faculty.ts:693` mixes `revision_required` where ball is with student. Prioritize oldest pending by age (3d > today).
- **Dark decision buttons too bright:** `Button.tsx:122-148` `danger #F87171 / success #34D399 / accent #D3B03F` on `dark` `colors.ts:206-213` `base #0A1226` blow out.

**Newly added in grill:**

- **Watermark parity:** web `frontend/src/components/pdf/SecurePDFViewer.jsx:36,239-247,276-281` shows tiled `NU` (`dx 200×200, 40px bold, #000000 0.08, rotate -45`) + footer `🔒 Protected document. Copying is disabled.` on both student `frontend/src/pages/student/ResearchDetail.jsx:487-499` and staff `frontend/src/pages/staff/ReviewDetail.jsx:758`. Mobile `src/components/PdfViewer.tsx:64-381` has none.
- **Annotations parity:** web student `frontend/src/pages/student/ResearchDetail.jsx:159-612` shows reviewer notes only if `isAuthorOrCoAuthor` (draw overlays only); staff `frontend/src/pages/staff/ReviewDetail.jsx:75-1039` uses single `AnnotationsSidePanel.jsx` drawer (`note` + `draw` upload + reply/delete) — no inline card list. Mobile faculty `FacultyReviewDetailScreen.tsx:391-425` adds extra inline `Reviewer comments` + exposes `highlight` (drag) and `draw` freehand `PdfViewer.tsx:714-751` with no web UI.

---

## 3. Grilled decisions (10 questions, all locked)

### Q1 Student Up Next
- **Decision:** Up Next = oldest `revision_required` only, age `submission_date || created_at` ASC. Exclude `rejected` and `pending_*`. Fall through to Recommended/All caught up. Splits `PaperStatusChip.tsx:14` `ACTION_STATUSES={revision_required,rejected}` → `REVISE_REQUIRED` vs `REJECTED`.
- **Rationale:** `CONTEXT.md:24-25` Student Dashboard = actionable insight (papers needing revision); `PRODUCT.md:40` clarity of status; rejected not actionable per user.
- **Files:** `DashboardScreen.tsx:87-93`, `PaperStatusChip.tsx:14`, `researchApi.getMyPapers:574`, new helper `getUpNextStudentPaper`.

### Q2 Faculty Up Next
- **Decision:** Up Next = oldest `pending_faculty` only. Exclude `revision_required` from Up Next (stays in `FacultyWorkloadSummary.revisionRequired` count). Age same as Q1.
- **Rationale:** `CONTEXT.md:7-9` Faculty Dashboard workload vs activity; `Activity Stream` vs `Action Queue` split; ball with student not faculty.
- **Files:** `faculty.ts:693-709` narrows `in('status',['pending_faculty'])` only; `FacultyDashboardScreen.tsx:45-67` respects it.

### Q3 Department/Program & SECA
- **Decision:** SECA canonical name = **School of Engineering, Computing, and Architecture**. Browse "All departments" shows **every** `departments` row alpha, even if zero active programs; children = `programs where is_active=true` only (submit-cascade parity `research.ts:1045-1065`). Zero-active dept still renders heading.
- **Alt rejected:** hide zero-active depts (would hide SECA) / show inactive programs (would pollute).
- **Files:** `BrowseScreen.tsx:556-608`, `BrowseScreen.loadData`, `submitApi.getDepartments/getPrograms`, `supabase/schema_backup.ts`, `docs/sql/programs_read_policy.sql`; add CONTEXT Department/Program entries.

### Q4 Download purge scope
- **Decision:** Purge all download **display + client tracking**, keep view counts. No Supabase DDL. Delete `download_count` from `ResearchPaper:75`, `ResearchPaperRow:86`, `PAPER_SELECT:125`, `toResearchPaper:257`, `trackDownload:807-847` (+ `paper_downloads`/`allow_download` checks), UI `ResearchDetailScreen.tsx:268-278` (`date · views` only, remove slash + "Download unavailable"), `ResearchCard.tsx:83-86`, `StandardPaperCard.tsx:41`, tests `__tests__/research.test.ts:401-432`. Views remain `view_count`.
- **Files:** `types/domain.ts`, `api/research.ts`, `screens/main/ResearchDetailScreen.tsx`, `components/{ResearchCard,StandardPaperCard}.tsx`, `DESIGN.md:182`, `CONVENTIONS.md:182`.
- **Guard:** Do not `DROP` column/table; web relies on it.

### Q5 Search / Segment / Dropdown consistency
- **Decision:** One `SearchField` primitive (44px, `surface.sunken`, hairline `border.subtle`, `radii md`, `Search` icon) replaces `BrowseHeader.tsx:60-78,101-112` and `MyPapersScreen.tsx:143-154`. One `SegmentedControl` (`surface.sunken` track, `surface.raised` thumb, `brand.primary`) replaces `BrowseFilterBar.viewToggle:149-167` + `MyPapersScreen.pillContainer:305-324`. **Both roles**. Browse filters become pills (`Chip`-style, `ChevronDown 14px`, `hitSlop 8`) active = `primarySoft` filled; idle = `text.secondary`. Pill order (industry/M3/iOS) = **`All | In Review | Needs Revision | Approved`** (`All` first default, workflow-progressive). Active Year pill = filled bg.
- **Files:** new `components/ui/SearchField.tsx`, `SegmentedControl.tsx`, `BrowseFilterBar.tsx:43-76`, `MyPapersScreen.tsx:160-191`, `FacultyReviewScreen.tsx` queue.

### Q6 App logo
- **Decision:** Source `assets/images/nucleus-mark.png` (provided image). Delete Expo placeholders (`assets/icon.png`, `assets/adaptive-icon.png`, `assets/splash-icon.png`, `assets/favicon.png`). Generate 1024×1024 `icon.png` + 1024×1024 transparent foreground `adaptive-icon.png` (30% padding) on **white** `backgroundColor #ffffff` (no Navy). `app.config.ts:17-38` `userInterfaceStyle: 'automatic'` (was `light`). Derivatives for splash/favicon. Dev/preview/prod variants share mark.
- **Files:** `app.config.ts`, `assets/*`, optional `eas.json` `projectId` check.

### Q7 Dark decision buttons
- **Decision:** Light unchanged. Dark muted fills: `danger→palette.danger[600] #B91C1C` (pressed `[500]`), `accent→palette.gold[600] #AE8829` (pressed `#82661E`, onBrand navy text), `success→palette.success[600] #047857`, each with 1px `border.subtle` + `dangerPressed/…` step (currently no-op `dangerPressed===dangerBase`). Header tints `successSurface/dangerSurface/accentSurface:211` also muted. Implement via `colors.ts:206-213` `state.dangerMuted` etc. or `Button.tsx:73` scheme check.
- **Files:** `components/ui/Button.tsx:122-148`, `theme/colors.ts:206-213`, `FacultyReviewDetailScreen.tsx:429-444,454,541,598`.

### Q8 Watermark
- **Decision:** Replicate web exact inside `PdfViewer.tsx:buildViewerHtml` — tiled SVG `NU`:
  ```css
  backgroundImage: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Ctext x='50%25' y='50%25' font-size='40' font-weight='bold' fill='%23000000' fill-opacity='0.08' text-anchor='middle' dominant-baseline='middle' transform='rotate(-45 100 100)'%3ENU%3C/text%3E%3C/svg%3E");
  backgroundRepeat: repeat; backgroundSize: 200px 200px; pointer-events:none;
  ```
  `absolute inset-0 z-0` behind pages (or fixed z-6 above at same opacity). Prop `watermarkText="NU"` default (`SecurePDFViewer.jsx:36`). Apply to all `PdfViewer` variants `inline/fill/preview` for **both** student `ResearchDetailScreen` and faculty `FacultyReviewDetailScreen` — matching `student/ResearchDetail.jsx:487,499` + `staff/ReviewDetail.jsx:758`. **+ footer** `🔒 Protected document. Copying is disabled.` below viewer (web `SecurePDFViewer.jsx:276-281`) and Esc/fullscreen copy-block not needed on native.
- **Files:** `components/PdfViewer.tsx:64-381` (buildViewerHtml), `screens/main/ResearchDetailScreen.tsx:314-343`, `screens/faculty/FacultyReviewDetailScreen.tsx:332-352`, variant props.

### Q9 Faculty review annotations — keep only what web does
- **Decision (user pick 1): Keep decision-sheet notes + PDF notes drawer; delete rest.**
  - **Keep:** Decision sheets `FacultyReviewDetailScreen.tsx:451-649` —
    - Approve `comments` optional (`"Optional note to the next reviewer"` `509-521`),
    - Revision `notes` required (`"Revision notes (required)"` `565-577`),
    - Reject `reason` required (`"Rejection reason (required)"` `620-631`).
  - **Keep:** Single PDF notes drawer (web `AnnotationsSidePanel.jsx:106-119,212-287` = page input + note textarea → `annotationType:'note'` `ResearchDetail.jsx:215-225`; reply `parentId`; delete owner/admin; draw overlays `draw` type `ReviewDetail.jsx:598-601`).
  - **Remove:** Inline `Reviewer comments` section `FacultyReviewDetailScreen.tsx:391-425` (pageless cards, no web counterpart); `highlight` (drag-box `Highlighter` `PdfViewer.tsx:728-735`) + `selectedText` quote block `AnnotationPanel.tsx:131-137`; speculative `draw` freehand beyond web upload (keep note only) — web draw is upload via `uploadAnnotationDrawing` `research.ts:2033`.
  - **Student stay:** `ResearchDetailScreen:554-612` gated by `isAuthorOrCoAuthor` (or mobile `showFeedback=!isRepositoryPaper`) as web `student/ResearchDetail.jsx:110-162` — reviewer targeted notes list under workflow.
  - **Optional parity:** Append `[Annotation Summary]` to Approve/Reject/Revision comments as web `ReviewDetail.jsx:289-355` does — mobile currently does not — **add it** if true parity desired (grill left open, default add).
- **Files:** `screens/faculty/FacultyReviewDetailScreen.tsx:57-667`, `components/PdfViewer.tsx:714-751,642-711`, `components/AnnotationPanel.tsx:131-187`, `api/faculty.ts:945-1045` `createNote/Highlight/Draw`.

---

## 4. Technical plan Phases (ordered, commit per phase)

**0. Audit (30m)** — query Supabase `select name,code from departments` + `select name,code,department_id,is_active from programs` vs `database_backup.json:1582`; confirm `programs_read_policy.sql` RLS. Screenshot repro on iOS/Android (insets.bottom).

**A. BottomSheet primitive + faculty sheets** (`BottomSheet.tsx:27-53` remove `maxHeight:360`→`flex:1`, add `bottomInset`, `BrowseScreen:413/481/526` snap `['50%','90%']`, `SubmitResearchScreen:1040/1065/1113/1163` snap, `FacultyReviewDetailScreen:451` `snapPoints=['65%','92%']` + `BottomSheetScrollView` + `paddingBottom:insets.bottom+lg`). Fixes S1, S3, faculty short.

**B. Login Forgot?** (`LoginScreen.tsx:57,248,413-578`) always-mounted `<BottomSheet>` + `useEffect present()`.

**C. SECA Browse** (`BrowseScreen loadData` + `filterPublishedRows` + `getPrograms` RLS check; seed migration if missing).

**D. Download purge** (`domain.ts:75` etc. list Q4) + grep guard.

**E. Logo assets** (`assets/images/nucleus-mark.png` → `assets/{icon,adaptive-icon,splash-icon,favicon}.png`, `app.config.ts:17-38` white bg, `automatic`).

**F. Search/Segment/Pills** (new `SearchField` + `SegmentedControl`, Q5 both roles).

**G. Watermark** (Q8 WebView SVG + footer).

**H. Annotations** (Q9 removals/keeps; decide `[Annotation Summary]` add).

**I. Up Next** (Q1/Q2 helpers, oldest-first, split statuses, tests).

**J. Dark buttons** (Q7 `colors.ts` + `Button.tsx` scheme).

Each phase small, stage only its files (prior D&P dirty tree not staged).

---

## 5. Domain model updates (draft once plan lifted)

- `CONTEXT.md` add:
  - **Department** — academic unit (e.g., SASE = School of Arts, Sciences and Education; SBMA = School of Business, Management and Accountancy; **SECA = School of Engineering, Computing, and Architecture**).
  - **Program** — child of Department (`programs.department_id`, `is_active`).
  - **Up Next (Student)** — oldest `revision_required`.
  - **Up Next (Faculty)** — oldest `pending_faculty`.
  - **Watermark** — tiled `NU` 0.08/-45° copy-protection on PDF views.
  - **Reviewer Notes vs Decision Notes** — PDF notes (page-pinned) vs decision-sheet notes (Approve/Revision/Reject).
- **ADRs** (sparingly, per `domain-modeling:67`):
  - ADR: Up Next excludes rejected / pending_* (surprising vs `ACTION_STATUSES`).
  - ADR: Download purge app-only (hard to reverse if DB dropped).
  - ADR: Watermark in WebView not native overlay (trade-off: scroll/zoom fidelity).

---

## 6. Verification

- Sheets: all pickers over scroll, Apply Filter + Reject/Reverse/Approve visible above home indicator/keyboard, 50%/90% stops, `keyboardBehavior interactive`.
- Browse dept: SECA heading visible with indented `is_active` programs; selecting SECA program filters `published` list correctly with hybrid search.
- Forgot?: tap Forgot? → sheet opens, send code→step2, reset→dismiss, reopen 3×.
- Browse SECA+year: `search-papers` edge fn still client-filtered.
- Download grep returns only historical `.claude/` docs.
- Icon: `npx expo prebuild --clean` + install APK/IPA shows NU mark on white.
- Up Next: seed 3d vs today, student shows oldest `revision_required` not rejected; faculty shows oldest `pending_faculty`.
- PDF: watermark tiled identical to web SVG, footer present, light/dark visible at 0.08; no highlight/draw tools, drawer only note+reply/delete.
- `npm test` 146+ (add Up Next helper tests) green; `tsc --noEmit`; `eslint src` (pre-existing 4 errors/43 warns noted).

---

## 7. Risks & backout

- Logo asset generation may need `sharp`/`expo-image-utils` manual run; backout: `git restore assets/ app.config.ts`.
- BottomSheet flex change could regress Profile sheets — verify `ProfileScreen`.
- Removing `download_count` from `PAPER_SELECT` is backward-compat with Supabase (column remains) — rollback: `git revert` first D commit.

---

## 8. References (exact code + web)

- Mobile: `src/types/domain.ts:75`, `src/api/research.ts:86,110-154,233-337,807-847,1045-1065`, `src/api/faculty.ts:693-751,945-1045`, `src/components/PdfViewer.tsx:64-1101` (buildViewerHtml, annotationMode), `src/components/AnnotationPanel.tsx:131-187`, `src/components/ui/BottomSheet.tsx:27-73`, `src/components/ui/Button.tsx:122-148`, `src/components/StandardPaperCard.tsx:41`, `src/components/ResearchCard.tsx:83-86`, `src/screens/main/{BrowseScreen.tsx:413,556-608,679, ResearchDetailScreen.tsx:268-343, DashboardScreen.tsx:87-93, MyPapersScreen.tsx:160-324, SubmitResearchScreen.tsx:1040-1163, browse/BrowseFilterBar.tsx:43-167}`, `src/screens/faculty/{FacultyReviewDetailScreen.tsx:332-667, FacultyDashboardScreen.tsx:35-95}`, `src/theme/colors.ts:206-213`, `app.config.ts:8-64`, `assets/images/nucleus-mark.png`, `supabase/schema_backup.ts:1060-1086,903`, `docs/sql/programs_read_policy.sql`, `database_backup.json:1582+`.
- Web (read-only): `C:\Users\Christian\Projects\capstone-nucleus\frontend\src\components\pdf\SecurePDFViewer.jsx:28-286` (watermark SVG 200×200 0.08 rotate -45, drawOverlays), `frontend\src\pages\student\ResearchDetail.jsx:110-754` (isAuthorOrCoAuthor reviewer notes, drawOverlays), `frontend\src\pages\staff\ReviewDetail.jsx:75-1139` (AnnotationsSidePanel drawerOnly, note+draw, `[Annotation Summary]`), `frontend\src\components\pdf\AnnotationsSidePanel.jsx:14-412` (drawer rail, note page input, reply/delete), `frontend\src\utils\api.js:186-192`, `backend\src\controllers\annotation.controller.js:48-214` (parentId threading).

---

**Next actor:** Pick up at Phase 0 audit → A-J per this file. This is the sole reference before handoff — `handoff-dandp-parity.md` stays for D&P history; do not duplicate D&P ADRs here.
