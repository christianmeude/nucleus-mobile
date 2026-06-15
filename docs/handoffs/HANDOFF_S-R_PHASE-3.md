# NUcleus Mobile — Session Handoff Context (Submit Research Phase 3 In Progress)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`) is on a stable post-migration, post-UI-overhaul baseline, with **mobile Submit Research** functional on branch `feat/submit-research`. Phases 1 and 2 are complete and stable. Phase 3 (cross-system parity verification) is actively in progress: several co-author and invitation gaps were discovered and addressed, but two blockers remain unresolved before Phase 3 can formally close. Phase 4 (validation and merge readiness) has not started.

**Canonical docs in the repo:**
- `docs/PROJECT_CONTEXT.md` — product identity, audience, navigation, domain types, principles
- `docs/PRODUCT_ROADMAP.md` — UX and design direction reference
- `docs/plans/SUPABASE_MIGRATION.md` — migration history and SQL/RLS policy reference
- `docs/plans/UI_OVERHAUL.md` — UI execution baseline (completed)
- `docs/plans/SUBMIT_RESEARCH.md` — active Submit Research implementation plan
- `docs/plans/SUBMIT_RESEARCH_PARITY_MATRIX.md` — Phase 1 parity artifact (frozen contract v1)
- `docs/CONVENTIONS.md` — all process conventions (commits, phase protocol, issues, SQL, handoffs)
- `docs/sql/submit_research_rpcs.sql` — deployed snapshot of submit-research RPCs
- `docs/sql/submit_research_rls_policies.sql` — deployed snapshot of submit-research RLS policies
- `docs/sql/research_authors_rls_policies.sql` — deployed snapshot of `research_authors` RLS policies (untracked, needs commit)
- `docs/sql/co_author_invitations_rls_policies.sql` — deployed snapshot of `co_author_invitations` RLS policies (untracked, needs commit)

**GitHub repo:** `christianmeude/capstone-nucleus-rn`

---

## What Changed Since HANDOFF_S-R_PHASE-2.md

> Every delta since Phase 2 close, including Supabase changes made outside the codebase.

### Phase 3 parity investigation — co-author and invitation gaps

Several gaps were discovered during Phase 3 manual validation. Each is documented below with root cause, fix applied, and remaining status.

#### Gap 1 — Co-author not appearing in ResearchDetail (✅ partial fix deployed)

**Root cause (layer 1):** `research_authors` had no RLS policies at all. The table had RLS enabled but zero policies, blocking all anon reads. This caused the `PAPER_SELECT` `structured_authors` join to return empty arrays regardless of data.

**Root cause (layer 2):** Even with a SELECT policy in place, the nested `author:users!research_authors_user_id_fkey` join in `PAPER_SELECT` is blocked by cross-user `public.users` RLS. Each user can only read their own `public.users` row; reading another user's row returns null. So `structured_authors` entries show `author: null`, and `toStructuredAuthorEntry` maps null to no display name.

**Fix applied:** `research_authors` SELECT policy deployed (open read, `USING (true)`); three additional policies deployed (see SQL section). Layer 2 (cross-user `public.users` RLS) is **still unresolved** — this is the same issue tracked as GitHub issue #7.

#### Gap 2 — Co-authored papers not showing in invitee's My Papers (✅ fixed, builder — uncommitted)

**Root cause:** `getMyPapers` called `loadResearchRows` which only filtered by `author_id = profile.id`. Co-authored papers where the student is listed in `research_authors` with `is_primary = false` were entirely invisible.

**Fix applied:** Builder updated `loadResearchRows` in `src/api/research.ts` with a two-query approach: query 1 fetches primary-authored papers; query 2 fetches `research_authors` rows for the current user where `is_primary = false`, then fetches those paper IDs via `.in('id', coAuthorIds)`; results are merged and deduped by paper id before returning. Change is **uncommitted**.

#### Gap 3 — research_authors row not inserted on invitation accept (✅ fixed, builder — uncommitted)

**Root cause:** `acceptInvitation` in `invitations.ts` called `respondToInvitation` which only updated `co_author_invitations.status = 'accepted'` and `responded_at`. No `research_authors` row was inserted for the accepting invitee. The web backend's `acceptCoAuthorInvitation` handler inserts this row as part of the accept flow; mobile had no equivalent.

**Fix applied:** Builder added a best-effort `research_authors` upsert block after the status update in `respondToInvitation`, gated to `status === 'accepted'`. Mirrors the web handler exactly: loads the invitation to get `research_id`, checks for an existing author row, queries max `author_order`, inserts with `is_primary: false`. Entire block is wrapped in try/catch — accept flow is never blocked by a failed upsert. Change is **uncommitted**.

**RLS note:** The `research_authors` INSERT policy for invitees requires `status = 'pending'` on the matching `co_author_invitations` row. Because the status update happens before the `research_authors` insert, the row is already `accepted` at insert time, which fails the policy check. The upsert is expected to be swallowed silently by RLS for the invitee case; only the paper owner's INSERT policy succeeds unconditionally. This is a known limitation: the `research_authors` row for accepted co-authors will only appear after the paper owner's next `research_authors` upsert (e.g., on resubmit), or when a christian-owned SQL fix widens the invitee INSERT policy to allow post-accept inserts.

#### Gap 4 — co_author_invitations INSERT failing from mobile (✅ fixed via RPC — uncommitted)

**Root cause:** `createCoAuthorInvitations` in `research.ts` attempted a direct INSERT into `co_author_invitations` under the anon key. There was no INSERT policy on this table, causing the operation to fail silently with an RLS violation warn. Multiple policy deployments attempted:
1. A policy with `research_papers` subquery caused infinite recursion (`42P17`) because `research_papers` has a co-author read condition referencing `co_author_invitations`.
2. A simple policy (`inviter_id = email-resolved id`) was deployed but still failed with "new row violates row-level security" for reasons that could not be confirmed through static analysis.

**Final fix:** Deployed `create_co_author_invitations(p_research_id uuid, p_invitee_ids uuid[])` SECURITY DEFINER RPC. This function bypasses RLS entirely, resolves the inviter from `auth.email()`, validates paper ownership, checks per-invitee eligibility (student role, not already co-author, no pending invite), generates a token, inserts the invitation row (including `invitee_email`), and inserts the invitee notification. Returns `TABLE(invitee_id uuid, result text)` with values `CREATED`, `SKIPPED_SELF`, `SKIPPED_NOT_STUDENT`, `SKIPPED_ALREADY_COAUTHOR`, `SKIPPED_ALREADY_PENDING`. Builder updated `createCoAuthorInvitations` in `research.ts` to call this RPC; all token/expiry/inviter_id logic removed from mobile. Change is **uncommitted**.

**Simple INSERT policy note:** The simple `inviter_id = email-resolved id` policy is still deployed on `co_author_invitations`. It is now superseded by the RPC for the actual mobile insert path but has not been dropped. It is harmless and may be left in place.

#### Gap 5 — Fanout trigger deployed and dropped (⚠️ no longer present)

A `co_author_notification_fanout` AFTER INSERT trigger on `notifications` was deployed to fan out workflow notifications to accepted co-authors. It caused an immediate regression: `paper_uploaded` and `coauthor_invite_accepted` notifications were blocked for all users. The trigger was dropped the same session. It is **not** a stable artifact and is **not** recorded in `docs/sql/`. Do not redeploy.

**Finding:** Co-authored paper workflow notifications (`Co-authored Paper Advanced`, `Co-authored Paper Approved`) are already inserted by a separate mechanism in the web backend's `review_controller.js` for each accepted co-author. A mobile-side fanout trigger is not needed and would cause duplication.

#### Gap 6 — "Paper Uploaded Successfully" notification (⚠️ not a regression)

The `paper_uploaded` notification type was reported as missing. Investigation confirmed: this notification type is not inserted by the web backend `submitResearch` handler or by any Supabase trigger. The May 14 rows in the `notifications` table with type `paper_uploaded` were manually inserted test data. This is a gap on both web and mobile that predates this branch. **Not a regression. Deferred.**

#### Gap 7 — File read error (🔴 active blocker — unresolved)

`WARN [submit] file read: Selected file is not readable from disk (missing or no access)` is being thrown consistently during submission testing. Two plausible causes:
1. **Stale content:// URI from draft restoration:** Android `content://` URIs from the document picker are session-scoped. If the draft stores a file URI from a previous session and restores it, the URI is invalid on next app start. The `ExpoFsFile.exists` check returns `false`, throwing the error.
2. **expo-file-system version change:** `package.json` was modified by christian during a dependency update (exact diff not reviewed). If the `expo-file-system` version changed in a way that breaks the `File` API used in `readSubmitFileBodyForUpload`, all file reads would fail regardless of URI freshness.

**Status:** Unresolved. Blocks submission testing. Requires `git diff package.json` review to rule out cause 2, then targeted testing to confirm cause 1.

---

### Malfoy duplicate auth.users account (⚠️ hygiene issue)

Malfoy has two `auth.users` records:
- `1581ebba` — `malfoy@students.com` — active mobile account
- `c2e20fd8` — `malfoydevera@students.nu-dasma-edu.ph` — old/unused account

The mobile session consistently uses `malfoy@students.com`. The duplicate account is not causing any current bug. Clean up via Supabase Auth admin panel when convenient.

---

### SQL changes deployed by christian this session (outside codebase)

**`research_authors` RLS policies** (all new — table previously had zero policies):
- SELECT: open read for anon (`USING (true)`) — required for `PAPER_SELECT` `structured_authors` join
- INSERT (owner): paper owner can insert co-author rows; `research_id` must be in papers where `author_id = email-resolved id`
- UPDATE (owner): paper owner can update co-author rows; required for upsert with `onConflict: 'research_id,user_id'`
- INSERT (invitee): invitee can insert their own `research_authors` row on accept; scoped to rows where `invitee_id = email-resolved id` and a pending `co_author_invitations` row exists

Snapshot recorded in: `docs/sql/research_authors_rls_policies.sql` (untracked).

**`co_author_invitations` RLS INSERT policy** (new):
- Simple: `inviter_id = (SELECT u.id FROM public.users u WHERE (u.email)::text = auth.email())`
- Superseded for actual mobile inserts by the `create_co_author_invitations` RPC but not dropped

Snapshot recorded in: `docs/sql/co_author_invitations_rls_policies.sql` (untracked, includes pre-existing SELECT and UPDATE policies too).

**`create_co_author_invitations(p_research_id uuid, p_invitee_ids uuid[])` SECURITY DEFINER RPC** (new):
- `LANGUAGE plpgsql`, `SECURITY DEFINER`, `SET search_path = public`
- `RETURNS TABLE (invitee_id uuid, result text)`
- Resolves inviter from `auth.email()`; validates paper ownership; per-invitee: student check, existing author check, pending invite check; generates token via two concatenated `gen_random_uuid()` calls; inserts invitation with `invitee_email`; inserts invitee notification (best-effort, `EXCEPTION WHEN OTHERS` swallows notification failures)
- `GRANT EXECUTE ON FUNCTION ... TO anon, authenticated`
- Token format: `replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')` — 64-char hex, no `pgcrypto` dependency
- **Snapshot file to create:** `docs/sql/co_author_invitations_rpcs.sql` (not yet written)

**`get_research_paper_ids_for_invitee(p_invitee_id uuid)` function** (deployed, unused):
- Deployed during debugging; returns `research_id` values from `co_author_invitations` where `invitee_id = p_invitee_id` and `status = 'accepted'`
- Not called by any mobile code
- Can be cleaned up at christian's discretion

---

### Builder changes (uncommitted, working tree)

- `src/api/invitations.ts` — `research_authors` upsert added to `respondToInvitation` on accept (best-effort, try/catch, non-blocking)
- `src/api/research.ts` — `loadResearchRows` extended with co-authored papers merge; `createCoAuthorInvitations` refactored to call `create_co_author_invitations` RPC; token/expiresAt/inviter_id logic removed
- `docs/plans/SUBMIT_RESEARCH.md` — Phase 2 implementation notes updated by builder to reference both fixes and the RPC migration

### Dependency changes (uncommitted, working tree)

- `app.json` — modified by christian; exact diff not reviewed
- `package.json` / `package-lock.json` — modified by christian during a dependency update session; exact diff not reviewed; may be related to the file read error

### SQL snapshot files (untracked, need to be committed)

- `docs/sql/research_authors_rls_policies.sql`
- `docs/sql/co_author_invitations_rls_policies.sql`

### Issues opened / closed since HANDOFF_S-R_PHASE-2.md

- No new GitHub issues filed. No issues closed. Open set remains #5, #6, #7, #8. **Do not invent issue numbers beyond #8.**

---

## Migration Status

✅ Complete and stable. All migration phases done. See `docs/plans/SUPABASE_MIGRATION.md`.

---

## UI Overhaul Status

✅ Complete through Phase 10 and validated. See `docs/plans/UI_OVERHAUL.md` (marked `[COMPLETED]`).

---

## Submit Research Status

Currently on branch `feat/submit-research`, branched off `dev`.

- ✅ Phase 1 — Web parity mapping + contract freeze
- ✅ Phase 2 — Submission flow implementation (UI + validation + upload + insert)
- 🔴 Phase 3 — Cross-system parity verification (in progress; blocked by file read error and cross-user author display gap; formal closure not yet written into `docs/plans/SUBMIT_RESEARCH.md`)
- ⏳ Phase 4 — Validation and merge readiness

---

## Critical Architectural Context

### Email-based RLS identity resolution

All mobile RLS policies resolve ownership via email:

```sql
user_id = (
  SELECT id FROM public.users
  WHERE email = auth.email()
)
```

### Auth architecture

- Mobile uses anon key + RLS
- Web backend uses service role key (bypasses RLS); never use the service role key on mobile
- `fetchAppUserProfile()` resolves the current session by `auth.email()` against `public.users.email`
- `public.users` has no `auth_id` column — email is the only bridge between `auth.users` and `public.users`

### UUID mismatch pattern

`auth.users.id` (from `auth.uid()`) does not match `public.users.id` for any user in this project. RLS policies using `auth.uid()` directly will silently return zero rows. Always use email-based resolution.

### users RLS recursion constraint

- `public.users` SELECT policy cannot reference itself — causes infinite recursion `42P17`
- Cross-user profile reads go through `get_user_basic_info` SECURITY DEFINER RPC
- Directory lookups (`get_faculty_members`, `search_students`) use SECURITY DEFINER for the same reason
- `co_author_invitations` INSERT policy referencing `research_papers` which references `co_author_invitations` also triggers `42P17` — this is why the `create_co_author_invitations` RPC was needed

### SECURITY DEFINER RPC pattern

When direct anon+RLS writes fail due to recursion, UUID mismatch, or unreliable `auth.email()` resolution in INSERT context, the established project fix is a `SECURITY DEFINER` function with `SET search_path = public` and `GRANT EXECUTE TO anon, authenticated`. This pattern is used by `increment_view_count`, `increment_download_count`, `get_user_basic_info`, `get_faculty_members`, `search_students`, and now `create_co_author_invitations`.

### Android edge-to-edge constraint

- `app.json` has `android.edgeToEdgeEnabled: true`
- `ResearchDetail` top inset handled by custom stack header; `SubmitResearchScreen` handles its own layout under `headerShown: false` with a `KeyboardAvoidingView`

### Storage upload mechanics (current canonical pattern)

- `readSubmitFileBodyForUpload(fileUri)` — on iOS/Android: `new ExpoFsFile(fileUri).arrayBuffer()` → `Uint8Array`; on web: `fetch + arrayBuffer`
- Do not unify these paths into a single `fetch(uri)` call
- Storage path: `${userId}/${generatePathId()}.${ext}` per frozen contract rule 5
- Stage-prefixed errors: `[submit] profile:`, `[submit] file read:`, `[submit] storage:`, `[submit] database:`

### Status routing convention (Submit Research)

- Frozen contract rule 6: `pending_faculty` when `facultyId` present, else `pending_editor`
- Computed client-side; no server-side enforcement trigger deployed

---

## Resolved Issues

- ✅ #1 — `ResearchDetail: view and download counts not persisting after navigation`
- ✅ #2 — `Mobile auth: UUID mismatch between auth.users and public.users breaks RLS`
- ✅ #3 — `co_author_invitations: PostgREST joins fail silently for research title and inviter name`
- ✅ #4 — `ResearchCard: published papers do not show view and download counts`

---

## Open Issues

- 🔴 #5 — `Browse: category filter shows unresolved UUIDs — categories not loading` — backend/data; not a Submit Research blocker
- 🔴 #6 — `Browse: add toggleable list and tile view` — enhancement; post-undertaking
- 🔴 #7 — `ResearchDetail / Browse: author name shows "Unknown" for non-uploaders` — cross-user `public.users` SELECT RLS; also surfaces as "Unknown Author" on co-authored papers in invitee's My Papers and missing co-author chip in primary author's ResearchDetail; fix options: open SELECT policy on `public.users` (broad) or restructure `PAPER_SELECT` author join through a SECURITY DEFINER RPC (narrow, requires code change); decision deferred
- 🔴 #8 — `ResearchDetail: Download button always visible — no allow_download column` — UI mitigation shipped (Download hidden); backend column still pending

---

## Current RLS Policy State (Supabase)

All policies use email-based resolution unless noted. See `docs/plans/SUPABASE_MIGRATION.md` for migration-era SQL and `docs/sql/` snapshots for Submit Research additions.

**Tables with Submit Research-era policies:**

- `submission_drafts` — four author-scoped policies (SELECT, INSERT, UPDATE, DELETE)
- `research_categories` — open anon SELECT
- `departments` — open anon SELECT
- `system_policy_settings` — open anon SELECT
- `research_authors` — open SELECT (`USING (true)`); INSERT for paper owner; UPDATE for paper owner; INSERT for invitee (scoped to pending invite, but see Gap 3 note above about timing)
- `co_author_invitations` — SELECT for invitee (pre-existing); UPDATE for invitee (pre-existing); INSERT for inviter (simple email-resolved, newly deployed, superseded by RPC)

---

## Supabase RPCs

All SECURITY DEFINER. All `SET search_path = public`. All `GRANT EXECUTE TO anon, authenticated`.

- `increment_view_count(row_id uuid)` — increments `research_papers.view_count`
- `increment_download_count(row_id uuid)` — increments `research_papers.download_count`; no UI call-site pending #8
- `get_user_basic_info(user_id uuid)` — cross-user profile read; used by `invitations.ts` to resolve inviter name
- `get_faculty_members(p_department text, p_department_id uuid)` — faculty directory for submit form adviser picker; `LANGUAGE sql`, `STABLE`; snapshot: `docs/sql/submit_research_rpcs.sql`
- `search_students(p_query text)` — co-author search for submit form; `LANGUAGE sql`, `STABLE`; requires `length(trim) >= 2`; snapshot: `docs/sql/submit_research_rpcs.sql`
- `create_co_author_invitations(p_research_id uuid, p_invitee_ids uuid[])` — post-submit invitation creation; `LANGUAGE plpgsql`; returns `TABLE(invitee_id uuid, result text)`; handles inviter resolution, ownership check, per-invitee eligibility, token generation, invitation insert, notification insert; **snapshot file not yet created** (`docs/sql/co_author_invitations_rpcs.sql` to be written by christian)
- `get_research_paper_ids_for_invitee(p_invitee_id uuid)` — deployed during debugging, not used by any mobile code; candidate for cleanup

---

## Current State of the Codebase

### Design system

- `src/theme/` — `colors`, `typography`, `spacing`, `shadows`, `radii`, `motion`, `index`
- Fonts: Outfit for all UI chrome; Lora for paper title in `ResearchDetail` only
- All token consumption via direct `import { theme } from '../theme'` — no `useTheme()` hook
- `theme.motion` carries `skeletonCycleDuration: 900`, `listItemDuration: 320`, `listStaggerDelay: 60` (ms)
- Phase 9 contrast adjustments: `state.success = #047857`, `state.danger = #B91C1C`

### Component system

- `src/components/ui/` — `Surface`, `Card`, `PressableCard`, `Button`, `Chip`, `Badge`, `Stat`, `IconButton`, `EmptyState`, `Skeleton`, `InlineNotice`, `BottomSheet`, `Divider`, `Logo`, `OrbitalAccent`
- `src/components/` — `ResearchCard`, `NotificationCard`, `InvitationCard`, `PaperStatusChip`, `ListEntranceItem`
- No new components added in Submit Research. `SubmitResearchScreen` reuses only existing primitives.

### `researchApi` (read paths — unchanged from Phase 2)

- `getMyPapers()` — now returns primary-authored AND co-authored papers merged and deduped; sorts descending by date
- `getPublishedPapers(params?)` — browse surface; filters by `approved` / `published` statuses
- `getCategories()` — reference data from `research_categories`
- `getResearchById(paperId)` — detail + workflow history
- `getResearchFile(paperId)` — signed URL with public URL fallback
- `trackView(paperId)` — best-effort RPC + `paper_views` insert
- `trackDownload(paperId)` — gated on `allow_download`; best-effort RPC + `paper_downloads` insert

### `submitApi` (submit paths — updated this session)

- `getSubmissionPolicy()` — reads `system_policy_settings`; falls back to `{ maxFileSizeMb: 10, allowedFileTypes: ['pdf'] }`
- `getDepartments()` — reads `departments`
- `getFacultyMembers({ department, departmentId })` — calls `get_faculty_members` RPC
- `searchStudents(query)` — calls `search_students` RPC; post-filters self
- `getMyDraft(paperId?)` — scoped to current user
- `saveMyDraft(paperId, payload)` — best-effort upsert; non-fatal on failure
- `deleteMyDraft(paperId)` — best-effort
- `submitResearch(input)` — profile → file read → storage upload → `research_papers` upsert → `research_authors` upsert; throws stage-prefixed errors
- `createCoAuthorInvitations(researchId, inviteeIds)` — now calls `create_co_author_invitations` RPC; token/expiresAt/inviter_id logic removed from mobile; returns `{ created, skipped }` from RPC result rows

### `invitationsApi` (updated this session)

- `acceptInvitation(token)` — calls `respondToInvitation(token, 'accepted')`; now also attempts a best-effort `research_authors` upsert for the accepting invitee post-status-update
- `declineInvitation(token)` — unchanged
- `getInvitations(status?)` — unchanged
- `getMine(status?)` — unchanged

### `notificationsApi` (unchanged)

- `getNotifications(limit?)` — scoped to `user_id = profile.id`
- `getUnreadCount()` — count query
- `markAsRead(id)` — single row update
- `markAllAsRead()` — batch update

### `SubmitResearchScreen` integration contract (unchanged from Phase 2)

- Route: `SubmitResearch` with optional `{ resubmitPaperId?: string }` param
- Stack registration: `headerShown: false`
- Entry point: `Submit` Button on `MyPapersScreen`
- Post-submit: success `InlineNotice`, draft cleanup, `navigation.goBack()`
- Resubmit hydration: loads paper detail, pre-fills form, file optional

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

### Field-level type gotchas

- `NotificationItem.is_read` — `is_read`, not `read`
- `CoAuthorInvitation.created_at` — `string | undefined`; guard before rendering
- `ResearchPaper.external_author_notes` — `string | string[] | null`; join arrays with `", "`
- `ResearchPaper.structured_authors` — `author` may be null if cross-user `public.users` RLS blocks the join (issue #7)
- `submission_drafts` `onConflict: 'user_id,paper_id'` — misaligned with `uq_submission_drafts_user_null_paper` partial unique when `paper_id IS NULL`; causes duplicate constraint warn on autosave; non-blocking; christian-owned schema fix
- `get_faculty_members` / `search_students` return column types must match `public.users` exactly (`character varying` for names, `text` for `program`); type mismatch surfaces as `42804`
- `SubmitDraftFormState.coAuthors: string` is the **external notes string**, not the structured co-author list; structured co-authors live in `selectedCoAuthors: StudentSearchResult[]`

### Screen-level prop conventions

| Screen | engagementCounts | keywords | statusChip |
|---|---|---|---|
| Dashboard | ❌ | ❌ | ✅ |
| MyPapers | ❌ | ❌ | ✅ |
| Browse | ✅ | ✅ | ❌ |
| Notifications | n/a | n/a | n/a |
| Invitations | n/a | n/a | n/a |
| ResearchDetail | n/a | n/a | n/a |

---

## Open Backend Asks (christian-owned, not yet resolved)

1. **File read error root cause** — review `git diff package.json` to confirm whether `expo-file-system` version changed; test with freshly picked file (pick immediately before submit, no backgrounding) to confirm or rule out stale URI cause
2. **Cross-user `public.users` SELECT** — fix for issue #7; affects author name display in all paper surfaces; options: open SELECT policy (`USING (true)`) vs. restructure `PAPER_SELECT` author join through RPC; decision pending
3. **`research_authors` invitee INSERT timing** — the invitee INSERT policy checks `status = 'pending'` but the status has already been updated to `accepted` at insert time; policy needs to allow post-accept inserts (e.g., drop the `status = 'pending'` condition and rely only on the `co_author_invitations` existence check)
4. **`submission_drafts` partial unique alignment** — `uq_submission_drafts_user_null_paper` doesn't match `onConflict: 'user_id,paper_id'` when `paper_id IS NULL`
5. **`create_co_author_invitations` RPC snapshot** — write `docs/sql/co_author_invitations_rpcs.sql`
6. **Malfoy duplicate auth.users** — clean up `c2e20fd8` (`malfoydevera@students.nu-dasma-edu.ph`) via Supabase Auth admin

---

## Commit History (most recent first)

```text
75ba909 (HEAD -> feat/submit-research) docs: update PROJECT_CONTEXT and README to reflect submit research scope
190b25e docs(conventions): expand and standardize convention files
78550f8 fix(submit-research): unblock anon+RLS with RPCs, policies, and app wiring
99fe58f feat(submit-research): implement Phase 2 submission flow
266c57b docs(submit-research): complete phase 1 parity contract freeze
64f8fa7 docs: add submit research implementation plan
```

---

## Current Git State

Branch: `feat/submit-research` — working tree has uncommitted changes.

**Modified (uncommitted):**

- `M app.json` — dependency/config update by christian; exact diff not reviewed
- `M package.json` — dependency update by christian; exact diff not reviewed; may be related to file read error
- `M package-lock.json` — corresponding lockfile entry
- `M docs/plans/SUBMIT_RESEARCH.md` — Phase 2 implementation notes updated by builder (RPC migration, co-author fixes)
- `M src/api/invitations.ts` — `research_authors` upsert on invitation accept
- `M src/api/research.ts` — `loadResearchRows` co-author merge; `createCoAuthorInvitations` RPC refactor

**Untracked (need to be committed):**

- `docs/sql/research_authors_rls_policies.sql` — snapshot of all 4 `research_authors` RLS policies
- `docs/sql/co_author_invitations_rls_policies.sql` — snapshot of all 3 `co_author_invitations` RLS policies

**Intended branch workflow:**

```text
feat/submit-research → dev → main
```

No merges back into `dev` yet. `dev` HEAD is `5d6845f` (post-UI-overhaul merge baseline).

---

## Immediate Next Steps (ordered)

1. **Review `git diff package.json`** — confirm whether `expo-file-system` version changed; this is the likely cause of the file read error
2. **Resolve file read error** — based on diff findings: either revert `expo-file-system` to `~19.0.22` or fix URI handling for stale `content://` URIs
3. **Resolve cross-user author display (#7)** — decide on approach (open SELECT policy vs. RPC); deploy fix; confirm co-author chip shows in ResearchDetail and author name shows in co-authored papers on My Papers
4. **Fix `research_authors` invitee INSERT timing** — update policy to remove `status = 'pending'` condition
5. **Write `docs/sql/co_author_invitations_rpcs.sql`** snapshot
6. **Formally close Phase 3** — write closure block in `docs/plans/SUBMIT_RESEARCH.md` once all blockers above are resolved
7. **Commit all working-tree changes** — staged together or atomically per convention
8. **Run Phase 4** — validation and merge readiness