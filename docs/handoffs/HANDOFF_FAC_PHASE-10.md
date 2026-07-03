---
undertaking: "Faculty Access"
phase: "10 (v2 write actions feature-complete)"
date: 2026-06-24
branch: feat/faculty-access
last_commit: "feat(faculty-access-v2): add faculty review decision UI"
status: in-progress
---

# NUcleus Mobile — Session Handoff Context (Faculty Access, Phase 10)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`). **Faculty Access v2 — faculty write actions** is
**feature-complete and runtime-verified** on branch `feat/faculty-access` (off `dev`, sibling to the
parked `feat/ux-remodel`). Faculty can now Approve / Request Revision / Reject papers awaiting their
review, on top of the read-only v1 surface (dashboard, queue, review detail, Open-PDF).

**Canonical docs:**
- `docs/plans/FACULTY_ACCESS.md` — the plan. §7 (v1 Phases 0–6) + §7B (v2 Phases 7–10) + §8 (deferred). Read first.
- `docs/sql/faculty_access_rpcs.sql` — deployed snapshot of the v2 write RPCs.
- `CLAUDE.md` — Undertaking Registry routes "resume faculty access" here; stable architecture invariants.

**Headline:** v1 reads needed zero backend changes; v2 writes re-entered the service-role problem and were
delivered as **SECURITY DEFINER write RPCs** mirroring the web transitions — no service role, anon + RLS only.

---

## Parallel undertakings

- ✅ **Submit Research** — complete (merged → `main`).
- ⏸️ **UX Remodel** — parked on `feat/ux-remodel`. Untouched. Faculty uses only shared tokens/`ui/` primitives so it absorbs the remodel at merge.

---

## Faculty Access status

Branch `feat/faculty-access`, off `dev`.

- ✅ Phases 0–6 — read-only v1 (nav surface, data layer, dashboard, queue, review detail, polish) — verified, committed
- ✅ Phase 7 — v2 write RPCs (SQL) deployed + snapshotted
- ✅ Phase 8 — mobile API write methods (`src/api/faculty.ts`)
- ✅ Phase 9 — review decision UI (`FacultyReviewDetailScreen`) + queue/dashboard focus-refresh
- ✅ Phase 10 — polish + this handoff

**v2 scope delivered:** Approve / Request Revision / Reject. **Declare-conflict dropped** (not a faculty-facing
action in web). **DEFERRED (§8):** email + push notifications on actions, in-app PDF rendering, annotations,
extra faculty tabs, other non-student roles.

---

## What Changed Since HANDOFF_FAC_PHASE-5

> PHASE-5 left v2 as "next: build the write actions." That is now done. This handoff supersedes it.

### Faculty write actions delivered (✅ verified)
- **SQL (Phase 7):** deployed four functions (briefed, Christian-authorized, executed by Claude via Supabase MCP),
  snapshot in `docs/sql/faculty_access_rpcs.sql`. Each write RPC re-validates faculty identity (`auth.email()`),
  ownership (`faculty_id`), and the `status = 'pending_faculty'` gate before mutating — mirrors the web column
  writes exactly (approve sets `dean_chair_id` + routes to `pending_dean`/`pending_program_chair`; revision sets
  `revision_notes`/`last_reviewer_role`/`previous_status`; reject sets `rejection_reason`). Each writes one
  `approval_workflow` event and fans out **full in-app notification parity** (author + co-authors + next reviewer
  on approve).
- **API (Phase 8):** `facultyApi.getDeanChairMembers`, `approvePaper`, `requestRevision`, `rejectPaper` + the
  `FacultyApprover` type.
- **UI (Phase 9):** decision buttons + `BottomSheet` flows on the review detail, shown only while
  `pending_faculty`; approve requires a dean/chair pick; per-action loading + inline validation/error;
  **return-to-queue** on success.

### Faculty queue + dashboard now refresh on focus
- Switched both from mount-only `useEffect` to `useFocusEffect` so returning after an action reflects the new
  status/counts (without this, "return to queue" showed stale data until a manual pull-to-refresh).

### Plan doc now tracks every phase
- `FACULTY_ACCESS.md` updated with §7B (v2 Phases 7–10) and a revised §8. (Process correction: plan doc must
  reflect committed phases, not lag behind.)

---

## Critical Architectural Context (session-specific)

> Stable invariants (UUID mismatch, email-based RLS, SECURITY DEFINER pattern) live in `CLAUDE.md`. New nuances this session:

- **Write RPCs gate on `status = 'pending_faculty'` inside the function**, not just in the UI — the UI only *shows*
  the actions for that status, but the server re-checks, so a stale client cannot double-act.
- **`approval_workflow.status` has a CHECK** limiting it to `pending|approved|rejected|revision_required`. The
  human-readable verb (`approve`/`reject`/`request_revision`) goes in the free-text `action_type` column.
- **`faculty_notify_paper_parties` is intentionally NOT callable by anon/authenticated** — Postgres grants
  EXECUTE to PUBLIC by default on new functions, so that default grant was explicitly **REVOKED**. The three
  review RPCs call it as the function owner (SECURITY DEFINER), so internal calls are unaffected.
- **Email/push parity gap:** web sends SMTP server-side on each action; mobile cannot. v2 ships in-app
  notifications only. This is a deferred follow-up (new issue), to be implemented later *together with* push.

---

## Supabase

### New RPCs (Phase 7) — all SECURITY DEFINER, `SET search_path = public`
- `get_dean_chair_members()` — `LANGUAGE sql STABLE`; active `dean`+`program_chair` directory for the Approve picker (global, `is_active = true`). Granted anon/authenticated.
- `faculty_approve_paper(p_paper_id uuid, p_target_user_id uuid, p_target_role text, p_comments text)` — `pending_faculty` → `pending_dean`/`pending_program_chair`. Granted anon/authenticated.
- `faculty_request_revision(p_paper_id uuid, p_notes text)` — → `revision_required`. Granted anon/authenticated.
- `faculty_reject_paper(p_paper_id uuid, p_reason text)` — → `rejected`. Granted anon/authenticated.
- `faculty_notify_paper_parties(...)` — internal notify fan-out helper; **PUBLIC EXECUTE revoked** (owner-only).

### RLS / policies / storage
No new policies. The write RPCs bypass RLS via SECURITY DEFINER (same as `create_co_author_invitations`). v1 read
policies and the `research-papers` storage bucket are unchanged.

---

## Open Issues

Unchanged: **#5, #6, #8 open** (none touch faculty). **Current cap: #8.**

**Proposed (Christian to open):** *"faculty review actions: email + push notifications not sent (web sends SMTP
server-side; mobile in-app only)"* — `enhancement`, `mobile`, `backend`. Body drafted in the Phase 10 session.
Would become #9 once opened.

---

## Current Git State

Branch `feat/faculty-access` — working tree clean except untracked `.design-sync/` and `.claude/worktrees/`
(neither is ours; do not stage). All branches local only — **pushes held by Christian.**

**Intended branch workflow:** `feat/faculty-access → dev → main`.

---

## Commit History (most recent first)

```
f8842db feat(faculty-access-v2): add faculty review decision UI
6d99afd feat(faculty-access-v2): add faculty review write API methods
a1b7547 feat(faculty-access-v2): add faculty review action RPC snapshot
b1f8307 docs(faculty-access-v2): mark v1 verified; open v2 (web parity)
24f507e docs(handoff): add HANDOFF_FAC_PHASE-5; close read-only v1
03cbb41 feat(faculty-access): build faculty review detail screen
```
(This handoff + the §7B/§10 plan-doc update ride in the next `docs(faculty-access-v2): …` commit.)

---

## Immediate Next Steps

1. **Open the email/push parity GitHub issue** (Christian; body drafted this session) — it becomes the home for
   the deferred SMTP + push work.
2. **Deferred scope (plan §8), when prioritized:** in-app PDF rendering, then annotations; extra faculty tabs
   (Notifications, Repository, Profile); other non-student roles (dean, program_chair, staff, admin).
3. **At the v2 merge (Christian's explicit call, after absolute parity):** re-freeze `src/navigation/types.ts` +
   `src/navigation/AppNavigator.tsx` in `.claude/settings.json`, then merge `feat/faculty-access → dev → main`
   (Christian owns pushes).
