# NUcleus Mobile — Session Handoff Context (Submit Research Phase 2 Close)

## Project Overview

React Native Expo app (`capstone-nucleus-rn`) is on a stable post-migration, post-UI-overhaul baseline, with **mobile Submit Research** now functional end-to-end on branch `feat/submit-research`. Phase 1 (parity contract freeze) and Phase 2 (submission flow implementation) are complete and stable. Phase 3 (cross-system parity verification) is in progress: ad-hoc cross-role / cross-account interoperability, realtime notifications, and workflow-history rendering have been informally verified by christian against the deployed Supabase project; formal Phase 3 closure per plan conventions has not yet been written into `docs/plans/SUBMIT_RESEARCH.md`. Phase 4 (validation and merge readiness) is the next phase.

**Canonical docs in the repo:**
- `docs/PROJECT_CONTEXT.md` — product identity, audience, navigation, domain types, principles
- `docs/PRODUCT_ROADMAP.md` — UX and design direction reference
- `docs/plans/SUPABASE_MIGRATION.md` — migration history and SQL/RLS policy reference
- `docs/plans/UI_OVERHAUL.md` — UI execution baseline (completed)
- `docs/plans/SUBMIT_RESEARCH.md` — active Submit Research implementation plan
- `docs/plans/SUBMIT_RESEARCH_PARITY_MATRIX.md` — Phase 1 parity artifact (frozen contract v1)
- `docs/conventions/README.md` — process conventions (issues, milestones, tags, commits, builder prompts)
- `docs/sql/submit_research_rpcs.sql` — deployed snapshot of submit-research RPCs
- `docs/sql/submit_research_rls_policies.sql` — deployed snapshot of submit-research RLS

**GitHub repo:** `christianmeude/capstone-nucleus-rn`

---

## What Changed Since HANDOFF_U-O_PHASE-10.md

> Every delta since the Phase 10 close, including Supabase changes made outside the codebase.

### Process / docs

- Added `docs/handoffs/HANDOFF_S-R_KICKOFF.md` as the kickoff baseline for the Submit Research undertaking on branch `feat/submit-research` (off `dev`).
- Added the active plan `docs/plans/SUBMIT_RESEARCH.md` and the Phase 1 parity artifact `docs/plans/SUBMIT_RESEARCH_PARITY_MATRIX.md` (frozen contract v1).
- Convention files under `docs/conventions/*` were expanded and standardized in this session: `builder-prompts.md` was rewritten with reading order, pre-implementation discipline, phase prompt structure with example, post-implementation requirements, and out-of-scope rules; `commits.md` had type descriptions and a full example commit added; `github-issues.md` had the canonical issue titles table inverted to latest-first and the issue number discipline clause updated to require table maintenance. These changes landed in commit `190b25e`.

### Phase 1 — Web parity mapping + contract freeze (✅ COMPLETED, commit `266c57b`)

- Captured the full client-origin submit contract from `frontend/src/pages/student/SubmitResearch.jsx` and the web backend (`submission.controller.js`, `research.routes.js`, `auth.routes.js`, `coauthorInvitation.controller.js`, `utils/systemPolicy.js`).
- Froze contract v1 (11 normative rules) including dual `coAuthors` + `externalAuthorNotes` multipart keys, deterministic status routing, storage path `${userId}/${uuid}.${ext}` to bucket `research-papers`, dual local + server draft lifecycle, and non-blocking post-submit invitations.
- Recorded blockers (checklist vs adviser contradiction, RLS-safe directory lookup, optional column schema baseline) and resolved ambiguities (`programId` is server-supported but not client-origin from current web page; resubmit without file is valid when `id` is present).

### Phase 2 — Submission flow implementation (✅ COMPLETED, commits `99fe58f` and `78550f8` + uncommitted storage fix)

- Added a dedicated `submitApi` namespace to `src/api/research.ts` exposing `getSubmissionPolicy`, `getDepartments`, `getFacultyMembers`, `searchStudents`, `getMyDraft`, `saveMyDraft`, `deleteMyDraft`, `submitResearch`, and `createCoAuthorInvitations`. Behavior of the existing `researchApi` is unchanged.
- Added a new screen `src/screens/main/SubmitResearchScreen.tsx` implementing the full web-parity form (title, abstract, keywords, category, faculty adviser, department, structured co-authors via `search_students`, external co-author notes, file attachment, resubmit hydration from `resubmitPaperId`).
- Wired the screen as a stack route via `SubmitResearch: { resubmitPaperId?: string } | undefined` in `src/navigation/types.ts` and as a `Stack.Screen` in `src/navigation/AppNavigator.tsx` (`headerShown: false`, alongside `ResearchDetail`).
- Added a `Submit` entry-point Button to `src/screens/main/MyPapersScreen.tsx` — the only existing screen touched, mirroring the web `/student/my-research` host page.
- Implemented dual draft lifecycle: local `AsyncStorage` key `submission_draft_${id|new}` plus best-effort `submission_drafts` upsert on a 30-second interval; both cleared on successful submit; local draft is the resilient fallback when the server table is RLS-blocked or unavailable.
- Submit pipeline maps the frozen multipart contract onto direct Supabase operations under the anon key: storage upload to `research-papers` at `${userId}/${uuid}.${ext}`, `research_papers` upsert with `file_url` + `file_storage_path` and column-mapped payload, deterministic status assignment `pending_faculty | pending_editor` from `facultyId`, structured co-authors via `research_authors` upsert, and best-effort post-submit `co_author_invitations` insert (non-blocking).
- Resolved the Phase 1 checklist-vs-adviser blocker by implementing the stricter adviser rule: faculty adviser is required to confirm the submission checklist modal.
- Replaced direct `public.users` reads for faculty/student directory lookups with deployed `SECURITY DEFINER` RPCs (`get_faculty_members`, `search_students`); empty RPC results surface the bottom-sheet `EmptyState` only — no separate availability `InlineNotice`. Added `pickRpcDisplayName` helper to tolerate RPC rows that return either split name fields or pre-built `full_name`.
- Wired `expo-document-picker` (`~14.0.8`) with policy-driven MIME hints (mobile mirror of web `TYPE_TO_MIME`) and post-pick extension/size checks; removed the stale "Submission is currently disabled in this build" notice and the hardcoded `filePickerAvailable` / `facultyAvailable` / `studentSearchAvailable` heuristics.
- Added `expo-file-system` (`~19.0.22`) and replaced the failing `fetch(uri) → blob()` upload body with a native `expo-file-system` `File(uri).arrayBuffer()` → `Uint8Array` read on iOS/Android (web still uses `fetch` + `arrayBuffer`). This resolved a persistent `Network request failed` at the `supabase.storage.upload` stage that did not move under repeated logging passes. **This change is currently uncommitted in the working tree** (`src/api/research.ts`, `package.json`, `package-lock.json`).
- Added stage-prefixed error reporting in `submitResearch`: `[submit] profile:`, `[submit] file read:`, `[submit] storage:`, `[submit] database:`. Each stage is wrapped in a dedicated try/catch and routed through `throwSubmitStageError` for QA attribution. A non-sensitive `[submit] storage context` console.warn is emitted on storage failure with `bucket`, `pathSegments` (count), `ext`, `bodyBytes`, `contentType`.
- Added deployed-snapshot SQL records under `docs/sql/`: `submit_research_rpcs.sql` and `submit_research_rls_policies.sql`. These files are reference snapshots of definitions deployed by christian — **not** migration scripts.
- Phase 2 status was flipped to `✅ **COMPLETED (stable)**` in `docs/plans/SUBMIT_RESEARCH.md` with implementation summary, decisions, resolved backend asks, and parity-row check populated.

### Supabase changes deployed by christian (outside the codebase)

- **RPC `get_faculty_members(p_department text, p_department_id uuid)`** deployed as `SECURITY DEFINER`, `STABLE`, `LANGUAGE sql`, `SET search_path = public`. Returns `(id uuid, email character varying, first_name character varying, middle_name character varying, last_name character varying, department character varying, department_id uuid)`. Filters `users` where `role::text = 'faculty'` and applies an `(p_department_id, p_department)` matcher. `GRANT EXECUTE` to `anon, authenticated`. Initial `42P13` and `42804` failures were resolved by `DROP FUNCTION` + `CREATE` with return-column types aligned to `public.users` (`character varying`, not `text`).
- **RPC `search_students(p_query text)`** deployed as `SECURITY DEFINER`, `STABLE`, `LANGUAGE sql`, `SET search_path = public`. Returns `(id uuid, email character varying, first_name character varying, middle_name character varying, last_name character varying, program text)`. Requires `length(trim(p_query)) >= 2`, `ILIKE` over name + email fields, ordered by `last_name`, `first_name`, `LIMIT 50`. `GRANT EXECUTE` to `anon, authenticated`. The column-6 type required `program text` (not `varchar`) because `public.users.program` is `text`.
- **RLS on `public.submission_drafts`** — four author-scoped policies for `anon, authenticated` (`submission_drafts_select_own`, `submission_drafts_insert_own`, `submission_drafts_update_own`, `submission_drafts_delete_own`) using the project convention `user_id = (SELECT u.id FROM public.users u WHERE u.email::text = auth.email() LIMIT 1)`.
- **Anon `SELECT` policies** on `public.research_categories` (`anon_can_read_research_categories`), `public.departments` (`anon_can_read_departments`), and `public.system_policy_settings` (`"anon can read submission policy"`) so the submit form can populate categories, departments, and the file policy without a logged-in `public.users` join.
- Live policy values observed during smoke-tests: `max_file_size_mb = 95`, `allowed_file_types = ['pdf', 'doc']`. Mobile retains `{ maxFileSizeMb: 10, allowedFileTypes: ['pdf'] }` only as a fallback when the policy read fails.
- **Not deployed yet (still flagged in plan):** anon `INSERT` policy on `public.co_author_invitations` confirming `inviter_id = email-resolved auth id`; schema baseline confirmation that `research_papers` accepts `program_id`, `external_author_notes`, `file_storage_path`, `file_name`, `file_size` under the RN baseline; database trigger / RPC to enforce server-side `pending_faculty | pending_editor` routing from `faculty_id`.
- One known anomaly observed in logs: `duplicate key value violates unique constraint "uq_submission_drafts_user_null_paper"` on `submission_drafts` upsert when `paper_id` is null. Client uses `onConflict: 'user_id,paper_id'`; the DB has a partial unique that does not match that pair when `paper_id IS NULL`. Non-blocking for submit, but the autosave conflict resolution is misaligned and needs alignment between the client `onConflict` and the partial unique definition (christian-owned).

### Branch / merge events

- Branched `feat/submit-research` off `dev` after the `feat/ui-overhaul → dev` merge (`5d6845f`). No merges back into `dev` yet.
- Post-merge documentation commit on `dev` (Phase 10 era) landed `docs/conventions/*`, GitHub issue templates, and the handoff template link updates (commits `1f9779f` and `3d03194`).

### Issues opened / closed since previous handoff

- No new GitHub issues filed. No issues closed since `HANDOFF_U-O_PHASE-10.md`. The "Open" set remains `#5`, `#6`, `#7`, `#8`. Issue number discipline: **do not invent issue numbers beyond #8**.

---

## Migration Status

✅ Complete and stable. All migration phases done. See `docs/plans/SUPABASE_MIGRATION.md`.

---

## UI Overhaul Status

✅ Complete through Phase 10 and validated. See `docs/plans/UI_OVERHAUL.md` (marked `[COMPLETED]`).

- ✅ Phase 1 — Design system foundation
- ✅ Phase 2 — Component system
- ✅ Phase 3 — Dashboard overhaul
- ✅ Phase 4 — MyPapers overhaul
- ✅ Phase 5 — Browse overhaul
- ✅ Phase 6 — Notifications overhaul
- ✅ Phase 7 — Invitations overhaul
- ✅ Phase 8 — ResearchDetail overhaul
- ✅ Phase 9 — Polish and accessibility
- ✅ Phase 10 — Validation and merge readiness

---

## Submit Research Status

Currently on branch `feat/submit-research`, branched off `dev`.

- ✅ Phase 1 — Web parity mapping + contract freeze
- ✅ Phase 2 — Submission flow implementation (UI + validation + upload + insert)
- ⏳ Phase 3 — Cross-system parity verification (in progress; informally validated by christian against the deployed Supabase project; formal phase closure pending in `docs/plans/SUBMIT_RESEARCH.md`)
- ⏳ Phase 4 — Validation and merge readiness

Stability: Submit pipeline is end-to-end functional on the device used for validation (file pick, policy enforcement, storage upload via native `expo-file-system` read, `research_papers` insert, `research_authors` upsert, best-effort co-author invitations, draft autosave + cleanup, navigation back to MyPapers). Cross-role realtime notifications and workflow history rendering have been verified informally.

---

## Critical Architectural Context

> Populated in full per template. Do not abbreviate.

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

### users RLS recursion constraint

- `public.users` SELECT policy cannot reference itself — causes infinite recursion error `42P17`
- Cross-user profile reads go through `get_user_basic_info` SECURITY DEFINER RPC
- Submit Research adds two further SECURITY DEFINER RPCs (`get_faculty_members`, `search_students`) specifically because anon `SELECT` over `public.users` is constrained to self-by-email; directory lookups would otherwise return zero rows

### Android edge-to-edge constraint

- `app.json` has `android.edgeToEdgeEnabled: true`
- `ResearchDetail`'s top inset is handled by a screen-scoped custom stack header (`src/navigation/ResearchDetailHeader.tsx` using `useSafeAreaInsets().top`), not a navigator-wide `SafeAreaView` wrap
- `SubmitResearchScreen` does its own internal layout under `headerShown: false` and a `KeyboardAvoidingView`; do not introduce a global `Stack.Navigator` top-edge `SafeAreaView`

### Storage upload mechanics (current canonical pattern)

- New-file submit reads the picked file via `expo-file-system` `new File(uri).arrayBuffer()` → `Uint8Array` on iOS/Android (web uses `fetch` + `arrayBuffer`), then calls `supabase.storage.from('research-papers').upload(path, uint8Array, { contentType, upsert: true })`
- This replaced an earlier `fetch(uri) → blob()` body which produced a persistent `Network request failed` at the Storage HTTP layer on at least one Android device under tunneling
- Storage path is `${userId}/${generatePathId()}.${ext}` per frozen contract rule 5; `generatePathId()` is a UUID-v4-shaped helper in `src/api/research.ts` that does **not** require a `uuid` dependency
- Submit pipeline emits stage-prefixed errors: `[submit] profile:`, `[submit] file read:`, `[submit] storage:`, `[submit] database:`. On storage failure a non-sensitive `[submit] storage context` log is emitted with `bucket`, `pathSegments` (count), `ext`, `bodyBytes`, `contentType` — no tokens, no full path

### Status routing convention (Submit Research)

- Frozen contract rule 6: new submit gets `pending_faculty` when `facultyId` is present, else `pending_editor`
- Mobile computes this client-side because there is no Express `submit.controller.js` between client and database under anon+RLS
- A database trigger / RPC to enforce this on the server side is flagged in the plan as a hardening item, **not** deployed

### Domain type notes

- `public.users` has no `auth_id` column — email is the only bridge
- `User.fullName` is the canonical display name; first name derived via `user.fullName.trim().split(/\s+/)[0]`
- `PaperStatus` includes both `approved` and `published` as distinct values
- `statusToLabel()` in `src/utils/format.ts` is the canonical label source; `approved` maps to `"Approved"`, `published` maps to `"Published"`
- `NotificationItem.is_read` — field is `is_read`, not `read`
- `CoAuthorInvitation.created_at` — `string | undefined`, guard before rendering
- `ResearchPaper.external_author_notes` — typed `string | string[] | null`; `SubmitResearchScreen` joins arrays with `", "` for the form field and reads `string` cleanly for resubmit hydration
- `ResearchPaper.structured_authors` items expose `is_primary`, `author_order`, and an `author` of shape `PaperAuthor` (split name fields plus a derived `fullName` / `name`); the primary author is filtered out when extracting structured co-authors for resubmit
- `SubmitDraftFormState` has `coAuthors: string` even though structured co-authors are handled via `selectedCoAuthors: StudentSearchResult[]`; the `coAuthors` string is the **external notes / non-system co-author** field, mirroring web parity rule 1 where `coAuthors` and `externalAuthorNotes` carry the same value

---

## Resolved Issues

> Exact GitHub issue titles, taken from `docs/conventions/github-issues.md`. Do not paraphrase.

### Supabase migration issues (all closed)

- ✅ #1 — `ResearchDetail: view and download counts not persisting after navigation` (resolved by `SECURITY DEFINER` `increment_view_count` / `increment_download_count` RPCs and email-based RLS on `paper_views` / `paper_downloads`)
- ✅ #2 — `Mobile auth: UUID mismatch between auth.users and public.users breaks RLS` (resolved by replacing UUID-based RLS with email-based identity resolution across `research_papers`, `paper_views`, `paper_downloads`)
- ✅ #3 — `co_author_invitations: PostgREST joins fail silently for research title and inviter name` (resolved via `INVITATION_SELECT` research embed plus `get_user_basic_info` RPC for inviter resolution)

### UI overhaul issues (closed)

- ✅ #4 — `ResearchCard: published papers do not show view and download counts` (resolved via explicit `showEngagementCounts` prop scoping; Browse passes `true`, all other screens default to `false`)

### Submit Research issues

- None filed or closed in this undertaking. **Do not invent issue numbers beyond #8.** Submit Research backend asks that remain unresolved (anon insert on `co_author_invitations`, schema baseline, server-side status routing) are tracked in the plan, not as GitHub issues.

---

## Open Issues

> Exact GitHub issue titles. Do not paraphrase. Do not invent numbers beyond #8.

- 🔴 #5 — `Browse: category filter shows unresolved UUIDs — categories not loading` — backend / data; awaits backend reconciliation. Not a Submit Research blocker.
- 🔴 #6 — `Browse: add toggleable list and tile view` — enhancement; post-undertaking.
- 🔴 #7 — `ResearchDetail / Browse: author name shows "Unknown" for non-uploaders` — RLS on cross-user `public.users` join; needs dedicated Supabase investigation. Same constraint family that `get_faculty_members` / `search_students` work around for Submit Research, but the read site here is the paper detail join, not a directory RPC.
- 🔴 #8 — `ResearchDetail: Download button always visible — no allow_download column` — UI mitigation already shipped (Download hidden in `ResearchDetail`; `trackDownload` call-site removed but facade preserved). Backend column still pending.

---

## Current RLS Policy State (Supabase)

All policies use email-based resolution. See `docs/plans/SUPABASE_MIGRATION.md` for migration-era SQL, and `docs/sql/submit_research_rls_policies.sql` for the Submit Research additions.

**Affected tables:** `notifications`, `co_author_invitations`, `research_papers`, `paper_views`, `paper_downloads`, `submission_drafts`, `research_categories`, `departments`, `system_policy_settings`, `public.users`.

Submit Research additions in particular:

- `submission_drafts` — four author-scoped policies (`SELECT`, `INSERT`, `UPDATE`, `WITH CHECK` on UPDATE, `DELETE`) for `anon, authenticated`, all using the email-resolved `user_id` pattern
- `research_categories` — `anon_can_read_research_categories` for `anon` with `USING (true)` (categories are public reference data)
- `departments` — `anon_can_read_departments` for `anon` with `USING (true)` (departments are public reference data)
- `system_policy_settings` — `"anon can read submission policy"` for `anon` with `USING (true)` (file-size / allowed-type policy must be readable before sign-in style flows)

Still pending (not deployed):

- `co_author_invitations` anon `INSERT` policy verifying `inviter_id = email-resolved auth id`. Without it, post-submit invitations silently no-op.

---

## Supabase RPCs

All current SECURITY DEFINER RPCs in use by mobile:

- `increment_view_count(row_id uuid)` — SECURITY DEFINER — increments `research_papers.view_count` under anon+RLS without exposing direct UPDATE
- `increment_download_count(row_id uuid)` — SECURITY DEFINER — increments `research_papers.download_count`; currently has no UI call-site in mobile pending Issue #8 schema work
- `get_user_basic_info(user_id uuid)` — SECURITY DEFINER — cross-user profile read that bypasses `public.users` recursion (`42P17`); used by invitations to resolve inviter
- `get_faculty_members(p_department text, p_department_id uuid)` — SECURITY DEFINER, `STABLE`, `LANGUAGE sql`, `SET search_path = public` — returns faculty rows for the submit form's adviser picker. Filters `public.users` by `role::text = 'faculty'`; matches department by id first, then by trimmed lower-case name when `p_department_id IS NULL`. `GRANT EXECUTE` to `anon, authenticated`. Snapshot: `docs/sql/submit_research_rpcs.sql`.
- `search_students(p_query text)` — SECURITY DEFINER, `STABLE`, `LANGUAGE sql`, `SET search_path = public` — returns student rows for the co-author picker. Requires `length(trim(p_query)) >= 2`, `ILIKE` over name and email fields, ordered by `last_name`, `first_name`, `LIMIT 50`. `GRANT EXECUTE` to `anon, authenticated`. Snapshot: `docs/sql/submit_research_rpcs.sql`.

---

## Current State of the Codebase

> Populated in full per template. Do not abbreviate or reference a prior handoff in place of populating this section.

### Design system

- `src/theme/` — `colors`, `typography`, `spacing`, `shadows`, `radii`, `motion`, `index`
- Fonts: Outfit for all UI chrome; Lora for paper title in `ResearchDetail` only
- All token consumption via direct `import { theme } from '../theme'` — no `useTheme()` hook
- `theme.motion` carries `skeletonCycleDuration: 900`, `listItemDuration: 320`, `listStaggerDelay: 60` (ms). No new motion tokens added since Phase 9.
- `theme.typography` applies `scaledFontSize` (PixelRatio-aware, capped at 1.3×) at module load time; do not retrofit per-render scaling
- Phase 9 contrast adjustments still in force: `state.success = #047857`, `state.danger = #B91C1C`

### Component system

- `src/components/ui/` — `Surface`, `Card`, `PressableCard`, `Button`, `Chip`, `Badge`, `Stat`, `IconButton`, `EmptyState`, `Skeleton`, `InlineNotice`, `BottomSheet`, `Divider`, `Logo`, `OrbitalAccent`
- `src/components/` — `ResearchCard`, `NotificationCard`, `InvitationCard`, `PaperStatusChip`, `ListEntranceItem`
- **No new components added in Submit Research.** `SubmitResearchScreen.tsx` reuses only the existing primitives (`Button`, `Card`, `Chip`, `InlineNotice`, `EmptyState`, `Skeleton`, `BottomSheet`).

### `Button` props (current state)

- `label: string` — required — visible label; also used as default `accessibilityLabel`
- `onPress: () => void` — required
- `disabled?: boolean` — default `false`
- `loading?: boolean` — default `false`; renders an inline `ActivityIndicator` and blocks press
- `variant?: 'primary' | 'secondary' | 'subtle'` — default `'primary'`
- `size?: 'md' | 'sm'` — default `'md'`; both variants enforce `minHeight: 44`
- `accessibilityLabel?: string` — overrides default which is `label`
- Behavioral: pressed state applies `scale: 0.98` only when not disabled/loading; primary uses brand fill, secondary uses brand-outlined raised surface, subtle uses transparent background with brand text

### `Chip` props (current state)

- `label: string` — required
- `variant?: 'filter' | 'status'` — default `'filter'`
- `active?: boolean` — default `false`; only meaningful in `'filter'` variant
- `tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger'` — default `'neutral'`; only meaningful in `'status'` variant
- `onPress?: () => void` — only meaningful in `'filter'` variant; status chips are read-only
- Behavioral: `'filter'` is a `Pressable` (44×44 minimum) with selected styles and accessibility state; `'status'` is a static `View` with tone-mapped background/border/text colors

### `EmptyState` props (current state)

- `title: string` — required
- `message?: string`
- `icon?: ReactNode` — render the icon node yourself (e.g. `<Ionicons name="..." size={...} color={...} />`); the component does **not** accept an icon name string
- Used inside `SubmitResearchScreen` bottom sheets when faculty / student lookups return empty

### `InlineNotice` props (current state)

- `message: string` — required
- `tone?: 'info' | 'success' | 'warning' | 'danger'` — default `'info'`
- No `title`, no `icon`, no `actions` props. Single-line/single-block notice.

### `BottomSheet` props (current state)

- `visible: boolean` — required; controlled
- `onClose: () => void` — required; called on backdrop press and on Android back gesture
- `children: ReactNode` — required
- Behavioral: `Modal` with `animationType="slide"`; backdrop is a tappable `Pressable` over a `theme.colors.surface.overlay` surface; sheet has top corner radii, level-2 shadow, and a centered handle bar. `SubmitResearchScreen` uses it as the canonical picker host (category, department, faculty, co-author search).

### `Card` / `PressableCard` props (current state)

- `Card`:
  - `children: ReactNode` — required
  - `style?: StyleProp<ViewStyle>`
  - `padding?: keyof typeof theme.spacing` — default `'lg'`
- `PressableCard` extends `Card` with:
  - `onPress: NonNullable<PressableProps['onPress']>` — required
  - `disabled?: boolean`
  - `accessibilityLabel?: string`
- Both wrap the existing `Surface` primitive; `PressableCard` adds press scale + opacity feedback when not disabled

### `Stat` props (current state)

- `label: string` — required
- `value: number | string` — required
- `tone?: 'default' | 'warning'` — default `'default'`; `'warning'` styles the surface and the value

### `ResearchCard` props (current state)

- `paper: ResearchPaper` — required
- `onPress?: () => void` — when present the card renders as `PressableCard` with `accessibilityLabel = "${title}, ${statusLabel}"`
- `showEngagementCounts?: boolean` — default `false`; Browse passes `true`
- `showStatusChip?: boolean` — default `true`; Browse passes `false`
- `categoryLine?: string` — optional muted small text above title (Browse only)
- `keywords?: string[]` — optional; capped at 4 chips
- Behavioral: integrates with `useListEntranceActive` to suppress `theme.shadows.level2` during entrance and restore after entrance completes, avoiding an Android elevation ghost during list staggered fade-in

### `NotificationCard` props (current state)

- `notification: NotificationItem` — required
- `onPress: () => void` — required
- Behavioral: unread state derived from `notification.is_read`; unread cards apply `theme.colors.brand.primarySurface` background and a `Badge`

### `InvitationCard` props (current state)

- `invitation: CoAuthorInvitation` — required
- `acting?: boolean` — default `false`; disables both action buttons
- `onAccept?: () => void`
- `onDecline?: () => void`
- Behavioral: muting (opacity 0.5) for non-pending statuses; dot color and label derived from status; date rows are conditional (`invited`, `expires`, `expired`); inviter name derived from `inviter.fullName || inviter.name || inviter.email || 'Unknown'`

### `PaperStatusChip` exports (current state)

- Default export: `PaperStatusChip` taking `status?: PaperStatus` and rendering a `Chip variant="status"` with tone mapping (approved/published → success, revision_required → warning, rejected → danger, active pending → info)
- Named exports: `ACTIVE_STATUSES`, `ACTION_STATUSES`, `PUBLISHED_STATUSES` — `Set<PaperStatus>` constants reused by MyPapers, Dashboard, and Browse for filter scoping; do not duplicate locally

### `submitApi` surface (current state)

- `getSubmissionPolicy(): Promise<SubmissionPolicy>` — reads `system_policy_settings`; returns fallback `{ maxFileSizeMb: 10, allowedFileTypes: ['pdf'] }` if RLS or shape is unusable
- `getDepartments(): Promise<DepartmentRow[]>` — reads `departments`; returns `[]` on error
- `getFacultyMembers({ department, departmentId }): Promise<FacultyMember[]>` — calls `get_faculty_members` RPC; tolerates `null` / empty `departmentId`; returns `[]` on RPC error
- `searchStudents(query: string): Promise<StudentSearchResult[]>` — returns `[]` for `length(trim) < 2`; calls `search_students` RPC; post-filters self via `resolveCurrentStudentProfile()`
- `getMyDraft(paperId?: string | null): Promise<SubmitDraftPayload | null>` — scoped to current user; resolves null when no draft or on error
- `saveMyDraft(paperId: string | null, payload): Promise<{ persisted: boolean }>` — best-effort upsert with `onConflict: 'user_id,paper_id'`; failure is logged but non-fatal
- `deleteMyDraft(paperId: string | null): Promise<void>` — best-effort
- `submitResearch(input: SubmitInput): Promise<SubmitResult>` — runs profile → file read → storage upload → `research_papers` upsert → `research_authors` upsert; throws stage-prefixed errors
- `createCoAuthorInvitations(researchId, inviteeIds): Promise<{ created, skipped }>` — post-submit best-effort; uses `generatePathId()` for invite token; returns `{ created: 0, skipped: N }` on RLS failure

### `SubmitResearchScreen` integration contract

- Route: `SubmitResearch` with optional `{ resubmitPaperId?: string }` param in `RootStackParamList`
- Stack registration: `headerShown: false` (the screen renders its own header / cancel affordance internally)
- Entry point: `Submit` Button on `MyPapersScreen` — the only existing screen surface modified by this undertaking
- Post-submit: emits a success `InlineNotice`, clears local + server drafts, then `navigation.goBack()` (web parity for the `/student/my-research` redirect)
- Resubmit hydration: when `resubmitPaperId` is present, loads paper detail via `researchApi.getResearchById`, pre-fills the form (title, abstract, keywords, category, department, faculty, external notes, structured co-authors), preserves the existing `file_url` so a replacement file is optional

### Screen-level prop conventions

> REQUIRED table.

| Screen | engagementCounts | keywords | statusChip |
|---|---|---|---|
| Dashboard | ❌ | ❌ | ✅ |
| MyPapers | ❌ | ❌ | ✅ |
| Browse | ✅ | ✅ | ❌ |
| Notifications | n/a (uses `NotificationCard`) | n/a | n/a |
| Invitations | n/a (uses `InvitationCard`) | n/a | n/a |
| ResearchDetail | n/a (no `ResearchCard`; metadata strip + workflow timeline directly on screen; no `PaperStatusChip` in chrome) | n/a | n/a |

### Field-level type gotchas

> REQUIRED. Populated with every surprise discovered to date.

- `NotificationItem.is_read` — field is `is_read`, not `read`. The `NotificationCard` derives `unread = !notification.is_read`.
- `CoAuthorInvitation.created_at` — `string | undefined`; `InvitationCard` guards with `invitation.created_at != null && invitation.created_at !== ''` before rendering an `Invited:` row.
- `ResearchPaper.external_author_notes` — typed `string | string[] | null` in `src/types/domain.ts`. `SubmitResearchScreen.externalNotesFromPaper` flattens arrays via `filter(Boolean).join(', ')` and casts to `String(value)` for non-array values. Do not assume the column is always a string.
- `ResearchPaper.structured_authors` — array of `StructuredAuthorEntry` whose `author` is a `PaperAuthor` that may carry either split name fields (`first_name`, `middle_name`, `last_name`) or pre-built `fullName` / `name`. `SubmitResearchScreen.structuredCoAuthorsFromPaper` falls through both shapes before falling back to email.
- `submission_drafts` `onConflict` — client uses `'user_id,paper_id'`; deployed DB has a partial unique `uq_submission_drafts_user_null_paper` that does **not** match that key when `paper_id IS NULL`. Inserting a brand-new draft while one already exists for the user surfaces `duplicate key value violates unique constraint`. Non-blocking for submit; alignment is a christian-owned schema change.
- `get_faculty_members` / `search_students` RPC return types must match `public.users` column types exactly (`character varying` for name/email/department, `text` for `program`); changing the return signature requires `DROP FUNCTION` + `CREATE` (`42P13`) and any type mismatch surfaces as `42804`.
- `SubmitDraftFormState.coAuthors: string` is the **external co-author notes string**, not a structured co-author list. Structured co-authors live in `selectedCoAuthors: StudentSearchResult[]` in screen state. The web multipart parity duplicates this value into `coAuthors` and `externalAuthorNotes` keys on the wire (frozen contract rule 1).
- `SubmitInput.coAuthors` on `submitResearch` is the same external-notes string. `coAuthorIds` is the separate list of structured co-author user IDs and drives both `research_authors` upserts and post-submit `co_author_invitations`.
- `Platform.OS === 'web'` branching in `readSubmitFileBodyForUpload` — web stays on `fetch + arrayBuffer`; iOS/Android use `expo-file-system` `new File(uri).arrayBuffer()`. Do not unify these paths into a single `fetch(uri)` call.
- `PaperStatus` is a string union plus `string` fallback; never `switch` exhaustively over its values without a `default` branch.

### Active Supabase facades (frozen)

- `src/api/research.ts` — now hosts both `researchApi` (read paths, file access, tracking) and the new `submitApi` (submit, drafts, policy, directories, invitations)
- `src/api/notifications.ts`
- `src/api/invitations.ts`

### Auth (frozen)

- `src/context/AuthContext.tsx`
- `src/auth/fetchAppUserProfile.ts`
- `src/lib/supabase.ts`

### Frozen files (do not touch)

> REQUIRED.

- `src/api/*` (extend by adding new namespaces inside `research.ts` as already done for `submitApi`; do not rewrite `researchApi`, `notificationsApi`, or `invitationsApi` contracts)
- `src/context/AuthContext.tsx`
- `src/lib/supabase.ts`
- `src/auth/*`
- `src/storage/authStorage.ts`
- `src/types/domain.ts` (Submit Research extended this file only at additive boundaries; submit-specific shapes such as `SubmitInput`, `SubmitDraftFormState`, `DepartmentRow`, `FacultyMember`, `StudentSearchResult` live in `src/api/research.ts`, not in `domain.ts`)
- `src/navigation/types.ts` (`SubmitResearch` route already added; do not rename or remove without an explicit plan update)
- `src/navigation/AppNavigator.tsx` (stack registration already done; do not move `SubmitResearch` under tabs)
- `src/screens/main/SubmitResearchScreen.tsx` (modifications should go through a Phase 3 or Phase 4 prompt with explicit scope; do not rebuild the form layer without a plan update)
- `docs/sql/submit_research_rpcs.sql` and `docs/sql/submit_research_rls_policies.sql` (these are **records** of deployed state; edit only when christian redeploys the underlying definitions)

---

## Commit History (most recent first)

> Populated from `git log` on `feat/submit-research`.

```text
190b25e (HEAD -> feat/submit-research) docs(conventions): expand and standardize convention files
78550f8 fix(submit-research): unblock anon+RLS with RPCs, policies, and app wiring
99fe58f feat(submit-research): implement Phase 2 submission flow
266c57b docs(submit-research): complete phase 1 parity contract freeze
64f8fa7 docs: add submit research implementation plan
```

---

## Current Git State

Branch: `feat/submit-research` — working tree clean. Additional commits landed after this handoff was written (outside the handoff's context window); the working tree items previously listed as uncommitted have since been committed by Christian.

**Intended branch workflow:**

```text
feat/submit-research → dev → main
```

`main` is not to be touched until Submit Research is complete and merged to `dev` with a full validation pass (Phase 3 cross-system parity verification closed, Phase 4 exit criteria met).

---

## Next Steps

1. **Close Phase 3 formally in `docs/plans/SUBMIT_RESEARCH.md`.** Christian has informally validated cross-role interoperability, realtime notifications, and workflow history; turn that into a written Phase 3 implementation summary, decisions, and `Exit criteria met:` block in the plan using the documentation conventions established in `docs/plans/SUPABASE_MIGRATION.md`.
2. **Commit the working-tree storage fix + HIPO diagram updates** (christian-owned per `docs/conventions/commits.md`). The storage fix is the substantive change; HIPO diagrams and the handoff template touch are documentation deltas.
3. **Resolve the `submission_drafts` upsert / partial-unique mismatch.** Either align the client `onConflict` (e.g. `'user_id'` when `paper_id IS NULL`) or align the DB partial unique to match `(user_id, paper_id)` deterministically. christian owns the schema decision.
4. **Deploy and record the missing Submit Research backend items** in `docs/sql/submit_research_rls_policies.sql`: anon `INSERT` on `co_author_invitations`, schema baseline confirmation for `program_id` / `external_author_notes` / `file_storage_path` / `file_name` / `file_size`, and (optionally) a database trigger / RPC enforcing server-side `pending_faculty | pending_editor` routing from `faculty_id`.
5. **Run Phase 4 — Validation and merge readiness** per the plan: frozen-layer diff check, parity checklist closure, `npx tsc --noEmit` green, no new feature work, branch ready for the christian-led commit/merge flow into `dev`.
6. **Investigate Issue #7 (`ResearchDetail / Browse: author name shows "Unknown" for non-uploaders`)** after Submit Research merges. The fix likely follows the same SECURITY DEFINER pattern used for `get_faculty_members` / `search_students` but applied to the paper-detail author join.
7. **Implement Issue #8 (`ResearchDetail: Download button always visible — no allow_download column`)** as a post-Submit-Research backend + UI item once the column lands; the mobile facade `trackDownload` is already preserved for that day.
8. **Address Issue #5 (`Browse: category filter shows unresolved UUIDs — categories not loading`)** as a backend reconciliation item; Submit Research now reads `research_categories` directly under the new anon policy, which may have surfaced or clarified the underlying mismatch.
9. **Pick up Issue #6 (`Browse: add toggleable list and tile view`)** as a standalone enhancement after Submit Research is merged.

---

## Deferred Items (tracked as issues)

> REQUIRED. Every item has a real issue number and a timing note.

- Issue #5 — `Browse: category filter shows unresolved UUIDs — categories not loading` — backend reconciliation; pick up after Submit Research merges to `dev`.
- Issue #6 — `Browse: add toggleable list and tile view` — enhancement; post-Submit-Research roadmap.
- Issue #7 — `ResearchDetail / Browse: author name shows "Unknown" for non-uploaders` — RLS-bound; post-Submit-Research, expected to follow the SECURITY DEFINER pattern proven by `get_faculty_members` / `search_students`.
- Issue #8 — `ResearchDetail: Download button always visible — no allow_download column` — UI mitigation already shipped; reintroduce Download UI when the backend column lands.

---

## Review Convention

When Christian sends builder output for review, the minimum package is:
- `git diff` — always required
- Screenshot — only when visual feedback is requested or the change is layout/visual
- A note from Christian — only if something felt wrong during testing

Builder findings report, `git status`, and `tsc` output are not required for review.

---

## Documentation Conventions

All implementation plan updates must follow the format established in `docs/plans/SUPABASE_MIGRATION.md`:
- Phase status: `✅ **COMPLETED (stable)**` or `⏳ **NOT STARTED**`
- Completed task bullets: `- ✅`
- Pending task bullets: `- ⏳`
- Past tense implementation summaries under `**Implementation summary**`
- `**Exit criteria met:**` when phase is complete
- No excessive nesting, no bold on every line

The same conventions govern Submit Research phase updates in `docs/plans/SUBMIT_RESEARCH.md`. The Phase 1 and Phase 2 sections of that plan are already in this shape and should be the local reference for Phase 3 / Phase 4 closure wording.

---

## Commit Conventions

```text
type(scope): short description

Phase N: Label

- Bullet one
- Bullet two

Refs #issue-number
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`.

Christian handles commits. Commit messages are never included in builder prompts. The Phase line must be lifted verbatim from the active plan's phase heading, not paraphrased. The subject line should reflect the dominant outcome of the change: prefer `fix(scope):` when the dominant outcome is unblocking RLS / RPC / policy / transport errors, and `feat(scope):` when the dominant outcome is net-new product surface with no incident narrative. `Refs #N` is included only when a real GitHub issue exists; do not invent issue numbers beyond #8.

---

## Builder Prompt Convention

Always instruct the builder to:
- Read canonical docs before doing anything: `docs/PROJECT_CONTEXT.md`, the active plan (currently `docs/plans/SUBMIT_RESEARCH.md`), this handoff, and relevant `docs/conventions/*` (`builder-prompts.md`, `commits.md`, `github-issues.md`)
- Investigate codebase first and report findings before implementing
- Never use local state workarounds to simulate server-side functionality
- Run `npx tsc --noEmit` after changes
- Update `docs/plans/SUBMIT_RESEARCH.md` to reflect completion using the documentation conventions above
- Report findings before making any changes when diagnosing issues
- Include what to expect when testing and what should not change in every phase prompt
- Follow documentation conventions established in `docs/plans/SUBMIT_RESEARCH.md`
- Do not include commit messages in builder prompts — commits are handled by christian separately
- Respect the active plan's frozen file list and scope boundaries (see **Frozen files** above)

External factors (Supabase SQL, RLS policies, database queries, RPCs, bucket configuration) are handled by christian directly — not the builder. Builder output that proposes Supabase changes must surface them as findings, not edits, and they belong on the plan's "Backend asks flagged for christian" list, not in code.
