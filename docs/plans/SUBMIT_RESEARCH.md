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

- **Core fields:** `title`, `abstract`, `keywords`, `category`, `facultyId`, `department`, `departmentId`, optional `programId`, `coAuthors`, `externalAuthorNotes`, optional `id` (resubmission), and file.
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

### Phase 1 — Web parity mapping + contract freeze

⏳ **NOT STARTED**

**What changes and why**

Freeze the submission contract before implementation to prevent drift: document exact fields, validators, API keys, status transitions, storage path conventions, and post-submit side effects from web source.

**Explicitly NOT changing**

- No mobile submission code yet.
- No backend schema or SQL work from mobile side.
- No route renames or role-model rewrites.

**Exit criteria**

- A parity matrix exists (web field/validator/payload/status/storage/behavior -> mobile target).
- Ambiguities are resolved or explicitly tracked as blockers.
- `npx tsc --noEmit` is green.

---

### Phase 2 — Submission flow implementation (UI + validation + upload + insert)

⏳ **NOT STARTED**

**What changes and why**

Implement mobile submit flow matching the frozen parity contract: screen/form state, file selection, validation messaging, API submission, draft behavior, and post-submit routing.

**Explicitly NOT changing**

- No deliberate reduction of parity features already present on web submit flow.
- No unrelated redesign of existing tabs or auth flows.
- No dependency additions unless explicitly approved in prompt scope.

**Exit criteria**

- Mobile submit flow supports all web-parity fields and required behaviors.
- Submission payload and request semantics match web contract.
- Status routing and storage-path semantics are preserved end-to-end.
- `npx tsc --noEmit` is green.

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
