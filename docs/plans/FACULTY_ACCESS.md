# NUcleus Mobile — Implementation Plan: Faculty Access (Read-Only v1)

> **STATUS: v1 VERIFIED ✅ · v2 write actions VERIFIED ✅ · embedded PDF viewer VERIFIED ✅ (Phase 11 — WebView + pdf.js) · annotation viewing built (v3, Phases 12–14, runtime check pending) · additional tabs built (v4, Phases 15–19, runtime check pending)** — Branch `feat/faculty-access`. v1 (Phases 0–6) and v2's three faculty decisions — Approve / Request Revision / Reject (Phases 7–9) — are runtime-verified by Christian and committed. v2 added SECURITY DEFINER write RPCs (snapshot `docs/sql/faculty_access_rpcs.sql`); declare-conflict is **out of scope** (not a faculty-facing action in web). v4 (#12) adds Repository, Notifications, and Profile tabs — `tsc`-green, zero new SQL, no student/shared-`ui/` edits. **Do not merge until Christian explicitly instructs** (after absolute web parity). The nav-file deny stays lifted; re-freeze it at that merge. Remaining deferred scope = §8.
> Opens the app's student-only foundation to a **separate, isolated faculty surface**: faculty get their own navigation, screens, and read path. Built entirely on shared tokens + `ui/` primitives so it absorbs the UX remodel at merge. **Read-only v1** — decision actions and richer review tooling are deferred (§8).

**Canonical product context:** [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)
**Process conventions:** [CONVENTIONS.md](../CONVENTIONS.md)
**Parallel (parked) undertaking:** [UX_REMODEL.md](./UX_REMODEL.md) — `feat/ux-remodel`, do not disturb

---

## 1. Context & strategy

The mobile app was built on a hard "student-only" assumption: the role gate in `AppNavigator.tsx` routes every non-student to `UnsupportedRole`. Faculty already exists in the data model — `UserRole` includes `'faculty'`, `AuthContext` loads faculty profiles, and the shared Supabase DB has `research_papers.faculty_id` plus the workflow columns — but faculty has **no surface** on mobile.

The **web project already implements faculty access** end-to-end (reviewed on its `feature/faculty-dashboard-ui-redesign` branch — current with its remote). It is the behavioral reference. The decisive difference: **web runs all faculty logic server-side via an Express backend using the `SERVICE_ROLE_KEY`, bypassing RLS**. Mobile has **no backend** and is permanently **anon-key + RLS only** — so web's privileged path cannot be copied; it must be re-expressed in mobile-safe primitives (RLS + SECURITY DEFINER RPCs).

**This undertaking ships a read-only v1:** faculty can see their assigned-paper queue, a dashboard summary, and a read-only review detail (metadata + workflow history + open-PDF). All decision actions (approve/reject/revision/conflict) and richer review tooling are **deferred** (§8) — kept in the plan, not built now.

**Coexistence with UX Remodel:** Faculty is cut from `dev` (sibling to `feat/ux-remodel`), uses **only theme tokens + `ui/` primitives** (zero hardcoded styling), and **never modifies a shared component or student screen**. When the remodel later merges its additive warm redesign into `dev`, faculty inherits it through the shared layers rather than conflicting.

---

## 2. Branch decision

**`feat/faculty-access`, cut from `dev`.** Per CONVENTIONS §2, `refactor` = "code restructure with **no behavior change**." This undertaking is overwhelmingly net-new behavior (new screens, navigation surface, API facade, read RPC); the only restructuring is one additive branch in the role gate — incidental to delivering a feature. So `feat/` is correct. Cut from `dev` (not `feat/ux-remodel`) so the two undertakings stay siblings and don't entangle at merge.

> Confirmed at cut time: `dev` @ `e141909`; `feat/faculty-access` identical base (0/0). `feat/ux-remodel` = `dev` + 5 commits (warm tokens, native deps) — faculty intentionally starts without them; read-only v1 needs none.

---

## 3. Scope

**In scope (read-only v1):**
- Faculty navigation surface (`FacultyTabs`: Dashboard + Review queue) + a `FacultyReviewDetail` stack screen.
- Additive faculty branch in the role gate (`AppNavigator.tsx`) + faculty routes (`navigation/types.ts`) — **frozen-file edits approved by Christian; student routing left byte-for-byte intact**.
- Faculty API facade (`src/api/faculty.ts`) reading the assigned queue + review detail.
- A **read-only, additive SECURITY DEFINER RPC** for the assigned-papers read (+ detail read path if RLS blocks it) — briefed first, deployed by Christian, snapshotted to `docs/sql/`.
- Three faculty screens: Dashboard (client-computed workload + recents), Review queue (filters/search/status), Review Detail (metadata + workflow history + open-PDF).

**Out of scope / untouched:**
- Any student-facing screen or shared `ui/` component (faculty *imports* primitives read-only; never modifies them).
- `domain.ts` (frozen) — faculty-specific types live in `src/api/faculty.ts` (per the pattern where `SubmitInput` etc. live in `research.ts`).
- Service role — never, on any path.
- All faculty **write** actions and richer review tooling — deferred (§8).
- Other non-student roles (dean, program_chair, staff, admin) — continue to `UnsupportedRole`.

---

## 4. Architecture: the service-role → RLS/RPC translation

**Web (reference) faculty transitions** — recorded now for fidelity when writes are built later (web `review.controller.js`):

| Action | Transition | Key writes |
|---|---|---|
| Approve | `pending_faculty` → `pending_dean`/`pending_program_chair` | sets `dean_chair_id`; workflow event; notifications |
| Reject | `pending_faculty` → `rejected` | sets `rejection_reason`; workflow event; notifications |
| Request revision | `pending_faculty` → `revision_required` | sets `revision_notes`, `last_reviewer_role`, `previous_status` |
| Declare conflict | removed from queue → reassignment | writes `faculty_conflict_declarations` |

**v1 read path (the only data work this round):**
- **Diagnosis complete (2026-06-22, read-only Supabase MCP): existing deployed RLS already supports faculty reads — no new SQL/RPC needed.**
- `research_papers` SELECT (`Combined research read access`) is email-resolved and grants faculty access for any status: `faculty_id = (SELECT id FROM users WHERE email = auth.email())`.
- `users` SELECT has `Allow authenticated users to read all profiles → USING (true)`, so author/co-author names resolve via plain PostgREST joins — the 42P17 concern does not apply; no SECURITY DEFINER read RPC, no new policy.
- `facultyApi.getAssignedPapers()` is therefore a plain `from('research_papers').select(...).eq('faculty_id', <email-resolved id>)`; workload via client-side `summarizeFacultyWorkload()`. Faculty resolves its own profile (the student resolver rejects non-students).
- **Still to verify (Phase 5):** `approval_workflow` SELECT access for faculty (detail-view workflow history). The queue and dashboard do not need it.

---

## 5. Frozen files

**Touched (approved, additive only):**
- `src/navigation/AppNavigator.tsx` — add a `user.role === 'faculty'` branch rendering the faculty stack; convert the current `!== 'student'` check into explicit branches so other non-students still reach `UnsupportedRole`. Student screens/options unchanged.
- `src/navigation/types.ts` — add `FacultyTabs`, `FacultyReviewDetail` to `RootStackParamList` + a `FacultyTabsParamList`. Existing entries unchanged.

> **Guard lift (Phase 1):** the `.claude/settings.json` deny rules for these two files were removed to permit the approved edits. **Re-add them when `feat/faculty-access` merges** to re-freeze the navigation contract. All other frozen-file denies remain in place.

**Untouched (remain frozen):** `AuthContext.tsx`, `supabase.ts`, `src/auth/`, `authStorage.ts`, `domain.ts`, `SubmitResearchScreen.tsx`, deployed SQL snapshots.

---

## 6. New / modified files

| Path | Action | Notes |
|---|---|---|
| `src/navigation/AppNavigator.tsx` | modify (frozen, approved) | additive faculty branch |
| `src/navigation/types.ts` | modify (frozen, approved) | additive faculty routes |
| `src/navigation/FacultyTabs.tsx` | new | bottom tabs: Dashboard + Review |
| `src/screens/faculty/FacultyDashboardScreen.tsx` | new | workload + recents |
| `src/screens/faculty/FacultyReviewScreen.tsx` | new | queue: filters/search/status |
| `src/screens/faculty/FacultyReviewDetailScreen.tsx` | new | read-only detail + open-PDF |
| `src/api/faculty.ts` | new | `facultyApi` + faculty-only types |
| `docs/sql/faculty_access_rpcs.sql` | new | snapshot of the read RPC (after deploy) |

**Reused read-only (imported, never modified):** all `ui/` primitives (`Card`, `Chip`, `Button`, `Stat`, `EmptyState`, `Skeleton`, `InlineNotice`, `Surface`, `Badge`, `Divider`), `theme/*` tokens, and `researchApi` read helpers (`getResearchById`, `getResearchFile`, `getCategories`).

---

## 7. Phased plan

### Phase 0 — Branch + scaffold ✅ **COMPLETED (stable)**
**Implementation summary**
- Pre-branch checks: working tree clean (only untracked `.design-sync/`); `dev` @ `e141909`.
- Cut `feat/faculty-access` from `dev` (identical base, 0/0).
- Added this plan doc.
- Skeleton files deferred to their owning phases (created with real content rather than empty stubs).

**Exit criteria met:** branch exists at the correct base; plan doc in repo.

### Phase 1 — Faculty navigation surface ✅ **COMPLETED (stable)**
**Implementation summary**
- Role gate in `AppNavigator.tsx` branched into student / faculty / unsupported. Student routing relocated **unchanged**; dean/staff/admin still reach `UnsupportedRole`.
- `FacultyTabs` (Dashboard + Review) added in `src/navigation/FacultyTabs.tsx`, modeled on `StudentTabs` token styling.
- Faculty routes added to `navigation/types.ts` (`FacultyTabs`, `FacultyReviewDetail`, `FacultyTabsParamList`).
- Placeholder faculty screens (`FacultyDashboardScreen`, `FacultyReviewScreen`, `FacultyReviewDetailScreen`) using `EmptyState` + theme tokens; real content lands in Phases 3–5.
- `.claude/settings.json`: nav-file deny lifted to permit the approved edits (see §5).

**Exit criteria met:** `npx tsc --noEmit` green; faculty surface wired and isolated; no student-screen or shared-`ui/` edits.
⏳ Runtime check still pending on a dev build: faculty user → `FacultyTabs`; dean/staff → `UnsupportedRole`; student → unchanged.

### Phase 2 — Data layer (read-only) ✅ **COMPLETED (stable)**
**Implementation summary**
- Diagnosis (read-only Supabase MCP): existing deployed RLS already supports faculty reads — **no new SQL** (see §4). The planned `get_faculty_assigned_papers()` RPC is not needed.
- Added `src/api/faculty.ts`: self-contained `facultyApi.getAssignedPapers()` + `summarizeFacultyWorkload()` + faculty-only types (`FacultyAssignedPaper`, `FacultyWorkloadSummary`), with its own faculty profile resolver.
- `getReviewDetail()` deferred to **Phase 5** (pending the `approval_workflow` RLS check), where the detail screen is built.

**Exit criteria met:** `npx tsc --noEmit` green; faculty read path works under existing RLS with zero backend changes.

### Phase 3 — Faculty Dashboard ✅ **COMPLETED (stable)**
**Implementation summary**
- `FacultyDashboardScreen` rebuilt from placeholder: 2×2 workload `Stat` grid (`summarizeFacultyWorkload`), recent-assignments list (`PressableCard` → `FacultyReviewDetail`), loading (`Skeleton`) / empty (`EmptyState`) / error (`InlineNotice`) states, themed pull-to-refresh.
- Reads via `facultyApi.getAssignedPapers()`; theme tokens + `ui/` primitives only; no SQL.

**Exit criteria met:** `npx tsc --noEmit` green. Runtime check pending on a dev build.

### Phase 4 — Faculty Review queue ✅ **COMPLETED (stable)**
**Implementation summary**
- `FacultyReviewScreen` rebuilt from placeholder: filter pills (Needs Review / Revisions / Approved by You / All) with live counts (`Chip` filter variant), search over title/author/keywords, per-paper status badge (`Chip` status variant), `PressableCard` rows → `FacultyReviewDetail`, loading/empty/error states + pull-to-refresh.
- Extracted shared `src/screens/faculty/facultyStatus.ts` (status labels, badge tones, queue-filter buckets); the `approved` bucket reuses `FACULTY_ADVANCED_STATUSES` (now exported from `faculty.ts`) so the queue count matches the dashboard stat. Dashboard refactored onto `facultyStatusLabel`.

**Exit criteria met:** `npx tsc --noEmit` green. Runtime check pending on a dev build.

### Phase 5 — Faculty Review Detail (read-only) ✅ **COMPLETED (stable)**
**Implementation summary**
- Diagnosis (read-only Supabase MCP): `approval_workflow` SELECT is `USING (true)` and the `research-papers` storage bucket is publicly readable — workflow history + PDF open work for faculty with **no new SQL**.
- Added `facultyApi.getReviewDetail()` + `getReviewFile()` to `faculty.ts` (self-contained; the `researchApi` equivalents are student-gated).
- `FacultyReviewDetailScreen` rebuilt from placeholder: status badge, title/author/dept/date, revision/rejection notices, **Open PDF** (signed URL via `Linking`), abstract, keywords, review-history timeline (`Card` per `approval_workflow` entry), and a calm "review decisions coming later" notice. No action buttons.

**Exit criteria met:** `npx tsc --noEmit` green. Runtime check pending on a dev build.

### Phase 6 — Polish + handoff ✅ **COMPLETED (stable)**
**Implementation summary**
- Loading/empty/error states + pull-to-refresh present across dashboard, queue, and detail; `tsc` green across every phase.
- Handoff `HANDOFF_FAC_PHASE-5.md` drafted (supersedes Phase 1).
- **Outstanding (not code):** runtime verification on a dev build; re-freeze the nav files in `.claude/settings.json` at merge; then merge `feat/faculty-access → dev → main`.

---

## 7B. Phased plan — v2 (web parity: faculty write actions)

> Commit scope `faculty-access-v2`. Delivers the three faculty review decisions from the web
> product — **Approve, Request Revision, Reject**. Unlike v1 reads, writes re-enter the
> service-role problem, so each action is a **SECURITY DEFINER write RPC** mirroring web's
> exact transitions (§4). Notifications: **full in-app parity** (author + co-authors + next
> reviewer); email/push parity deferred (§8). **Declare-conflict is out of scope** — it is not
> a faculty-facing action in the web product.

### Phase 7 — Faculty review write RPCs (SQL) ✅ **COMPLETED (stable)**
**Implementation summary**
- Pre-flight read-only schema inspection confirmed exact columns/types/defaults on
  `research_papers`, `approval_workflow`, `notifications`, `research_authors`, `users`.
- Deployed (Christian-authorized, executed by Claude via Supabase MCP) and snapshotted to
  `docs/sql/faculty_access_rpcs.sql`:
  - `get_dean_chair_members()` — active dean/program_chair directory for the Approve picker
    (global, no department filter; `is_active = true` so suspended reviewers are excluded).
  - `faculty_approve_paper` / `faculty_request_revision` / `faculty_reject_paper` — SECURITY
    DEFINER writes that re-validate faculty identity (`auth.email()`), ownership (`faculty_id`),
    and the `status = 'pending_faculty'` gate; each mirrors the web transition, writes an
    `approval_workflow` event, and fans out in-app notifications.
  - `faculty_notify_paper_parties` — internal notify helper; default PUBLIC EXECUTE revoked.
- Verified live: all `SECURITY DEFINER`, grants correct, picker returns active deans/chairs.

**Exit criteria met:** RPCs deployed + verified; snapshot in `docs/sql/`; no new RLS policies needed.

### Phase 8 — Mobile API write methods ✅ **COMPLETED (stable)**
**Implementation summary**
- Added to `src/api/faculty.ts`: `FacultyApprover` type + `getDeanChairMembers`, `approvePaper`,
  `requestRevision`, `rejectPaper` — house-style `supabase.rpc(...)` with faculty-profile
  resolution and error propagation.

**Exit criteria met:** `npx tsc --noEmit` green.

### Phase 9 — Faculty review decision UI ✅ **COMPLETED (stable)**
**Implementation summary**
- `FacultyReviewDetailScreen`: replaced the "coming later" placeholder with Approve /
  Request Revision / Reject, shown only while `status = 'pending_faculty'`. Each opens a
  `BottomSheet`: Reject/Revision take a required note; Approve requires picking a dean or
  program chair (lazy-loaded via `getDeanChairMembers`) + an optional comment. Per-action
  loading, inline validation/error, and return-to-queue (`navigation.goBack()`) on success.
- Switched the faculty queue + dashboard from mount-only `useEffect` to `useFocusEffect` so
  they refresh on return.

**Exit criteria met:** `npx tsc --noEmit` green; runtime-verified by Christian on a dev build.

### Phase 10 — Polish + handoff ✅ **COMPLETED (stable)**
**Implementation summary**
- v2 write actions runtime-verified by Christian on a dev build (approve / request-revision /
  reject all work; status transitions, notifications, and return-to-queue confirmed).
- Loading / inline-validation / error states present across all three decision flows; `tsc`
  green at every v2 phase exit.
- Proposed a new GitHub issue for the **email + push notification parity gap** (Christian opens
  and assigns the number; current cap #8).
- Handoff `HANDOFF_FAC_PHASE-10.md` drafted (supersedes `HANDOFF_FAC_PHASE-5.md`).

**Outstanding (not code, Christian-gated):** at the eventual v2 merge — re-freeze `types.ts` +
`AppNavigator.tsx` in `.claude/settings.json`, then merge `feat/faculty-access → dev → main`.

**Exit criteria met:** v2 feature-complete and verified; plan + handoff current; remaining work is
the deferred email/push issue (§8) and the Christian-gated merge.

### Phase 11 — Shared in-app embedded PDF viewer (student + faculty) ✅ **COMPLETED (stable)**
**Cross-role note:** this feature spans **both** the student `ResearchDetailScreen` and the faculty
review detail, so it consciously **waives the plan's "don't modify student screens" coexistence rule**
(Christian's call; it arguably warranted its own branch but was folded into this undertaking). Tracked in **#10 (closed)**.

**Implementation summary**
- New shared `src/components/PdfViewer.tsx`: inline PDF panel (scroll/zoom) + fullscreen in-app modal;
  loading + error states with an "open in browser" fallback. Theme tokens / `ui/` only. Stable public API
  (`uri` / `onFirstLoad` / `height`) consumed unchanged by both screens.
- Faculty `FacultyReviewDetailScreen`: replaced the external `Linking.openURL` "Open PDF" with the inline
  `PdfViewer` (signed URL via `facultyApi.getReviewFile`).
- Student `ResearchDetailScreen`: replaced the `WebBrowser` open with the inline `PdfViewer` (signed URL
  via `researchApi.getResearchFile`); `trackView` now fires on the PDF's first successful render.

**Render engine — pivoted to WebView + pdf.js (the fix).** The first cut used `react-native-pdf` (+
`react-native-blob-util` to pre-download). On this app's RN 0.85 + New-Architecture build, **both native
HTTP downloaders fail before transferring a byte** (`Download interrupted`, 0% progress, every attempt),
while the system WebView loads the same signed URL fine — proving the failure was the *download*, not the
renderer (rn-pdf never received a file). Fix: `PdfViewer` now hosts **pdf.js inside a `react-native-webview`**,
fetching the signed URL through the WebView's own network stack (CORS `*`, `Accept-Ranges: bytes` → range-streamed,
not pre-downloaded). The pdf.js *library* loads from a pinned CDN (jsDelivr); the PDF bytes stay device ↔ Supabase
(no third-party document viewer). Commit `6c2ece9`.

**Runtime finding (EAS dev build, Android):** ✅ verified — a 65-page paper renders inline
(`[PdfViewer] rendered {pages: 65}`), the fullscreen modal works, and student `trackView` fires on first render.

**Follow-up (deferred, not blocking):** `react-native-pdf` + `react-native-blob-util` and their two `app.json`
config plugins are now dead code — remove them and fold the native drop into the next EAS build.

**Exit criteria met:** inline PDF renders reliably on a dev build for both roles; `tsc` green; #10 closed.
Faculty sign-out (separate, outside the phased plan) shipped.

---

## 7C. Phased plan — annotation viewing (#11)

> Commit scope `faculty-access`. Lets faculty toggle on prior reviewers' annotations over the PDF.
> **Read-only** and **zero new SQL** — the spike (2026-06-27) confirmed faculty read
> `research_comments` directly under the deployed RLS, and drawing PNGs sit in the public
> `research-papers` bucket so they load unsigned. Annotations are the web's meta-in-text envelope:
> `[[meta]]{json}[[/meta]]\n<note>`.

### Phase 12 — Annotation read path (data layer) ✅ **COMPLETED (stable)**
**Implementation summary**
- Read-only spike (Supabase MCP): the `research_comments` SELECT policy is
  `(NOT is_internal) OR privileged-by-auth.uid()`. The privileged branch is **dead** here (the
  project-wide `auth.uid()` UUID mismatch), but every annotation is `is_internal = false`, so faculty
  read all annotations directly — **no SECURITY DEFINER RPC, no new SQL.** Live data: 33 rows, 0
  internal, all meta-enveloped (5 draw / 14 note / 10 comment, 9 replies). Drawing PNGs are public.
- Added to `src/api/faculty.ts`: `FacultyAnnotation` + `FacultyAnnotationType` / `…Rect` / `…Point`
  types and `facultyApi.getAnnotations(paperId)` — a plain `research_comments` select plus a faithful
  port of the web meta parser (clamps %-coords, validates the draw-image URL, builds reviewer name).
  Carries page-less general comments and positioned annotations alike; replies via `parentId`.

**Exit criteria met:** `npx tsc --noEmit` green; faculty annotation read works under existing RLS.

### Phase 13 — Annotation overlays in the PDF viewer ✅ **COMPLETED (stable)**
**Implementation summary**
- Exported `PdfAnnotationOverlay` interface from `src/components/PdfViewer.tsx` (public prop type;
  calling code maps from `FacultyAnnotation` in Phase 14). Fields: `id`, `pageNumber | null`,
  `annotationType`, `highlightColor`, `highlightRects`, `anchorPercent`, `drawImageUrl`.
- HTML overlay infrastructure: pages now render inside `<div class="page-wrapper">` (position:
  relative) so overlays can be absolutely positioned. Three WebView-side functions injected via JS:
  `__buildOverlays(jsonStr)` — creates hidden overlay elements per annotation type (highlight rects
  as colored divs, note pins as circle divs, draw annotations as `<img>`), `__showAnnotations()`,
  `__hideAnnotations()`.
- `PdfSurface` gains `annotations?` + `showAnnotations?` props and a `webViewRef`. Two `useEffect`s:
  (1) when loaded+annotations change → inject `__buildOverlays` with positioned annotations; (2)
  when loaded+showAnnotations changes → inject show/hide command.
- `PdfViewer` gains `annotations?` prop + internal `showAnnotations` state (default `false`). Derives
  `hasPositionedAnnotations`; when true, renders an eye-icon toggle button next to the expand button
  (grouped in a `controls` row). Both inline and fullscreen `PdfSurface` receive `annotations` +
  `showAnnotations`. Student `ResearchDetailScreen` passes no `annotations` — toggle never appears.

**Exit criteria met:** `npx tsc --noEmit` green; additive optional prop; student screen unaffected.

### Phase 14 — Wire-up + polish ✅ **COMPLETED (stable)**
**Implementation summary**
- `FacultyReviewDetailScreen`: added `annotations` + `annotationsError` state; loads
  `facultyApi.getAnnotations(paperId)` on mount (parallel with detail + file). `useMemo` derives
  `overlays: PdfAnnotationOverlay[]` (mapped from `FacultyAnnotation`) and `pagelessAnnotations`
  (pageNumber === null, top-level). `getReplies(parentId)` filters reply threads.
- `<PdfViewer uri={fileUri} annotations={overlays} />` — the eye-icon toggle appears automatically
  once positioned annotations are available (driven entirely by Phase 13 infrastructure).
- New "Reviewer comments" section (between Review history and Your decision): skeleton while loading,
  error notice on failure, "No general reviewer comments." when empty, or `Card`-per-root-annotation
  list with hairline-separated replies nested inside. Uses `titleCase(ann.reviewerRole)` + `formatDate`.
- `annotationReply` style added (top border, gap, spacing).

**Exit criteria met:** `npx tsc --noEmit` green; loading/empty/error states present; positioned
annotations drive the PdfViewer toggle; page-less comments + replies surface in the list panel.
Runtime verification pending on next EAS dev build.

---

## 7D. Phased plan — additional faculty tabs (#12)

> Commit scope `faculty-access-v4`. Delivers the three remaining faculty tabs deferred since
> v1: **Notifications**, **Repository** (browse published papers), **Profile** (account info +
> sign out). **Zero new SQL** — verified live (read-only, 2026-06-30): `notifications`
> SELECT/UPDATE is role-agnostic (`user_id` = email-resolved `public.users.id`, no role check),
> and `research_papers` has a standalone `Public can read published papers` policy
> (`status = 'published'`, `TO public`) alongside the existing `Combined research read access`
> policy — both already cover faculty. Each new read goes through its own `facultyApi` function
> (mirrors the v1 pattern: the student facades `notificationsApi` / `researchApi.getPublishedPapers`
> hard-reject non-students via their own profile resolvers, so faculty cannot reuse them directly).
> Decisions confirmed with Christian: Repository paper taps open a new lightweight read-only
> **`FacultyPaperDetailScreen`** (not `FacultyReviewDetailScreen`, which is purpose-built for the
> assigned-review workflow); Profile shows minimal account info + sign out, and sign-out is
> relocated off the Dashboard header into Profile.

### Phase 15 — Data layer (read-only) ✅ **COMPLETED (stable)**
**Implementation summary**
- Added to `src/api/faculty.ts`: `getPublishedPapers` (reuses `FACULTY_PAPER_SELECT` /
  `toFacultyAssignedPaper`, just queries `status = 'published'` instead of `faculty_id`) and
  `getNotifications` / `markNotificationRead` / `markAllNotificationsRead` (faculty-resolved,
  mirrors `notificationsApi`'s row shape exactly via `NotificationItem` from `domain.ts`).
- Repository's paper-detail screen (Phase 18) will reuse the existing `getReviewDetail` /
  `getReviewFile` directly — both already query by `id` with no `faculty_id` filter, relying on
  RLS, so they work unmodified for any paper the signed-in faculty member can read (assigned or
  published). No separate `getPaperDetail` / `getPaperFile` needed.
- `getCategories` reused directly from `researchApi` (no role gate) — no faculty wrapper needed.

**Exit criteria met:** `npx tsc --noEmit` green; no new SQL; faculty reads published papers and
their own notifications under existing RLS.

### Phase 16 — Navigation surface ✅ **COMPLETED (stable)**
**Implementation summary**
- `navigation/types.ts` (frozen, approved-additive): added `FacultyRepository`,
  `FacultyNotifications`, `FacultyProfile` to `FacultyTabsParamList`; added
  `FacultyPaperDetail: { paperId: string }` to `RootStackParamList` (route registered in
  `AppNavigator.tsx` at Phase 18, once the real screen exists).
- `FacultyTabs.tsx`: wired the 3 new tabs + icons (`library-outline`, `notifications-outline`,
  `person-outline`) — 5 tabs total (Dashboard, Review, Repository, Notifications, Profile).
- 3 new placeholder screens (`FacultyRepositoryScreen`, `FacultyNotificationsScreen`,
  `FacultyProfileScreen`), modeled on the Phase-1 pattern: centered `EmptyState` + theme tokens,
  real content lands in Phases 17–19.
- **Process note:** the harness's auto-mode permission classifier blocked Edit/Write on
  `types.ts` despite the branch's own `.claude/settings.json` having no deny rule for it (Phase-1
  unfreeze intact at the project-config level) — a harness-level rule outside this repo.
  Christian applied the `types.ts` edit manually; classifier cleared on the next turn.

**Exit criteria met:** `npx tsc --noEmit` green; no student-screen or shared-`ui/` edits; faculty
nav surface is the full 5-tab shape.

### Phase 17 — Faculty Notifications screen ✅ **COMPLETED (stable)**
**Implementation summary**
- `FacultyNotificationsScreen` rebuilt from placeholder, ported from the student
  `NotificationsScreen` onto `facultyApi.getNotifications` / `markNotificationRead` /
  `markAllNotificationsRead`. Same UX: unread count, mark-all-read, mark-on-open, loading
  (`Skeleton`) / empty (`EmptyState`) / error (`InlineNotice`) states, themed pull-to-refresh.
- Reuses the shared `NotificationCard` + `ListEntranceItem` components read-only (both are
  role-agnostic — take a plain `NotificationItem`). Tapping a notification with a `research_id`
  navigates to **`FacultyReviewDetail`** (not the new `FacultyPaperDetail`) — faculty
  notifications are review-workflow events (assignment, return-for-revision, etc.), so the
  review-detail framing (history, decision UI) is the correct destination; `getReviewDetail`
  already resolves any paper the signed-in faculty member can read under RLS, assigned or not.

**Exit criteria met:** `npx tsc --noEmit` green. Runtime check pending on a dev build.

### Phase 18 — Faculty Repository + paper detail ✅ **COMPLETED (stable)**
**Implementation summary**
- `FacultyRepositoryScreen` rebuilt from placeholder, modeled on `FacultyReviewScreen`'s
  search+filter+`PressableCard` row layout (not the shared `ResearchCard`, which requires the
  frozen `domain.ResearchPaper` shape — `FacultyAssignedPaper` is a different, camelCase shape,
  so a thin inline row keeps the self-contained-facade convention rather than forcing an adapter).
  Category filter chips (`researchApi.getCategories`, no role gate) + search over title/author/
  keyword, reading `facultyApi.getPublishedPapers()`. Loading/empty/error states + pull-to-refresh.
- New `FacultyPaperDetailScreen`: read-only metadata + `PdfViewer` (no annotations prop, no
  review history, no decision actions) — reuses `facultyApi.getReviewDetail` / `getReviewFile`
  directly rather than new facade functions, since both already query by `id` alone (RLS-scoped,
  no `faculty_id` filter) and work unmodified for any paper the signed-in faculty member can read.
- `navigation/types.ts` (frozen, approved-additive) already had `FacultyPaperDetail` from Phase
  16; `AppNavigator.tsx` (frozen, approved-additive) now registers the `Stack.Screen`.
- Repository row taps navigate to `FacultyPaperDetail` (not `FacultyReviewDetail`) per the
  confirmed decision — keeps the review-workflow screen's framing reserved for actual assignments.

**Exit criteria met:** `npx tsc --noEmit` green; no student-screen or shared-`ui/` edits. Runtime
check pending on a dev build.

### Phase 19 — Faculty Profile + polish + handoff ✅ **COMPLETED (stable)**
**Implementation summary**
- New `FacultyProfileScreen`: account info from `useAuth().user` (name, email, role, department,
  program) in a `Card` with `Divider`-separated rows + a "Sign out" `Button` — single sign-out
  entry point now.
- `FacultyDashboardScreen`: removed the header `IconButton` sign-out + its now-unused `signOut`
  destructure.
- `npx tsc --noEmit` green across Phases 16–19; coexistence check confirmed (only nav files,
  `src/screens/faculty/`, and the plan doc differ — no student-screen or shared-`ui/` edits).

**Process note (this whole #12 effort, Phases 16–19):** the harness's auto-mode permission
classifier blocked Edit/Write on `types.ts` and `AppNavigator.tsx` even after explicit chat-based
authorization — it requires the change to flow through the branch's `.claude/settings.json`
unfreeze mechanism specifically, and that file already has the Phase-1 unfreeze in place (absence
of a deny entry). The classifier appears to read a static/cached rule set that doesn't reflect the
live per-branch override; Christian applied both nav-file diffs manually outside the tool, then
Claude verified via `tsc`.

**Exit criteria met:** all 4 sub-phases (16–19) `tsc`-green; faculty 5-tab nav surface (Dashboard,
Review, Repository, Notifications, Profile) complete. Runtime verification pending a dev build.

---

## 8. Deferred scope (beyond what v1 + v2 build)

- ✅ **Faculty write actions (Approve / Request Revision / Reject)** — **DELIVERED in v2**
  (Phases 7–9) as SECURITY DEFINER write RPCs mirroring web's transitions (§4), with full
  in-app notification parity (author + co-authors + next reviewer on approve). Declare-conflict
  is **dropped** (not a faculty-facing action in web).
- **Email + push notifications on review actions** (**#9**) — remaining parity gap. Web sends SMTP
  server-side; mobile cannot. To be implemented later **together with push** (DB trigger /
  edge function coordinated with web/backend).
- **Review depth** — in-app **embedded PDF viewer** (**#10**) ✅ **delivered** (Phase 11; cross-role) via WebView + pdf.js; #10 closed. Annotation **viewing** (**#11**) is the recommended next step: the web stores annotations in `research_comments` (meta-in-text — `annotationType` of `comment`/`note`/`draw`, %-based `highlightRects` / `anchorPercent`, and a flattened-PNG `drawImageUrl` for drawings). Mobile **view-only** (a "See annotations" toggle, default off) is feasible because coords are percentage-based and drawings are pre-rendered images — no stroke/coordinate replication. **Spike done (2026-06-27): faculty read `research_comments` directly under RLS (all annotations non-internal) and drawing PNGs are public — no RPC/SQL.** Now in progress under §7C (Phase 12 read path landed).
- ✅ **Additional faculty tabs (#12)** — **DELIVERED** (v4, §7D, Phases 15–19): Repository
  (browse published papers + new `FacultyPaperDetailScreen`), Notifications, and Profile
  (account info + relocated sign-out). Zero new SQL. Runtime verification on a dev build pending.
- **Other non-student roles** — dean, program_chair, staff, admin surfaces. (Outside current mobile product scope; not yet tracked as an issue.)

---

## 9. Constraints

- `npx tsc --noEmit` green at every phase exit (non-negotiable).
- **Zero hardcoded colors/spacing** — only theme tokens + `ui/` primitives, so faculty inherits the UX remodel at merge.
- **Never modify** a shared `ui/` component or any student screen; faculty code is additive and self-contained under `src/screens/faculty/` + `src/api/faculty.ts`. (**Exception — Phase 11:** the cross-role `PdfViewer` consciously touches the student `ResearchDetailScreen`; Christian-approved, see §7B Phase 11.)
- **No service role**, ever. Anon + RLS + SECURITY DEFINER read RPC only.
- **SQL discipline:** read-only/additive only this round; pre-flight brief → Christian deploys → snapshot to `docs/sql/`. No write/destructive ops in v1.
- `domain.ts` untouched; faculty types live in `faculty.ts`.
- Commits staged specifically, presented for review; no Co-Authored-By trailer.

---

## 10. Verification

- **Per phase:** `npx tsc --noEmit` green.
- **Phase 1:** faculty user → `FacultyTabs`; dean/staff → still `UnsupportedRole`; student → unchanged (regression check).
- **Phase 2:** read RPC returns exactly the caller's assigned papers (verify with a faculty test account; a different faculty account sees a disjoint set; non-faculty caller gets zero rows). Validated without service role.
- **Phases 3–5:** on a real dev build, dashboard counts match the queue; filters/search behave; detail shows metadata + workflow history and opens the PDF.
- **Coexistence:** diff confirms no student screen or shared `ui/` component changed; outside `src/screens/faculty/`, `src/api/faculty.ts`, `src/navigation/FacultyTabs.tsx`, only the two approved frozen nav files differ from `dev`.
