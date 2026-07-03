---
undertaking: "Submit Research"
phase: "3B"
date: 2026-06-13
branch: feat/submit-research
last_commit: "chore(deps): upgrade to Expo SDK 56 and fix RN 0.85 type break"
status: in-progress
---

# NUcleus Mobile — Session Handoff Context (Submit Research Phase 3B)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`) is on a stable post-migration, post-UI-overhaul, post-SDK-56 baseline with mobile Submit Research functional on branch `feat/submit-research`. Phases 1 and 2 are complete and stable. Phase 3 (cross-system parity verification) is in progress with an active regression: mobile submission invitations and notifications are not reaching invitees. Phase 4 (validation and merge readiness) has not started.

**Canonical docs in the repo:**
- `docs/PROJECT_CONTEXT.md` — product identity, audience, navigation, domain types, principles
- `docs/CONVENTIONS.md` — all process conventions (commits, phase protocol, issues, SQL, handoffs)
- `docs/plans/SUBMIT_RESEARCH.md` — active Submit Research implementation plan
- `docs/plans/SUBMIT_RESEARCH_PARITY_MATRIX.md` — Phase 1 parity artifact (frozen contract v1)
- `docs/sql/` — deployed SQL snapshots

**GitHub repo:** `christianmeude/capstone-nucleus-rn`

---

## Active Regression (top priority)

### Invitation + notification not reaching invitee after mobile submit — 🔴 UNRESOLVED

**Observed:** Christian Unknown submitted a paper via mobile and invited Malfoy De Vera. The invitation and notification did not appear for Malfoy. This is the core Phase 3 parity requirement — it worked at some earlier point and regressed during Phase 3 work.

**Context clues:**
- Christian's own account already has accepted and pending invitations that were NOT created from this mobile session — likely created by a web colleague working on the web version. This suggests the web invite flow is functional and the invitations table has live data.
- The regression appears mobile-specific. Either (a) the `create_co_author_invitations` RPC call is silently failing and returning `{ created: 0 }`, or (b) the RPC inserts the row but Malfoy's SELECT policy on `co_author_invitations` is not returning it to him.

**Strongest hypothesis:** The pre-existing SELECT policy on `co_author_invitations` (deployed before this undertaking, not in our snapshots) may use `auth.uid()` directly to scope rows to the invitee. Due to the UUID mismatch (auth.users.id ≠ public.users.id), Malfoy's `auth.uid()` would not match `invitee_id` in any row, so he sees nothing. This is exactly the same class of bug as Issue #2 (UUID mismatch).

**Investigation needed (first action in new session):**
1. Use Supabase MCP to check whether `co_author_invitations` rows were actually inserted for the test submission (query by `research_id` or `inviter_id`).
2. Inspect the SELECT policy on `co_author_invitations` — confirm whether it uses `auth.uid()` or email-based resolution.
3. If rows exist but Malfoy can't see them: fix the SELECT policy to use email-based resolution.
4. If rows don't exist: the RPC call itself is failing — check RPC logs or re-test with MCP.

**Do not proceed to other SQL deploys until this is diagnosed and fixed.**

---

## What Changed Since HANDOFF_S-R_PHASE-3.md

### File read error (Gap 7) — ✅ RESOLVED in working tree

**Root cause:** SDK 56 upgrade changed `expo-file-system` — `ExpoFsFile` is no longer available in the same form. The previous `readSubmitFileBodyForUpload` used `new ExpoFsFile(fileUri)` on native which broke under SDK 56.

**Fix applied:** `readSubmitFileBodyForUpload` in `src/api/research.ts` was rewritten to use `fetch()` uniformly across web and native. The `ExpoFsFile` import and `Platform` import were removed entirely. This is already in the working tree (uncommitted).

**Status:** Resolved. No further action needed.

---

### Cross-user author display (#7) — ✅ DECISION MADE, SQL pending

**Decision:** Option A — open `public.users` SELECT policy (`USING (true)`). Christian explicitly approved this approach. University student directory context makes this appropriate; it avoids a significant code restructure.

**SQL to deploy (not yet deployed):**

```sql
-- First: check Supabase dashboard for any existing restrictive SELECT policy on public.users
-- and drop it by name if one exists:
-- DROP POLICY IF EXISTS "<existing policy name>" ON public.users;

CREATE POLICY "anon and authenticated can read all users"
ON public.users
FOR SELECT
USING (true);
```

**Status:** Unresolved — SQL not yet deployed. Supabase MCP is now configured (see below) and should be used to deploy this after Christian approves.

---

### research_authors invitee INSERT timing — ✅ SQL drafted, pending deploy

**Root cause:** The deployed `research_authors` invitee INSERT policy checks `cai.status = 'pending'`, but `respondToInvitation` in `invitations.ts` updates status to `'accepted'` *before* the `research_authors` upsert runs. The policy always rejects the invitee insert.

**Fix drafted:** Drop old policy, replace with version that checks `cai.status IN ('pending', 'accepted')`.

**SQL to deploy (not yet deployed):**

```sql
DROP POLICY IF EXISTS "Invitees can insert own research_authors row on accept" ON public.research_authors;

CREATE POLICY "Invitees can insert own research_authors row on accept"
ON public.research_authors
FOR INSERT
WITH CHECK (
  user_id = (
    SELECT u.id FROM public.users u
    WHERE u.email = auth.email()
  )
  AND EXISTS (
    SELECT 1 FROM public.co_author_invitations cai
    WHERE cai.research_id = research_id
      AND cai.invitee_id = (
        SELECT u.id FROM public.users u
        WHERE u.email = auth.email()
      )
      AND cai.status IN ('pending', 'accepted')
  )
);
```

**Snapshot file:** `docs/sql/research_authors_rls_policies.sql` — already updated in working tree to reflect the new policy text.

**Status:** Unresolved — SQL not yet deployed.

---

### Supabase MCP — ✅ configured, workflow rule updated

**What changed:** Christian explicitly granted Claude Code Supabase MCP access. Token is in `C:\Users\Christian\.claude\settings.json` under `mcpServers.supabase`. CLAUDE.md Rule #3 and `docs/CONVENTIONS.md` §7 were both updated to reflect the new workflow: brief first in plain terms, wait for Christian's approval, then execute. Destructive operations require extra explanation. Test/read-only queries shown to Christian first.

**Important:** The Supabase MCP only loads at session start. If `mcp__supabase__*` tools are not present in the tool list, the MCP did not load — do not proceed with SQL execution, fall back to presenting SQL for manual deploy.

---

### co_author_invitations RPC snapshot — ✅ written

**What changed:** `docs/sql/co_author_invitations_rpcs.sql` was created this session, documenting the deployed `create_co_author_invitations(p_research_id uuid, p_invitee_ids uuid[])` SECURITY DEFINER RPC. This file is **untracked** and needs to be committed.

---

### CLAUDE.md + CONVENTIONS.md updates — ✅ done

**What changed:** CLAUDE.md Rule #3 rewritten to reflect Supabase MCP access and the brief-first workflow. `docs/CONVENTIONS.md` §7 SQL ownership updated to match. Both files are **uncommitted**.

---

## Open Issues

- 🔴 #5 — `Browse: category filter shows unresolved UUIDs — categories not loading` — backend/data; not a Submit Research blocker
- 🔴 #6 — `Browse: add toggleable list and tile view` — enhancement; post-undertaking
- 🔴 #7 — `ResearchDetail / Browse: author name shows "Unknown" for non-uploaders` — fix decided (open SELECT on `public.users`); SQL not yet deployed
- 🔴 #8 — `ResearchDetail: Download button always visible — no allow_download column` — UI mitigation shipped; backend column still pending

**Current cap: #8. Do not invent issue numbers beyond #8.**

---

## Current RLS Policy State (Supabase)

All policies use email-based resolution unless noted. See `docs/sql/` snapshots for definitions.

- `submission_drafts` — four author-scoped policies (SELECT, INSERT, UPDATE, DELETE)
- `research_categories` — open anon SELECT
- `departments` — open anon SELECT
- `system_policy_settings` — open anon SELECT
- `research_authors` — open SELECT (`USING (true)`); INSERT for paper owner; UPDATE for paper owner; INSERT for invitee (**currently broken** — `status = 'pending'` check; SQL fix above not yet deployed)
- `co_author_invitations` — SELECT for invitee; UPDATE for invitee; INSERT for inviter (simple, superseded by RPC)
- `public.users` — **no open SELECT policy yet** — fix SQL above not yet deployed; cross-user reads blocked until then

---

## Supabase RPCs

All SECURITY DEFINER. All `SET search_path = public`. All `GRANT EXECUTE TO anon, authenticated`.

- `increment_view_count(row_id uuid)` — increments `research_papers.view_count`
- `increment_download_count(row_id uuid)` — increments `research_papers.download_count`
- `get_user_basic_info(user_id uuid)` — cross-user profile read; used by `invitations.ts`
- `get_faculty_members(p_department text, p_department_id uuid)` — faculty directory; snapshot: `docs/sql/submit_research_rpcs.sql`
- `search_students(p_query text)` — co-author search; snapshot: `docs/sql/submit_research_rpcs.sql`
- `create_co_author_invitations(p_research_id uuid, p_invitee_ids uuid[])` — post-submit invitation creation; snapshot: `docs/sql/co_author_invitations_rpcs.sql`
- `get_research_paper_ids_for_invitee(p_invitee_id uuid)` — deployed during debugging, not used by any mobile code; candidate for cleanup

---

## Current State of the Codebase

### Design system

- `src/theme/` — `colors`, `typography`, `spacing`, `shadows`, `radii`, `motion`, `index`
- Fonts: Outfit for all UI chrome; Lora for paper title in `ResearchDetail` only
- Token consumption via direct `import { theme } from '../theme'` — no `useTheme()` hook

### Component system

- `src/components/ui/` — `Surface`, `Card`, `PressableCard`, `Button`, `Chip`, `Badge`, `Stat`, `IconButton`, `EmptyState`, `Skeleton`, `InlineNotice`, `BottomSheet`, `Divider`, `Logo`, `OrbitalAccent`
- `src/components/` — `ResearchCard`, `NotificationCard`, `InvitationCard`, `PaperStatusChip`, `ListEntranceItem`

### API facades (current state)

- `src/api/research.ts` — `researchApi` (read paths) + `submitApi` (submit paths). `loadResearchRows` now merges primary-authored and co-authored papers. `createCoAuthorInvitations` calls the `create_co_author_invitations` RPC. `readSubmitFileBodyForUpload` uses `fetch()` uniformly (ExpoFsFile removed). All changes uncommitted.
- `src/api/invitations.ts` — `respondToInvitation` now attempts a best-effort `research_authors` upsert on accept (try/catch, non-blocking). Uncommitted.
- `src/api/notifications.ts` — unchanged

### Frozen files (do not touch without explicit plan scope)

- `src/context/AuthContext.tsx`
- `src/lib/supabase.ts`
- `src/auth/*`
- `src/storage/authStorage.ts`
- `src/types/domain.ts`
- `src/navigation/types.ts`
- `src/navigation/AppNavigator.tsx`
- `src/screens/main/SubmitResearchScreen.tsx`
- `docs/sql/submit_research_rpcs.sql`
- `docs/sql/submit_research_rls_policies.sql`

### Field-level gotchas

- `ResearchPaper.structured_authors` — `author` may be null if cross-user `public.users` RLS blocks the join (issue #7); resolves once the open SELECT policy is deployed
- `SubmitDraftFormState.coAuthors: string` is the **external notes string**, not the structured co-author list; structured co-authors live in `selectedCoAuthors: StudentSearchResult[]`
- `submission_drafts` `onConflict: 'user_id,paper_id'` — misaligned with partial unique when `paper_id IS NULL`; causes duplicate constraint warn on autosave; non-blocking

---

## Current Git State

Branch: `feat/submit-research` — working tree has uncommitted changes.

**Modified (uncommitted):**
- `M CLAUDE.md` — Rule #3 updated to reflect Supabase MCP access
- `M docs/CONVENTIONS.md` — §7 SQL ownership updated to match
- `M src/api/invitations.ts` — `research_authors` upsert on invitation accept
- `M src/api/research.ts` — co-author merge in `loadResearchRows`; RPC refactor in `createCoAuthorInvitations`; `fetch()`-based `readSubmitFileBodyForUpload`

**Untracked:**
- `docs/sql/co_author_invitations_rpcs.sql` — snapshot of deployed `create_co_author_invitations` RPC
- `docs/sql/research_authors_rls_policies.sql` — snapshot of all 4 `research_authors` RLS policies (updated to reflect pending timing fix)
- `docs/sql/co_author_invitations_rls_policies.sql` — snapshot of all 3 `co_author_invitations` RLS policies

**Intended branch workflow:**
```
feat/submit-research → dev → main
```

---

## Commit History (most recent first)

```
8cbe770 (HEAD -> feat/submit-research) chore(deps): upgrade to Expo SDK 56 and fix RN 0.85 type break
0162740 Merge branch 'chore/workflow-overhaul' into feat/submit-research
118c9b4 chore(workflow): introduce Claude Code workflow — CLAUDE.md, settings, CONVENTIONS
75ba909 docs: update PROJECT_CONTEXT and README to reflect submit research scope
190b25e docs(conventions): expand and standardize convention files
db798ac fix(submit-research): unblock anon+RLS with RPCs, policies, and app wiring
99fe58f feat(submit-research): implement Phase 2 submission flow
266c57b docs(submit-research): complete phase 1 parity contract freeze
```

---

## Immediate Next Steps

1. **Verify Supabase MCP loaded** — check that `mcp__supabase__*` tools are present at session start. If not, the MCP did not load — do not proceed with SQL execution this session; investigate the config and retry.

2. **Diagnose invitation regression (top priority)** — use Supabase MCP to:
   a. Query `co_author_invitations` for rows created by the test submission (filter by Christian Unknown's `inviter_id` or the test paper's `research_id`). Brief Christian on the query before running.
   b. Inspect the SELECT policy on `co_author_invitations` — confirm whether `invitee_id` is matched against `auth.uid()` (broken due to UUID mismatch) or email-based resolution.
   c. Fix the SELECT policy if it uses `auth.uid()` — replace with email-based resolution per project convention. Brief Christian, get approval, deploy.

3. **Deploy SQL fix — `research_authors` invitee INSERT timing** — after regression is resolved: brief Christian, get approval, then run the DROP + CREATE POLICY from the "research_authors invitee INSERT timing" section above.

4. **Deploy SQL fix — open `public.users` SELECT** — brief Christian, get approval, then run the CREATE POLICY. Check for and drop any existing restrictive SELECT policy on `public.users` first.

5. **Run `npx tsc --noEmit`** — confirm green.

6. **Commit all working-tree changes** — stage specific files, draft message, present for Christian's approval.

7. **Formally close Phase 3** — write closure block in `docs/plans/SUBMIT_RESEARCH.md`.

8. **Begin Phase 4** — validation and merge readiness.
