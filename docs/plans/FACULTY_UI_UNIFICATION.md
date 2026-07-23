# Faculty UI Unification + Review Cluster — Plan

**Status:** Draft — awaiting Christian's approval (entry gate, CLAUDE.md Rule 8)
**Date:** 2026-07-07
**Priority:** Unification first; review cluster (#9, #11, #14, #15) after it merges. A4 (first-run onboarding, #47) deferred behind this work.

---

## Why

Faculty screens predate the A-pillar redesign. Students got the full DESIGN.md treatment (floating blur tab bar with sliding-spring pill, shared `TopBar` bell, `Screen` wrapper, motion primitives — PRs #39–#44, #53–#55). Faculty still runs a stock `createBottomTabNavigator` bar, hand-rolled screen headers, and a duplicate repository screen. Both roles must look identical (CONVENTIONS §10: "no surface gets a parallel set of conventions").

## Decisions (confirmed 2026-07-07)

- **No FAB for faculty.** Student keeps the gold Submit FAB; faculty gets a plain 4-tab bar.
- **Faculty tabs: Home, Review, Browse, Profile.** Review replaces the student's My Papers slot.
- **Browse is literally the same screen.** Both roles look at the same repository — faculty reuses student `BrowseScreen`, not a styled copy. `FacultyRepositoryScreen` retires.
- **Notifications stay behind the TopBar bell** (student Activity pattern). The Notifications tab retires.

---

## Workstream A — UI unification (one branch: `feat/faculty-ui-unification`)

### Current state (investigated)

| Surface      | Student                                                                                                                          | Faculty today                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Tab bar      | Custom `StudentTabBar.tsx`: floating blurred pill bar, spring indicator (`cubic-bezier(.34,1.3,.4,1)`, 420ms), gold gradient FAB | Stock bottom bar: opaque surface, hairline top border, active-dot (`FacultyTabs.tsx:29-56`) |
| Header/bell  | Shared `TopBar` (+ `hero` variant) → `Activity` screen                                                                           | Hand-rolled `<Text>` title rows per screen; Notifications is a whole tab                    |
| Repository   | `BrowseScreen` (pull-to-refresh explore, FlatList, recent searches)                                                              | Separate `FacultyRepositoryScreen`                                                          |
| Screen frame | `Screen` wrapper everywhere                                                                                                      | Already adopted (OK)                                                                        |

### Steps

1. **Extract shared `FloatingTabBar` primitive** from `StudentTabBar.tsx` (blur pill + `navBlurTarget` wiring + spring-indicator + tab items; FAB as an optional slot). `StudentTabBar` becomes a thin config: 4 tabs + Submit FAB. New `FacultyTabBar`: same primitive, 4 tabs, no FAB. Prevents future drift (the exact failure mode PR #54 fixed once, for one bar).
2. **Rewire `FacultyTabs.tsx`** (not frozen): tabs = `FacultyDashboard` ("Home"), `FacultyReview` ("Review"), `FacultyRepository` ("Browse") **with component swapped to shared `BrowseScreen`**, `FacultyProfile` ("Profile"). Drop the `FacultyNotifications` tab registration. Frozen `FacultyTabsParamList` needs **no edit** — unused keys are harmless; route names stay valid.
   - Tab icons follow student `TAB_META` outline/filled pairs; Review gets a review-appropriate pair (e.g. `checkmark-done-circle-outline`/`-filled` or `document-text-outline`/`document-text`) — final pick eyeballed against `docs/design/mockup.html`.
3. **Role-aware paper navigation in `BrowseScreen.tsx`**: the single `navigation.navigate('ResearchDetail', { paperId })` call (`BrowseScreen.tsx:420`) branches on `useAuth().user.role` → faculty goes to `FacultyPaperDetail` (route already in frozen `RootStackParamList` — no frozen edit).
4. **Bell parity for faculty**: register `Activity` under the faculty branch of `AppNavigator.tsx` (route name already typed). Make `useActivityCount` + `ActivityScreen` role-aware: faculty = notifications only via `facultyApi.getNotifications`/`markNotificationRead`/`markAllNotificationsRead` (no invitations concept). `FacultyNotificationsScreen` content folds in; file retires.
   - ⚠️ `AppNavigator.tsx` is on the frozen list. Adding the faculty `Activity` stack screen requires a **branch-scoped unfreeze** of that one entry in the branch's `.claude/settings.json` (sanctioned by CLAUDE.md Frozen Files: "a branch that owns navigation changes unfreezes the navigation files"). Session-critical core stays frozen.
5. **Retrofit `TopBar`** onto `FacultyDashboardScreen` (hero variant + greeting, matching student Dashboard), `FacultyReviewScreen`, `FacultyProfileScreen`. Logic (workload grid, queue filters, sign-out card) untouched — chrome only.
6. **Delete** `FacultyRepositoryScreen.tsx`, `FacultyNotificationsScreen.tsx` after their replacements land.
7. **Gates**: `npx tsc --noEmit`, `npm test`, ui-ux-pro-max React Native audit (Rule 9), eyeball against `docs/design/mockup.html`. PR → main.

### Out of scope for A

- Any review-flow behavior change (annotations, decisions) — Workstream B.
- `DESIGN.md` gains a short "Faculty tabs" note (same bar, no FAB, Review slot) so the spec stays the single source of truth.

---

## Workstream B — Faculty review cluster (after A merges)

### #15 — verify annotation overlays (dean/program-chair returns)

No code expected (issue's own analysis: RLS read path already correct). Manual-QA checklist item; needs a test paper that completed a post-faculty review cycle. Close on verification.

### #11 — annotation threads on papers

Reading path already delivered (faculty-access-v3 Phases 12–14: `facultyApi.getAnnotations()` + `PdfViewer` overlays + comments section). Verify against acceptance criteria, then close or fold the remaining gap ("create" half) into #14.

### #14 — annotation creation write path ← main build

Faculty add page-anchored **sticky notes** to the PDF during review. Scope is
notes-only by decision (2026-07-08): web intentionally removed freehand-draw and
highlight-select from its annotation UI (`ae038e1`) and now only creates
page-anchored `note` annotations, so mobile builds **only** the sticky-note path
— no in-app drawing, no highlight-selection.

- Write to `research_comments` using web's meta envelope: `[[meta]]{json}[[/meta]]\n<note>` with `annotationType: 'note'`, `pageNumber`, and `anchorPercent` (%-of-page point)
- **No storage write path** (no drawing PNGs). The read-path `draw`/`highlight` overlay rendering in `PdfViewer` stays as-is for backward-compat with any historical web annotations — we drop _creation_ of those types, not display of existing ones.
- Needs INSERT RLS policy or SECURITY DEFINER RPC on `research_comments` — **SQL gate (Rule 3): plain-language brief → Christian approves → deploy via MCP → snapshot in `docs/sql/`**
- UI: tap-to-place a note pin on the PDF page across the WebView bridge (simpler than text-selection/draw capture)
- Own branch: `feat/faculty-annotation-write`

### #9 — email/push on review actions

- **Push**: Expo push — token registration on mobile, `notifications` insert trigger or edge function to dispatch. Server side runs privileged → SQL/edge-function gate (Rule 3).
- **Email**: must match web SMTP templates without double-send when web also acts — needs web/backend coordination (issue's own constraint). Not solvable mobile-only.
- Own branch: `feat/review-push-notifications`; email tracked with web team.

### Order

A → #14 → #9 (push first, email pending coordination) → #11/#15 closed via verification alongside.

---

## Standing context

- Recent design-relevant merges: #53 (TopBar bell consolidation + hero variant), #54 (navbar blurTarget + transparent bar), #55 (Roboto single typeface).
- `docs/PROJECT_CONTEXT.md` is **outdated** (still says faculty out-of-scope, 5-tab student model, student-only product). Update it as part of Workstream A's PR to reflect: faculty role fully in scope, current tab models for both roles, Activity screen, faculty review flows.
