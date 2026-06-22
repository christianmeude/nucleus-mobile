---
undertaking: "Faculty Access"
phase: "5 (read-only v1 feature-complete)"
date: 2026-06-22
branch: feat/faculty-access
last_commit: "feat(faculty-access): build faculty review detail screen"
status: in-progress
---

# NUcleus Mobile — Session Handoff Context (Faculty Access, Phase 5)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`). **Faculty Access — read-only v1** is **feature-complete** on branch `feat/faculty-access` (cut from `dev`, sibling to the parked `feat/ux-remodel`). Phases 0–5 are done and committed; Phase 6 (polish + handoff) is this close-out. Faculty now have an isolated surface — navigation, dashboard, review queue, and a read-only review detail — built entirely on shared tokens/`ui/` primitives.

**Canonical docs:**
- `docs/plans/FACULTY_ACCESS.md` — the active plan (scope, the §4 RLS diagnosis, phased plan, deferred scope). Read this first.
- `CLAUDE.md` — Undertaking Registry routes "resume faculty access" here.

**Headline result:** the entire read-only v1 (data + all four screens) ships with **zero backend changes** — the existing deployed RLS and storage policies already permit every faculty read (see Critical Context).

---

## Parallel undertakings

- ✅ **Submit Research** — complete (merged → `main`).
- ⏸️ **UX Remodel** — parked on `feat/ux-remodel` (Phase 1 done; Phase 2 blocked on a design decision). Untouched. Faculty used only shared tokens/primitives so it absorbs the remodel at merge.
- Worktrees were used this session then **removed** — single-folder (`capstone-nucleus-rn`) for now; the worktree workflow stays documented in `CLAUDE.md` for future parallel undertakings.

---

## Faculty Access status

Branch `feat/faculty-access`, off `dev`.

- ✅ Phase 0 — Branch + scaffold
- ✅ Phase 1 — Faculty navigation surface (`FacultyTabs` + `FacultyReviewDetail`; role gate branched)
- ✅ Phase 2 — Data layer (`src/api/faculty.ts`: `getAssignedPapers` + `summarizeFacultyWorkload`)
- ✅ Phase 3 — Faculty Dashboard (workload `Stat` grid + recent assignments)
- ✅ Phase 4 — Faculty Review queue (filter pills + search + status badges; shared `facultyStatus.ts`)
- ✅ Phase 5 — Faculty Review Detail (metadata + workflow history + Open PDF; `getReviewDetail`/`getReviewFile`)
- ⏳ Phase 6 — Polish + handoff ← this close-out

**Scope (v1):** read-only. DEFERRED (plan §8): all write actions (approve/reject/revision/conflict), in-app PDF rendering, annotations, extra faculty tabs, other non-student roles.

---

## Critical architectural context (session-specific)

### The big finding — no backend changes needed
The web faculty workflow runs server-side under the **service role**; mobile is anon + RLS only. Three read-only Supabase MCP checks this session confirmed the **existing deployed policies already cover every faculty read**, so **no RPC, no policy, no SQL** was written:
- `research_papers` SELECT (`Combined research read access`) is email-resolved and grants faculty assigned rows: `faculty_id = (SELECT id FROM users WHERE email = auth.email())`, any status.
- `users` SELECT — `Allow authenticated users to read all profiles` = `USING (true)` → author/co-author/reviewer names resolve via plain joins (no 42P17 issue).
- `approval_workflow` SELECT — `USING (true)` → review-history timeline readable.
- `storage.objects` — `research-papers` bucket has public/authenticated SELECT → faculty can sign/open PDFs.

> If write actions are built later (v2), they re-enter the service-role problem and **will** need SECURITY DEFINER write RPCs mirroring the web transitions in plan §4 (plus an email-on-action parity gap — mobile can't send SMTP).

### Faculty code is self-contained
- `src/api/faculty.ts` resolves its **own** faculty profile — `researchApi`'s reads call `resolveCurrentStudentProfile()` which throws for non-students, so they are NOT reusable.
- `src/screens/faculty/facultyStatus.ts` holds shared status labels/tones + queue-filter buckets; the `approved` bucket reuses `FACULTY_ADVANCED_STATUSES` (exported from `faculty.ts`) so the queue count matches the dashboard stat.

### Frozen-file guard lifted (MUST re-freeze at merge)
`.claude/settings.json` deny rules for `src/navigation/types.ts` + `AppNavigator.tsx` were **removed** (Christian-approved) for the additive faculty gate branch. **Re-add them when `feat/faculty-access` merges.** All other frozen-file denies remain.

---

## Supabase
No RLS/RPC/schema/storage changes were made — only three read-only catalog inspections (`pg_policies`). Nothing to deploy. Snapshot files in `docs/sql/` unchanged.

## Open issues
Unchanged: #5, #6, #8 open (none touch faculty). **Current cap: #8.**

---

## Current git state
Branch `feat/faculty-access` — working tree clean except untracked `.design-sync/` and `.claude/worktrees/` (neither is ours; do not stage). All branches local only — **pushes held by Christian.**

**Faculty commits (newest first):**
```
03cbb41 feat(faculty-access): build faculty review detail screen
0923556 feat(faculty-access): build faculty review queue
7ea9dcb feat(faculty-access): build faculty dashboard screen
ea7073b feat(faculty-access): add read-only faculty data facade
a80dc93 docs(handoff): add HANDOFF_FAC_PHASE-1
9f40159 feat(faculty-access): scaffold faculty navigation surface
295196a chore(perms): lift nav-file freeze for faculty access
d014c27 docs(plans): add Faculty Access read-only v1 plan
```
Branch workflow: `feat/faculty-access → dev → main` (all local).

---

## Immediate next steps

1. **Runtime verification on a dev build** (the one outstanding gate; needs a device/emulator):
   - Sign in as faculty → lands in `FacultyTabs`; dashboard counts match the queue; queue filters/search work; detail shows metadata + workflow history; **Open PDF** opens a paper.
   - Regression: dean/staff/admin → `UnsupportedRole`; student → unchanged.
2. **Re-freeze** the two nav files in `.claude/settings.json` when merging.
3. **Merge** `feat/faculty-access → dev → main` once verified (Christian owns pushes).
4. **(Optional clean-up, deferred)** archive/prune completed-undertaking handoffs (`S-R_*`, `U-O_*`).
5. **(Future v2)** faculty write actions — service-role-equivalent via SECURITY DEFINER write RPCs (plan §4/§8), in-app PDF + annotations, other roles.
