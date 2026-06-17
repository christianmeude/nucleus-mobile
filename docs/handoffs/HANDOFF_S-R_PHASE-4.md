---
undertaking: "Submit Research"
phase: "4"
date: 2026-06-15
branch: feat/submit-research
last_commit: "fix(submit-research): Phase 3 partial fixes — SDK 56 compat, co-author merge, workflow"
status: in-progress
---

# NUcleus Mobile — Session Handoff Context (Submit Research Phase 4)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`) is on a stable post-migration, post-UI-overhaul, post-SDK-56 baseline with mobile Submit Research on branch `feat/submit-research`. Phases 1–3 are complete and stable. Phase 4 (validation and merge readiness) is next.

**Canonical docs:**
- `docs/plans/SUBMIT_RESEARCH.md` — active plan with phase status markers
- `docs/sql/` — deployed SQL snapshots
- `docs/CONVENTIONS.md` — all process conventions

---

## What Changed Since HANDOFF_S-R_PHASE-3B.md

### `create_co_author_invitations` RPC — ambiguous column bug fixed (✅ deployed)

`42702` error: `invitee_id` in the EXISTS predicate collided with the `RETURNS TABLE(invitee_id uuid)` output variable name. PostgreSQL resolved to the output var, not the table column — making the check a tautology and silently blocking all invitation creation. Fixed with `cai.` table alias. Also updated: notification now includes paper title; leaner DECLARE block.

Snapshot updated: `docs/sql/co_author_invitations_rpcs.sql`

### `public.users` open SELECT for authenticated — deployed (✅ resolves #7)

New policy: `"Allow authenticated users to read all profiles"` — `USING (true)` for `authenticated` role. Enables cross-user author name resolution in `PAPER_SELECT structured_authors` join. Christian approved open SELECT approach (appropriate for a closed university app).

Snapshot created: `docs/sql/users_rls_policies.sql`

### `research_authors` DELETE policy — deployed (✅)

`"Students can delete research_authors for own papers"` — email-resolved owner DELETE. Required for resubmit web parity: mobile now deletes non-primary co-author rows on resubmission so prior invitees can be re-invited fresh.

### `research_authors` invitee INSERT timing fix — deployed (✅)

Updated `"Invitees can insert own research_authors row on accept"` to check `status IN ('pending', 'accepted')` instead of only `'pending'`. The accept flow updates status before the `research_authors` insert, so the old policy always rejected the insert.

### Co-author upsert removed from submit; DELETE added for resubmit (✅ in working tree)

`submitResearch` in `src/api/research.ts`: removed at-submit co-author row upsert (co-author rows are created on invitation accept, not submit). Added DELETE of non-primary rows before the primary author upsert on resubmission.

### `research_authors` invitee INSERT policy self-join bug — fixed (✅ deployed)

The `WITH CHECK` on the invitee INSERT policy had `cai.research_id = cai.research_id` (column vs. itself — always true), removing the paper-scope check. Fixed to `cai.research_id = research_authors.research_id`. Snapshot updated in `docs/sql/research_authors_rls_policies.sql`. Validated by Christian.

### Manually validated by Christian (✅)

- Invitations and notifications reach invitees after mobile submit
- Co-authored papers appear in invitee My Papers after accepting
- Co-author chips show correct names (not the current user's name)
- Author names resolve correctly in ResearchDetail and Browse

---

## Critical Architectural Context

> Stable invariants (UUID mismatch, email-based RLS, SECURITY DEFINER pattern) live in `CLAUDE.md`. Only session-specific updates here.

### `public.users` is now open-read for authenticated sessions

As of this session, authenticated users can read all `public.users` rows. This resolves the cross-user author display gap. The anon role still only reads own row. No code changes required — `PAPER_SELECT` author join now resolves correctly.

### Co-author row lifecycle (clarified)

- Submit → only primary author row is upserted
- On resubmit → non-primary rows are deleted (fresh invitation slate)
- Invitation accept → invitee `research_authors` row inserted (best-effort, `respondToInvitation`)
- Co-author rows never inserted at submit time for invitees

---

## Open Issues

- 🔴 #5 — `Browse: category filter shows unresolved UUIDs` — backend/data; not a Submit Research blocker
- 🔴 #6 — `Browse: add toggleable list and tile view` — enhancement; post-undertaking
- 🔴 #7 — `ResearchDetail / Browse: author name shows "Unknown"` — ✅ fix deployed this session (open SELECT on `public.users`)
- 🔴 #8 — `ResearchDetail: Download button always visible` — UI mitigation shipped; backend column pending

**Current cap: #8. Do not invent issue numbers beyond #8.**

> Note: #7 fix is deployed but the issue itself has not been formally closed on GitHub. Consider closing it in Phase 4.

---

## Open Backend Tasks (not blocking Phase 4 start)

- **`submission_drafts` partial unique misalignment** — `onConflict: 'user_id,paper_id'` doesn't match `uq_submission_drafts_user_null_paper` when `paper_id IS NULL`; causes duplicate constraint warn on autosave; non-blocking.
- **`get_research_paper_ids_for_invitee`** — deployed during debugging; unused by mobile; candidate for cleanup.
- **Malfoy duplicate auth.users** — `c2e20fd8` (`malfoydevera@students.nu-dasma-edu.ph`); clean up via Supabase Auth admin panel when convenient.

---

## Current RLS Policy State (Supabase)

Snapshot files in `docs/sql/`. All use email-based resolution unless noted.

| Table | Policies |
|---|---|
| `public.users` | SELECT (self by email); SELECT (all for authenticated) |
| `research_papers` | See migration-era snapshot |
| `research_authors` | SELECT (open, anon); INSERT (owner); UPDATE (owner); INSERT (invitee, post-accept); DELETE (owner, for resubmit) |
| `co_author_invitations` | SELECT (invitee, email-resolved); UPDATE (invitee, email-resolved); INSERT (inviter, simple — superseded by RPC) |
| `submission_drafts` | SELECT/INSERT/UPDATE/DELETE (author-scoped, email-resolved) |
| `research_categories` | SELECT (open, anon) |
| `departments` | SELECT (open, anon) |
| `system_policy_settings` | SELECT (open, anon) |

---

## Supabase RPCs

All SECURITY DEFINER, `SET search_path = public`, `GRANT EXECUTE TO anon, authenticated`.

| RPC | Purpose | Snapshot |
|---|---|---|
| `increment_view_count(row_id uuid)` | increments `research_papers.view_count` | migration snapshot |
| `increment_download_count(row_id uuid)` | increments `research_papers.download_count` | migration snapshot |
| `get_user_basic_info(user_id uuid)` | cross-user profile read for invitation display | migration snapshot |
| `get_faculty_members(p_department text, p_department_id uuid)` | faculty directory for adviser picker | `submit_research_rpcs.sql` |
| `search_students(p_query text)` | co-author search | `submit_research_rpcs.sql` |
| `create_co_author_invitations(p_research_id uuid, p_invitee_ids uuid[])` | post-submit invitation creation; handles ownership, eligibility, token, notification | `co_author_invitations_rpcs.sql` |
| `get_research_paper_ids_for_invitee(p_invitee_id uuid)` | debug artifact; unused by mobile | none |

---

## Current Git State

Branch: `feat/submit-research` — working tree has uncommitted changes (all from this session).

**Modified (uncommitted):**
- `docs/sql/co_author_invitations_rpcs.sql` — RPC fix history and updated function body
- `docs/sql/research_authors_rls_policies.sql` — DELETE policy added
- `src/api/research.ts` — resubmit DELETE + removed at-submit co-author upsert
- `docs/plans/SUBMIT_RESEARCH.md` — Phase 3 closed
- `docs/handoffs/HANDOFF_S-R_PHASE-4.md` — this file (new)

**Untracked (new this session):**
- `docs/sql/users_rls_policies.sql` — `public.users` SELECT policies snapshot

**Intended branch workflow:**
```
feat/submit-research → dev → main
```

---

## Commit History (most recent first)

```
e9e6c10 (HEAD -> feat/submit-research) fix(submit-research): Phase 3 partial fixes — SDK 56 compat, co-author merge, workflow
8cbe770 chore(deps): upgrade to Expo SDK 56 and fix RN 0.85 type break
0162740 Merge branch 'chore/workflow-overhaul' into feat/submit-research
118c9b4 chore(workflow): introduce Claude Code workflow — CLAUDE.md, settings, CONVENTIONS
75ba909 docs: update PROJECT_CONTEXT and README to reflect submit research scope
```

---

## Immediate Next Steps

1. **Commit this session's working tree** — files staged specifically; commit message below
2. **Begin Phase 4** — validation and merge readiness:
   - Frozen-layer diff: confirm no frozen files were modified
   - Parity checklist: verify all matrix rows from `SUBMIT_RESEARCH_PARITY_MATRIX.md` are accounted for
   - Close GitHub issue #7 (author display fix is deployed)
   - Final `npx tsc --noEmit` pass
   - Merge-readiness check: branch diff vs. `dev`, no stray debugging artifacts
3. **Close Phase 4** and merge `feat/submit-research → dev`
