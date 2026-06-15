# [IN PROGRESS] NUcleus Mobile — Implementation Plan: Submit Research

> **STATUS: IN PROGRESS** — Submit Research kickoff has started on branch `feat/submit-research`.
> *This plan defines parity-first delivery of mobile research submission, using the web flow as the authoritative contract. It follows established documentation and process conventions in `docs/CONVENTIONS.md`.*

**Canonical product context:** [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)  
**Primary design reference:** [PRODUCT_ROADMAP.md](../PRODUCT_ROADMAP.md)  
**Latest execution baseline:** [HANDOFF_U-O_PHASE-10.md](../handoffs/HANDOFF_U-O_PHASE-10.md)

---

## 1. Constraints (must hold for every phase)

- **Web parity is non-negotiable.** The authoritative submission contract is the web screen at `C:\Users\Christian\Projects\capstone-nucleus\frontend\src\pages\student\SubmitResearch.jsx` and its backend handlers.
- **No intentional mobile divergence** in field schema, validation rules, payload shape, storage path convention, initial status, or post-submit behavior.
- **No MVP slicing of existing web capabilities.** If web does it in the current submit flow, mobile does it too.
- **Architecture safety remains in force.** Migration and UI-overhaul baselines are treated as stable unless explicitly changed by this plan.
- **Run** `npx tsc --noEmit` **after every code change.** Green typecheck is required at each phase exit.
- **Commits are handled by christian.** Commit messages are out of plan scope (see `docs/CONVENTIONS.md` §2).

---

## 2. Parity contract snapshot (from web source)

Submission behavior extracted from web `SubmitResearch.jsx` + web backend `submission.controller.js` / `research.routes.js`:

- **Core client-origin fields:** `title`, `abstract`, `keywords`, `category`, `facultyId`, `department`, `departmentId`, `coAuthors`, `externalAuthorNotes`, optional `id` (resubmission), and file.
- **Server-supported but not currently client-origin:** `programId` (accepted by backend handlers but not emitted by current web submit page).
- **Validation gates:**
  - New submission requires file; resubmission (`id` present) can proceed without new file.
  - Required text fields: `title`, `abstract`, `category`.
  - File size/type are policy-driven via `/auth/submission-policy` and backend `systemPolicy`.
- **Payload contract:** `multipart/form-data` sent to `/research/submit` with form fields; `keywords` is comma string on client and normalized to trimmed array server-side.
- **Storage path convention:** upload to bucket `research-papers` using `${userId}/${uuidv4()}.${ext}` and persist both `file_url` and `file_storage_path`.
- **Initial status convention:** new submit routes to `pending_faculty` when `facultyId` exists, otherwise `pending_editor`.
- **Post-submit behavior:** optional co-author invitations, draft cleanup (local + server), success state/toast, redirect to My Research.

---

## 3. Phased plan

Each phase declares scope and exit criteria; completed phases also record implementation summary and traceable outcomes.

### Phase 1 — Web parity mapping + contract freeze

✅ **COMPLETED (stable)**

**Implementation summary**

- ✅ Delivered parity artifact: `docs/plans/SUBMIT_RESEARCH_PARITY_MATRIX.md` as the Phase 1 review surface for web-to-mobile submit contract mapping.
- ✅ Frozen contract v1 captured from verified web+backend behavior, including fields, validators, payload shape, storage semantics, initial status routing, resubmit behavior, draft lifecycle, and post-submit side effects.
- ✅ Captured full client-origin request contract, including duplicate multipart keys `coAuthors` and `externalAuthorNotes`, and documented `programId` as server-supported but not currently emitted by the web submit page.
- ✅ Recorded blockers, resolved ambiguities, and deferred items with owner suggestions so Phase 2 implementation can proceed without re-running parity discovery.
- ✅ Recorded active scope tension that `PROJECT_CONTEXT.md` still describes submission as out-of-scope, without expanding that document in Phase 1.

**Implementation decisions**

- Chose a dedicated parity artifact (`SUBMIT_RESEARCH_PARITY_MATRIX.md`) instead of duplicating the full matrix in this plan file.
- Kept §2 as a compact snapshot and used this phase block for completion traceability, including the `programId` correction context.

**Original plan scope (reference)**

- No mobile submission code yet.
- No backend schema or SQL work from mobile side.
- No route renames or role-model rewrites.

**Exit criteria met:**

- ✅ A parity matrix exists (web field/validator/payload/status/storage/behavior -> mobile target).
- ✅ Ambiguities are resolved or explicitly tracked as blockers.
- ✅ `npx tsc --noEmit` is green.

---

### Phase 2 — Submission flow implementation (UI + validation + upload + insert)

✅ **COMPLETED (stable)**

**Implementation summary**

- ✅ Added `submitApi` namespace to [src/api/research.ts](../../src/api/research.ts) with `submitResearch`, `getSubmissionPolicy`, `getDepartments`, `getFacultyMembers`, `searchStudents`, `getMyDraft`, `saveMyDraft`, `deleteMyDraft`, and `createCoAuthorInvitations`. Existing `researchApi` behavior is unchanged.
- ✅ Created [src/screens/main/SubmitResearchScreen.tsx](../../src/screens/main/SubmitResearchScreen.tsx) implementing the full web parity form: title, abstract, keywords, category, faculty adviser, department, structured co-authors via search, external co-author notes, file attachment, and resubmit hydration from `resubmitPaperId`.
- ✅ Added `SubmitResearch: { resubmitPaperId?: string } | undefined` to [src/navigation/types.ts](../../src/navigation/types.ts) and wired the screen as a stack route alongside `ResearchDetail` in [src/navigation/AppNavigator.tsx](../../src/navigation/AppNavigator.tsx). All existing route names, params, tab order, and gating logic are preserved.
- ✅ Added a small `Submit` entry-point Button to [src/screens/main/MyPapersScreen.tsx](../../src/screens/main/MyPapersScreen.tsx) (the only existing screen touched, and only for entry-point wiring matching web's `/student/my-research` host page).
- ✅ Implemented dual draft lifecycle per frozen contract rule 8: local AsyncStorage at `submission_draft_${id|new}` plus best-effort server `submission_drafts` upsert on a 30-second interval; both cleared on successful submit. Local draft acts as the resilient fallback when the server table is RLS-blocked or unavailable.
- ✅ Submit pipeline maps frozen multipart contract onto direct Supabase operations under the anon key: storage upload to `research-papers` at `${userId}/${uuid}.${ext}` (rule 5), `research_papers` upsert with `file_url` + `file_storage_path` and full column-mapped payload, deterministic status assignment `pending_faculty | pending_editor` from `facultyId` (rule 6), structured co-authors via `research_authors` upsert, and best-effort post-submit `create_co_author_invitations` SECURITY DEFINER RPC (rule 9, non-blocking).
- ✅ Resolved the matrix's product-decision blocker by implementing the **stricter adviser rule**: faculty adviser is required to confirm the checklist modal. The decision is documented under "Implementation decisions" below.
- ✅ Faculty and student directory data use deployed `get_faculty_members` / `search_students` RPCs (see `docs/sql/submit_research_rpcs.sql`); empty RPC results surface the bottom-sheet `EmptyState` only—no separate faculty/student availability `InlineNotice`. Submission policy loads from `system_policy_settings` via `getSubmissionPolicy` when the anon read policy allows; `{ maxFileSizeMb: 10, allowedFileTypes: ['pdf'] }` is retained **only** as a client fallback when the policy read fails or returns unusable data. Server drafts remain best-effort with local AsyncStorage fallback and a status message when server persist fails. None of these paths fake server behavior.
- ✅ Reused only existing UI primitives (`Button`, `Card`, `Chip`, `InlineNotice`, `EmptyState`, `Skeleton`, `BottomSheet`) — no bespoke styled components added.
- ✅ Post-submit behavior matches web: success toast (`InlineNotice` success), draft cleanup (local + server), short delay, then `navigation.goBack()` to MyPapers (web parity for the `/student/my-research` redirect).
- ✅ Added invitation-accept parity: accepting a co-author invitation now attempts a `research_authors` insert for the invitee, and `getMyPapers` merges co-authored papers (deduped by id).

**Implementation decisions**

- **Architectural delta forced by RN constraints:** the web flow targets `POST /research/submit` against an Express backend that uses the service role key to bypass RLS. The mobile runtime has no such backend reachable from anon+RLS. Frozen contract rule 1 ("preserve web key names exactly") therefore applies semantically: the multipart wire shape is mapped onto column names on `research_papers` (`facultyId → faculty_id`, `departmentId → department_id`, etc.) while every other rule (validators, status routing, storage path, post-submit side effects) is preserved verbatim.
- **Adviser stricter rule (resolves matrix Blocker):** the checklist requires `facultyId`. Submission cannot be confirmed without an adviser. This is enforced client-side in the checklist modal. Server-side enforcement remains a future Supabase trigger / RPC concern.
- **Status routing trade-off:** since there is no Express `submit.controller.js` between the client and the database under anon+RLS, the client computes `pending_faculty | pending_editor` from `facultyId` per frozen contract rule 6 and passes it in the insert payload. Logic is identical to the web backend; a database trigger or RPC would be the eventual full-parity hardening (flagged below).
- **UUID dependency avoided:** storage path id is generated via a small UUID-v4-shaped helper (`generatePathId`) using `Math.random()` rather than adding a `uuid` dependency. Storage path uniqueness only — not security-critical.
- **Storage upload mechanics:** `await fetch(uri).then((r) => r.blob())` then `supabase.storage.upload(...)` — works without `expo-file-system`. After follow-up wiring, `DocumentPicker.getDocumentAsync` (`expo-document-picker` ~14.0.8) supplies the `uri` for new-file submits on supported devices; resubmit with `id` and no replacement file remains supported per rule 2.
- **BottomSheet selects + RPC directory + file attachment:** category, department, and faculty use the existing `BottomSheet` with tappable select rows (no `@react-native-picker/picker`). `submitApi.getFacultyMembers` / `searchStudents` call `get_faculty_members(p_department text, p_department_id uuid)` and `search_students(p_query text)` instead of direct `public.users` reads; empty UUID `p_department_id` coerces to `null`; RPC errors return `[]` with `console.warn`; student results post-filter self via `resolveCurrentStudentProfile()`; the mapper accepts split name fields or RPC `full_name`. File pick uses `DocumentPicker.getDocumentAsync` with policy-driven MIME hints (web `TYPE_TO_MIME` parity) and post-pick extension/size checks. Removed the stale "Submission is currently disabled in this build" notice, `filePickerAvailable`, and `facultyAvailable` / `studentSearchAvailable` heuristics—empty directory lists use the bottom-sheet `EmptyState` copy only ("No faculty available — try selecting a different department or contact your administrator.") because the API contract returns `[]` for both empty data and RPC failure.

**Backend asks flagged for christian (RLS / SQL ownership)**

- ✅ **File picker dependency approval:** `expo-document-picker` installed and wired (`~14.0.8` in `package.json`); file picker is live in `SubmitResearchScreen`.
- ✅ **`submission_drafts` RLS:** four author-scoped policies applied (`SELECT` / `INSERT` / `UPDATE` / `DELETE`) using email-resolved `user_id` (`public.users` matched to `auth.email()`), matching project RLS convention; record in `docs/sql/submit_research_rls_policies.sql`.
- ✅ **Co-author invitation RPC migration:** `createCoAuthorInvitations` now calls deployed `create_co_author_invitations(p_research_id uuid, p_invitee_ids uuid[])`; mobile no longer generates tokens/expiry values, sets `inviter_id`, inserts directly into `co_author_invitations`, or depends on anon insert RLS for this path.
- ✅ **Faculty / student directory under anon+RLS:** `get_faculty_members(p_department text, p_department_id uuid)` and `search_students(p_query text)` deployed as `SECURITY DEFINER` with return columns using `character varying` / `text` aligned to `public.users` (`email`, `first_name`, `middle_name`, `last_name`, `department` as `character varying`; students include `program text`); `anon` and `authenticated` granted `EXECUTE`; record in `docs/sql/submit_research_rpcs.sql`.
- ✅ **Submission policy read:** policy `anon can read submission policy` — `SELECT` on `system_policy_settings` for `anon`; app reads live values (e.g. **95 MB**, **`['pdf', 'doc']`**); record in `docs/sql/submit_research_rls_policies.sql`.
- **Schema baseline:** confirm `research_papers` accepts `program_id`, `external_author_notes`, `file_storage_path`, `file_name`, `file_size` columns under the RN baseline; the web backend includes graceful fallbacks for missing columns and the mobile insert currently relies on the columns being present.
- **Server-side enforcement of status routing:** consider a database trigger or RPC to enforce `pending_faculty | pending_editor` from `faculty_id` to fully remove client-side trust on this contract; mobile currently mirrors the web backend logic.

**Parity checks satisfied vs matrix rows**

- ✅ Core required fields (`title`, `abstract`, `category`)
- ✅ File policy and upload (storage path + bucket parity; upload code wired; picker live)
- ✅ Resubmit by id (hydration + optional file)
- ✅ Keywords (comma string client → array on insert)
- ✅ Co-authors (structured search + external notes column mapping; rule 1 preserved)
- ✅ Department / program / faculty selection (faculty required by stricter rule)
- ✅ Initial status routing (rule 6 deterministic)
- ✅ Draft restore and autosave (rule 8 dual lifecycle, with local-only fallback)
- ✅ Submission checklist modal (stricter adviser rule applied)
- ✅ Co-author invitations post-submit (rule 9 best-effort)
- ✅ Success behavior / navigation (web `/student/my-research` parity = `goBack()` to MyPapers)
- ✅ Student search for co-authors (live via `search_students` RPC; smoke-tested)
- ✅ Faculty list filter (live via `get_faculty_members` RPC; smoke-tested — 3 faculty confirmed)
- ⏭️ PDF metadata extraction (deferred per Phase 1 matrix; not implemented)
- ⏭️ Drag/drop progress simulation (deferred per Phase 1 matrix; not applicable on RN)

**Original plan scope (reference)**

- No deliberate reduction of parity features already present on web submit flow.
- No unrelated redesign of existing tabs or auth flows.
- No dependency additions unless explicitly approved in prompt scope.

**Exit criteria met:**

- ✅ Mobile submit flow supports all web-parity fields and required behaviors (file picker live via `expo-document-picker` wired in `SubmitResearchScreen`).
- ✅ Submission payload and request semantics match web contract semantically (multipart shape mapped onto direct Supabase column-equivalent under anon+RLS).
- ✅ Status routing and storage-path semantics are preserved end-to-end.
- ✅ `npx tsc --noEmit` is green.

---

### Phase 3 — Cross-system parity verification (mobile->web, web->mobile)

✅ **COMPLETED (stable)**

**Implementation summary**

- ✅ File read error (SDK 56): `readSubmitFileBodyForUpload` rewritten to use `fetch()` uniformly; `ExpoFsFile` removed
- ✅ Co-authored papers in invitee My Papers: `loadResearchRows` extended with two-query merge and dedupe by paper id
- ✅ `research_authors` row on invitation accept: best-effort upsert in `respondToInvitation` (try/catch, non-blocking)
- ✅ Invitation + notification regression fixed: `create_co_author_invitations` RPC had `42702` ambiguous column — `invitee_id` in EXISTS predicate collided with `RETURNS TABLE(invitee_id uuid)` output var; fixed with `cai.` alias
- ✅ `co_author_invitations` SELECT policy confirmed email-resolved; invitees can see their own invitations
- ✅ Cross-user author display (#7): `public.users` open SELECT for `authenticated` role deployed
- ✅ `research_authors` invitee INSERT timing: policy updated to `status IN ('pending', 'accepted')` to allow post-accept insert
- ✅ `research_authors` DELETE on resubmit: new policy + mobile delete call added for web parity (clear non-primary rows so invitees can be re-invited fresh)
- ✅ Co-author rows not inserted at submit time: removed at-submit co-author upsert; rows created only on invitation accept
- ✅ Notification for invitee includes paper title via RPC
- ✅ SQL snapshots: `co_author_invitations_rpcs.sql`, `research_authors_rls_policies.sql`, `co_author_invitations_rls_policies.sql`, `users_rls_policies.sql`
- ✅ Manually validated by Christian: invitations and notifications reach invitees; co-authored papers appear in invitee My Papers; co-author chips show correctly; author names resolve

**Implementation decisions**

- Open SELECT on `public.users` for `authenticated` (vs. PAPER_SELECT RPC restructure): Christian approved; appropriate for a closed university app where all students can see each other's basic profiles
- Co-author rows on accept, not submit: mirrors web backend — the invitation flow creates the `research_authors` row, not the submit flow
- Resubmit clears non-primary co-author rows: web parity — prior co-authors must be re-invited on each resubmission

**Exit criteria met:**

- ✅ Mobile-submitted records appear correctly in web review/admin workflows
- ✅ Web-submitted records appear correctly in mobile Dashboard/MyPapers/ResearchDetail contexts
- ✅ Status handling, co-author behavior, and file access are parity-consistent
- ✅ `npx tsc --noEmit` is green

---

### Phase 4 — Validation and merge readiness

⏳ **NOT STARTED**

**What changes and why**

Final guardrail phase: static checks, parity checklist closure, and merge-readiness verification with no new feature work.

**Explicitly NOT changing**

- No new feature additions.
- No post-freeze contract drift.

**Exit criteria**

- Frozen-layer checks and parity checklist pass.
- Docs/handoff updates reflect final state.
- Branch is ready for christian-led commit/merge flow.
- `npx tsc --noEmit` is green.

---

## 4. Validation strategy

- Validate contract parity by category: fields, validation, payload, storage, status, and post-submit behavior.
- Verify upload/storage behavior including bucket target and `file_storage_path` convention.
- Verify status outcomes for both paths:
  - with adviser/faculty assignment
  - without adviser/faculty assignment
- Perform cross-surface verification:
  - mobile submit -> web review visibility
  - web submit -> mobile student visibility
- Run `npx tsc --noEmit` after each substantive phase.

---

## 5. Non-goals (explicit)

- Building a mobile-only submission flow that diverges from web behavior.
- Deferring existing web submit capabilities under an MVP shortcut.
- Reading-experience work (`feat/reading-experience`) in this undertaking.
- Unrelated UI-overhaul revisits outside submit-parity requirements.

---

## 6. Anticipated file impact (RN)

Likely touch points for this undertaking:

- Screen layer:
  - `src/screens/main/*` (new submit screen or integration point under student flow)
- Navigation:
  - `src/navigation/AppNavigator.tsx` (wiring only, contracts preserved unless approved)
  - `src/navigation/types.ts` (only if parity requires explicit route typing changes)
- API facade:
  - `src/api/research.ts` (submit endpoint, draft endpoints, invitation hooks as needed)
  - `src/api/*` helpers if submit policy/search dependencies are required
- Domain/model adapters:
  - request/response mappers tied to submission payload normalization
- Shared UI primitives/components:
  - file picker/upload state, validation notices, checklist/confirmation patterns
- Utilities:
  - formatting/normalization helpers needed to preserve payload parity

---

## 7. Success criteria (project level)

- Mobile submit behavior is parity-equivalent to current web submit flow.
- No intentional drift in schema, validators, payload, storage convention, status initialization, or post-submit flow.
- Cross-system visibility parity (mobile->web and web->mobile) is confirmed.
- `npx tsc --noEmit` is green at completion.
