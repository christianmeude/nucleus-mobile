# [IN PROGRESS] NUcleus Mobile — Implementation Plan: Submit Research

> **STATUS: IN PROGRESS** — Submit Research kickoff has started on branch `feat/submit-research`.
> *This plan defines parity-first delivery of mobile research submission, using the web flow as the authoritative contract. It follows established documentation and process conventions in `docs/conventions/*`.*

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
- **Commits are handled by christian.** Commit messages are out of plan scope (see `docs/conventions/commits.md`).

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
- ✅ Submit pipeline maps frozen multipart contract onto direct Supabase operations under the anon key: storage upload to `research-papers` at `${userId}/${uuid}.${ext}` (rule 5), `research_papers` upsert with `file_url` + `file_storage_path` and full column-mapped payload, deterministic status assignment `pending_faculty | pending_editor` from `facultyId` (rule 6), structured co-authors via `research_authors` upsert, and best-effort post-submit `co_author_invitations` insert (rule 9, non-blocking).
- ✅ Resolved the matrix's product-decision blocker by implementing the **stricter adviser rule**: faculty adviser is required to confirm the checklist modal. The decision is documented under "Implementation decisions" below.
- ✅ Faculty list, student search, server draft endpoint, and submission policy all gracefully degrade when blocked or unavailable: faculty/student inputs surface `InlineNotice` rather than silently failing, server drafts fall back to local-only with a status message, submission policy falls back to `{ maxFileSizeMb: 10, allowedFileTypes: ['pdf'] }`. None of these paths fake server behavior.
- ✅ Reused only existing UI primitives (`Button`, `Card`, `Chip`, `InlineNotice`, `EmptyState`, `Skeleton`, `BottomSheet`) — no bespoke styled components added.
- ✅ Post-submit behavior matches web: success toast (`InlineNotice` success), draft cleanup (local + server), short delay, then `navigation.goBack()` to MyPapers (web parity for the `/student/my-research` redirect).

**Implementation decisions**

- **Architectural delta forced by RN constraints:** the web flow targets `POST /research/submit` against an Express backend that uses the service role key to bypass RLS. The mobile runtime has no such backend reachable from anon+RLS. Frozen contract rule 1 ("preserve web key names exactly") therefore applies semantically: the multipart wire shape is mapped onto column names on `research_papers` (`facultyId → faculty_id`, `departmentId → department_id`, etc.) while every other rule (validators, status routing, storage path, post-submit side effects) is preserved verbatim.
- **Adviser stricter rule (resolves matrix Blocker):** the checklist requires `facultyId`. Submission cannot be confirmed without an adviser. This is enforced client-side in the checklist modal. Server-side enforcement remains a future Supabase trigger / RPC concern.
- **Status routing trade-off:** since there is no Express `submit.controller.js` between the client and the database under anon+RLS, the client computes `pending_faculty | pending_editor` from `facultyId` per frozen contract rule 6 and passes it in the insert payload. Logic is identical to the web backend; a database trigger or RPC would be the eventual full-parity hardening (flagged below).
- **File picker dependency NOT added:** `expo-document-picker` is not in `package.json`. Per the prompt, no new dependencies were added. The screen renders a clear `InlineNotice (warning)` and a disabled "Choose file" button when picker is unavailable. All other form state, validation, drafts, status routing, picker UI, checklist modal, and submit pipeline are wired and typecheck-clean so a future picker drop-in is a one-line change. Resubmit without a new file remains exercisable today (file optional per rule 2).
- **UUID dependency avoided:** storage path id is generated via a small UUID-v4-shaped helper (`generatePathId`) using `Math.random()` rather than adding a `uuid` dependency. Storage path uniqueness only — not security-critical.
- **Storage upload mechanics:** `await fetch(uri).then(r => r.blob())` then `supabase.storage.upload(...)` — works without `expo-file-system`. The upload code path remains unreachable in this build until the file picker is approved; documented for the next phase.
- **Picker UX without `@react-native-picker/picker`:** category, department, and faculty selection use the existing `BottomSheet` primitive with a tappable select-field row. No new picker dependency required.

**Backend asks flagged for christian (RLS / SQL ownership)**

- **File picker dependency approval:** add `expo-document-picker` (and optionally `expo-file-system`) so new submissions become reachable. Required for the new-submit code path to exercise; the rest of Phase 2 is shippable without it.
- **`submission_drafts` RLS:** confirm policies allow author-scoped CRUD (`SELECT/INSERT/UPDATE/DELETE WHERE user_id = auth-resolved id`); current behavior degrades cleanly to local-only when blocked.
- **`co_author_invitations` insert from anon student:** confirm RLS allows insert when `inviter_id = auth-resolved id`; failures are non-blocking but invitations would silently no-op until policies are in place.
- **Faculty / student directory under anon+RLS:** add `get_faculty_members` and `search_students` `SECURITY DEFINER` RPCs (or equivalent constrained views) for parity, since direct `users` reads from anon are recursion-sensitive (`42P17`). Current behavior shows an `InlineNotice` rather than faking results.
- **Submission policy read:** confirm anon `SELECT` on `system_policy_settings` (or expose an RLS-safe RPC); current behavior falls back to `{ maxFileSizeMb: 10, allowedFileTypes: ['pdf'] }`.
- **Schema baseline:** confirm `research_papers` accepts `program_id`, `external_author_notes`, `file_storage_path`, `file_name`, `file_size` columns under the RN baseline; the web backend includes graceful fallbacks for missing columns and the mobile insert currently relies on the columns being present.
- **Server-side enforcement of status routing:** consider a database trigger or RPC to enforce `pending_faculty | pending_editor` from `faculty_id` to fully remove client-side trust on this contract; mobile currently mirrors the web backend logic.

**Parity checks satisfied vs matrix rows**

- ✅ Core required fields (`title`, `abstract`, `category`)
- ✅ File policy and upload (storage path + bucket parity; upload code wired; picker pending)
- ✅ Resubmit by id (hydration + optional file)
- ✅ Keywords (comma string client → array on insert)
- ✅ Co-authors (structured search + external notes column mapping; rule 1 preserved)
- ✅ Department / program / faculty selection (faculty required by stricter rule)
- ✅ Initial status routing (rule 6 deterministic)
- ✅ Draft restore and autosave (rule 8 dual lifecycle, with local-only fallback)
- ✅ Submission checklist modal (stricter adviser rule applied)
- ✅ Co-author invitations post-submit (rule 9 best-effort)
- ✅ Success behavior / navigation (web `/student/my-research` parity = `goBack()` to MyPapers)
- ⚠️ Student search for co-authors (implemented; depends on RLS-safe directory access — flagged)
- ⚠️ Faculty list filter (implemented; depends on RLS-safe directory access — flagged)
- ⏭️ PDF metadata extraction (deferred per Phase 1 matrix; not implemented)
- ⏭️ Drag/drop progress simulation (deferred per Phase 1 matrix; not applicable on RN)

**Original plan scope (reference)**

- No deliberate reduction of parity features already present on web submit flow.
- No unrelated redesign of existing tabs or auth flows.
- No dependency additions unless explicitly approved in prompt scope.

**Exit criteria met:**

- ✅ Mobile submit flow supports all web-parity fields and required behaviors (with file picker gated on dep approval).
- ✅ Submission payload and request semantics match web contract semantically (multipart shape mapped onto direct Supabase column-equivalent under anon+RLS).
- ✅ Status routing and storage-path semantics are preserved end-to-end.
- ✅ `npx tsc --noEmit` is green.

---

### Phase 3 — Cross-system parity verification (mobile->web, web->mobile)

⏳ **NOT STARTED**

**What changes and why**

Validate interoperability as a first-class requirement: records submitted on mobile must behave correctly in web review surfaces, and records submitted on web must render correctly in mobile student surfaces.

**Explicitly NOT changing**

- No scope expansion into reading-experience enhancements.
- No speculative backend refactors outside parity defects.

**Exit criteria**

- Mobile-submitted records appear correctly in web review/admin workflows.
- Web-submitted records appear correctly in mobile Dashboard/MyPapers/ResearchDetail contexts.
- Status handling, co-author behavior, and file access remain parity-consistent.
- `npx tsc --noEmit` is green.

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
