---
undertaking: "Faculty Access"
phase: "1"
date: 2026-06-21
branch: feat/faculty-access
last_commit: "feat(faculty-access): scaffold faculty navigation surface"
status: in-progress
---

# NUcleus Mobile — Session Handoff Context (Faculty Access, Phase 1)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`). **Faculty Access (read-only v1)** is in progress on branch `feat/faculty-access` (cut from `dev`, sibling to the parked `feat/ux-remodel`). Phases 0–1 are complete and committed; **Phase 2 (data layer, read-only) is next**. This undertaking opens the app's student-only foundation to a separate, isolated faculty surface.

**Canonical docs:**
- `docs/PROJECT_CONTEXT.md` — product identity, navigation, principles
- `docs/CONVENTIONS.md` — process conventions
- `docs/plans/FACULTY_ACCESS.md` — **the active plan** (scope, the service-role→RPC translation in §4, phased plan, deferred scope). Read this; Phase 2 detail lives there.

**Resume:** this repo now uses **parallel undertakings** routed by name — "resume faculty access" loads this undertaking via the Undertaking Registry in `CLAUDE.md`. See "Workflow change" below.

---

## Previous / parallel undertakings

- ✅ **Submit Research** — complete (merged → `main`).
- ⏸️ **UX Remodel** — parked on `feat/ux-remodel` (Phase 1 done; Phase 2 blocked on a design-architecture decision). Do not disturb. Faculty must keep using shared tokens/`ui/` primitives so it absorbs the remodel at merge.

---

## Faculty Access status

Branch `feat/faculty-access`, off `dev`.

- ✅ Phase 0 — Branch + scaffold (branch cut; plan doc added)
- ✅ Phase 1 — Faculty navigation surface
- ⏳ Phase 2 — Data layer (read-only) ← **next**
- ⏳ Phase 3 — Faculty Dashboard
- ⏳ Phase 4 — Faculty Review queue
- ⏳ Phase 5 — Faculty Review Detail (read-only)
- ⏳ Phase 6 — Polish + handoff

**Scope reminder (v1):** read-only. Faculty get `FacultyTabs` (Dashboard + Review) + a read-only `FacultyReviewDetail`. DEFERRED: all write actions (approve/reject/revision/conflict), in-app PDF rendering, annotations, extra tabs, other non-student roles. See plan §3 / §8.

---

## What changed this session (the FAC delta)

### Workflow change — parallel undertakings (committed to `dev`, propagated to all branches)
The Session Opening Protocol in `CLAUDE.md` was rewritten from a single fixed pointer to an **Undertaking Registry** (name → short → branch → plan) + undertaking-routed resume. `CONVENTIONS.md` §9 now names handoffs by short code and updates registry `Status` at close. **Git worktrees** were set up for parallel work, then **removed** to focus on Faculty Access in the single `capstone-nucleus-rn` folder (branch-switching for now). The worktree workflow stays documented in `CLAUDE.md` for future parallel undertakings (new worktrees start without `node_modules` — `npm install` per worktree). Obsolete local branches were pruned (submit-research, ui-overhaul, eas-dev-build, workflow-overhaul, parallel-undertakings) — all were fully merged; `origin/feat/ui-overhaul` still exists remotely.

### Phase 0 — Branch + scaffold ✅
Cut `feat/faculty-access` from `dev`; added `docs/plans/FACULTY_ACCESS.md`.

### Phase 1 — Faculty navigation surface ✅
- `AppNavigator.tsx` role gate branched into **student / faculty / unsupported** (student routing relocated **unchanged**; dean/staff/admin still reach `UnsupportedRole`).
- `src/navigation/FacultyTabs.tsx` (new) — bottom tabs Dashboard + Review, modeled on `StudentTabs` token styling.
- `navigation/types.ts` — added `FacultyTabs`, `FacultyReviewDetail`, `FacultyTabsParamList`.
- `src/screens/faculty/` (new) — placeholder Dashboard/Review/ReviewDetail screens (`EmptyState` + theme tokens); real content in Phases 3–5.

---

## Critical architectural context (session-specific)

> Stable invariants (UUID mismatch, email-based RLS, SECURITY DEFINER pattern) live in `CLAUDE.md` — not repeated here.

### The core porting fact (drives Phase 2)
The **web** faculty workflow runs server-side via an Express backend using the **`SERVICE_ROLE_KEY`** (bypasses RLS). Mobile is anon-key + RLS only, so every faculty data path must be re-expressed in mobile-safe primitives. For v1 reads: the faculty queue needs author display names, and joining `research_papers` → `public.users` from an RLS context hits the **42P17 recursion trap** → the fix is a **SECURITY DEFINER read RPC** (`get_faculty_assigned_papers()`), not a direct query. Full transition reference for later write phases is in plan §4.

### Frozen-file guard lifted (MUST re-freeze at merge)
`.claude/settings.json` deny rules for `src/navigation/types.ts` + `AppNavigator.tsx` were **removed** (Christian-approved) so the additive faculty branch could be written. All other frozen-file denies remain. **Action at merge:** re-add these two files' deny rules when `feat/faculty-access` merges, to re-freeze the navigation contract. Tracked in plan §5.

---

## Supabase

No RLS, RPC, or schema changes this session. **Phase 2 will require** (pre-flight brief → Christian deploys → snapshot to `docs/sql/faculty_access_rpcs.sql`):
1. A read-only diagnosis: verify what `research_papers` SELECT RLS currently grants the authenticated path (the web's sample faculty policy uses `auth.uid() = faculty_id`, which fails here due to the UUID mismatch — so a working faculty read almost certainly does not exist yet).
2. `get_faculty_assigned_papers()` SECURITY DEFINER read RPC (resolve caller via `auth.email()` → `public.users.id`; return assigned papers + author display fields). Workload stats computed client-side from this result.
3. Confirm whether faculty can read a single paper's detail + workflow history under current RLS; if not, add a parallel SECURITY DEFINER detail read.

---

## Open issues

Unchanged this session. Open: #5 (Browse category UUIDs), #6 (Browse list/tile), #8 (ResearchDetail download column). **Current cap: #8. Do not invent issue numbers beyond #8.** (None of these touch faculty.)

---

## Current git state

Branch `feat/faculty-access` — working tree clean except untracked `.design-sync/` (unrelated design tooling; do not stage). All branches local only — **pushes held by Christian.**

**Commit history (most recent first):**
```
9f40159 (HEAD -> feat/faculty-access) feat(faculty-access): scaffold faculty navigation surface
295196a chore(perms): lift nav-file freeze for faculty access
fe05bab Merge branch 'dev' into feat/faculty-access
d014c27 docs(plans): add Faculty Access read-only v1 plan
5fd73df (dev) Merge branch 'chore/parallel-undertakings' into dev
ef5bf1e chore(workflow): route session opening by undertaking
```

**Branch workflow:** `feat/faculty-access → dev → main` (forward-merge `dev` in to pick up shared workflow changes; all local).

---

## Immediate next steps

1. **(Optional) Runtime-verify Phase 1** on a dev build/emulator: faculty user → `FacultyTabs`; dean/staff → `UnsupportedRole`; student → unchanged.
2. **Phase 2 — Data layer (read-only):**
   - Brief Christian, then run read-only test queries to verify `research_papers` SELECT RLS for the authenticated path.
   - Draft `get_faculty_assigned_papers()` SECURITY DEFINER read RPC; Christian deploys; snapshot to `docs/sql/faculty_access_rpcs.sql`.
   - Build `src/api/faculty.ts` (`facultyApi.getAssignedPapers()` / `getReviewDetail()`) + faculty-only types (in `faculty.ts`, not `domain.ts`). `tsc` green.
3. **(Christian-owned)** all pushes; Supabase SQL deploys.
4. **(At merge, later)** re-add the two nav-file deny rules in `.claude/settings.json`.
