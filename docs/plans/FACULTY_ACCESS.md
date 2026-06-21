# NUcleus Mobile — Implementation Plan: Faculty Access (Read-Only v1)

> **STATUS: IN PROGRESS** — Branch `feat/faculty-access`, cut from `dev` (sibling to `feat/ux-remodel`).
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
- The faculty queue needs author display names — joining `research_papers` → `public.users` from an anon/RLS context hits the **42P17 recursion trap**. The established fix is a **SECURITY DEFINER read RPC**.
- **Plan:** `get_faculty_assigned_papers()` — `SECURITY DEFINER`, `SET search_path = public`, `GRANT EXECUTE TO anon, authenticated`; resolves caller via `auth.email()` → `public.users.id`; returns papers where `faculty_id = <resolved id>` plus author display fields, in one shot. Workload stats computed **client-side** from this result (as web does), so no separate workload RPC.
- Review detail reuses `researchApi.getResearchById` **if** current RLS permits faculty to read a single assigned paper + workflow history; **if RLS blocks it**, add a parallel SECURITY DEFINER detail read. Confirmed by the Phase 2 RLS verification — not assumed.
- **Diagnosis-first:** before writing any SQL, verify what `research_papers` SELECT RLS currently grants the authenticated path (brief Christian; read-only SELECT/EXPLAIN via Supabase MCP). The web's sample faculty policy uses `auth.uid() = faculty_id`, which **fails here** (UUID mismatch) — so a working faculty read almost certainly does not exist yet.

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

### Phase 2 — Data layer (read-only) ⏳ **NOT STARTED**
- ⏳ Brief Christian → verify deployed `research_papers` SELECT RLS for the authenticated path.
- ⏳ Author + deploy `get_faculty_assigned_papers()` (+ detail read path only if needed); snapshot to `docs/sql/faculty_access_rpcs.sql`.
- ⏳ Build `facultyApi.getAssignedPapers()` / `getReviewDetail()` + faculty types. `tsc` green.

### Phase 3 — Faculty Dashboard ⏳ **NOT STARTED**
- ⏳ Workload stats (client-computed) + recent assigned papers using `Stat`/`Card`/`Surface` + tokens. Loading/empty/error states.

### Phase 4 — Faculty Review queue ⏳ **NOT STARTED**
- ⏳ Filterable list (Needs Review / Revisions / Approved by You / All), search, status chips, navigate to detail — mirroring the web queue's information model with `Card`/`Chip`/`EmptyState`/`Skeleton`.

### Phase 5 — Faculty Review Detail (read-only) ⏳ **NOT STARTED**
- ⏳ Metadata + workflow history (reuse `researchApi.getResearchById`) + open-PDF (reuse `researchApi.getResearchFile`).
- ⏳ **No action buttons**; calm affordance that review decisions are coming later. (In-app PDF + annotations remain deferred.)

### Phase 6 — Polish + handoff ⏳ **NOT STARTED**
- ⏳ Empty/loading/error pass, accessibility, final `tsc` gate, draft handoff (`HANDOFF_FAC_*`).

---

## 8. Deferred scope (in the plan, not built in v1)

- **Faculty write actions** — approve / reject / request-revision / declare-conflict, each a **SECURITY DEFINER write RPC** mirroring web's exact transitions (§4); in-app notifications only. **Email-on-action parity is a known gap** (web sends SMTP server-side; mobile cannot — would need a DB trigger / edge function coordinated with the web/backend, out of mobile scope).
- **Review depth** — in-app PDF rendering (read-only viewer), then annotation threads (needs annotation RPCs/RLS + touch UI). v1 is metadata + open-PDF only.
- **Additional faculty tabs** — Notifications, Repository (browse published), Profile.
- **Other non-student roles** — dean, program_chair, staff, admin surfaces.

---

## 9. Constraints

- `npx tsc --noEmit` green at every phase exit (non-negotiable).
- **Zero hardcoded colors/spacing** — only theme tokens + `ui/` primitives, so faculty inherits the UX remodel at merge.
- **Never modify** a shared `ui/` component or any student screen; faculty code is additive and self-contained under `src/screens/faculty/` + `src/api/faculty.ts`.
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
