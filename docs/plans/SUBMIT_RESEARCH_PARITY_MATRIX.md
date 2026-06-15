# Submit Research Parity Matrix (Phase 1)

This artifact freezes the mobile-facing submit contract from current web behavior, with backend verification where available.

- Web authority: `C:\Users\Christian\Projects\capstone-nucleus\frontend\src\pages\student\SubmitResearch.jsx`
- Backend verification: `backend/src/routes/research.routes.js`, `backend/src/routes/auth.routes.js`, `backend/src/controllers/submission.controller.js`, `backend/src/controllers/auth.controller.js`, `backend/src/controllers/coauthorInvitation.controller.js`, `backend/src/utils/systemPolicy.js`
- RN baseline checked (read-only): `src/api/research.ts`, `src/navigation/types.ts`, `src/navigation/AppNavigator.tsx`, `src/types/domain.ts`, `src/auth/fetchAppUserProfile.ts`

## Parity Matrix

| Web UX / behavior | Web client rule | HTTP / FormData / endpoint | Server behavior (verified) | RN Phase 2 target (conceptual only) | Parity risk / RLS | Status |
|---|---|---|---|---|---|---|
| Core required fields (`title`, `abstract`, `category`) | Required in submit validation; category sourced from fetched list (legacy text may appear) | `POST /research/submit` multipart keys: `title`, `abstract`, `category` | Rejects missing required fields (`INVALID_INPUT`) | Upload-then-submit contract using anon+RLS-safe endpoint pattern | Category UUID/name mismatch can cause stale values (#5) | Parity |
| File policy and upload | New submit requires file; resubmit can omit file; UI accepts policy-driven file types/sizes | `POST /research/submit` multipart key `file`; policy from `GET /auth/submission-policy` | Enforces `systemPolicy` type/size; uploads to `research-papers` path `${userId}/${uuid}.${ext}`; stores `file_url`, `file_storage_path`, metadata | Same policy fetch + upload semantics; no service role usage | Mobile direct storage writes require policy-compatible RLS/storage rules | Parity |
| Resubmit by id | Resubmit state uses `location.state.resubmit`; file optional if keeping current | Multipart key `id` included on resubmit | Upsert by `id`; if prior status is `revision_required`, reroutes using reviewer role/previous status | Maintain explicit `id` path and resubmit no-file allowance | Incorrect resubmit routing if prior workflow fields unavailable | Parity |
| Keywords | Optional comma-separated text | Multipart key `keywords` as string | Normalized to trimmed array | Keep string-in/UI and normalize at boundary | None | Parity |
| Co-authors (structured + external notes) | Structured co-authors picked through student search; external notes typed separately | Multipart keys include both `coAuthors` and `externalAuthorNotes` (same value from external notes input); structured IDs are not sent in submit payload | Normalizes notes via `externalAuthorNotes` fallback to `coAuthors`; structured links managed in `research_authors` only when `coAuthorIds` exists; invitations handle later structured additions | Keep dual legacy note keys for wire parity; structured co-authors handled through invitation flow | Cross-user co-author identity lookup is RLS-sensitive | Parity |
| Department / program / faculty selection | Department optional; faculty presented as optional in form copy; no `programId` field in current web page | Multipart keys: `facultyId`, `department`, `departmentId`; no `programId` currently sent by web page | Accepts optional `programId` and falls back to author profile; resolves department/program labels/ids when possible; sets `faculty_id` | Preserve current web-visible fields first; treat `programId` as server-supported but not web-origin requirement | Program consistency depends on profile completeness | Parity |
| Initial status routing | Form warns if no faculty but still allows submit | `facultyId` value drives route | New submit status is `pending_faculty` if `facultyId`, else `pending_editor` | Keep identical routing semantics | Product contradiction with checklist requirement for adviser | Blocker |
| Draft restore and autosave | Restore from local storage then server draft; autosave every 30s while content exists | `GET/PUT/DELETE /research/drafts/me` with `paperId`; local key `submission_draft_${id|new}` | Draft persisted in `submission_drafts` by `user_id,paper_id` | RN local draft + server draft sync with same lifecycle | Server draft endpoint parity may require mobile-safe access path | Parity |
| Submission checklist modal | Confirm modal requires file, title, abstract, adviser before submit | Client-only gate before calling submit | No server checklist concept; server accepts missing `facultyId` | Decide and freeze one normative rule before Phase 2 | Checklist contradicts submit validator and server routing | Blocker |
| Co-author invitations post-submit | After successful submit, sends invitations for selected co-authors; failures do not roll back submit | `POST /research/:id/co-author-invitations` JSON `{ inviteeIds }` | Validates author ownership, student role, dedupe, creates pending invites + notifications + email; returns created/skipped | Keep post-submit best-effort invitation side effect | Invites require cross-user reads and writes under anon+RLS | Parity risk |
| Success behavior / navigation | Toast success, set success state, navigate after 2s to My Research | Client route push to `/student/my-research` | N/A | RN success route should map to MyPapers-equivalent screen | RN route naming differs but behavior can stay equivalent | Parity |
| Student search for co-authors | Search triggers at 2+ chars; dropdown select; avoids duplicates | `GET /auth/students/search?query=` | Returns student users with name/email/program | RN needs RLS-safe student lookup API contract | Direct `users` table queries are recursion-sensitive under RLS | Blocker |
| Faculty list filter | Fetches on department/departmentId change | `GET /research/faculty/members?department=&departmentId=` | Role-filtered faculty list, optional department scoping | RN needs parity lookup path without service role | Cross-user directory exposure under RLS | Blocker |
| PDF metadata extraction | On PDF drop, invokes AI extraction to prefill title/abstract | `POST /ai/extract-pdf` multipart `file` | Separate AI endpoint; submit does not depend on extraction | Optional helper step; should not block submit flow | RN may lack parity endpoint wiring in current stack | Deferred |
| Web-only affordance: drag/drop progress simulation | Upload progress simulated client-side (not real transport progress) | Client-only behavior | N/A | Optional UI parity; not contract-critical | None | Deferred |

## Full Client-Origin Field and Header Contract

### Transport conventions

- Auth: `Authorization: Bearer <token>` for protected calls.
- Submit: `multipart/form-data` with `file` binary and text fields.
- Drafts/invitations/search/policy: JSON or query-string over authenticated REST.

### Submit `FormData.append` keys from web submit page

- `id` (string, resubmit only)
- `file` (binary, optional when `id` exists)
- `title` (string, required)
- `abstract` (string, required)
- `keywords` (string, optional comma-separated)
- `coAuthors` (string, external/non-system notes compatibility field)
- `externalAuthorNotes` (string, same value as `coAuthors` in current web page)
- `category` (string, required)
- `facultyId` (string, optional in submit logic)
- `department` (string, optional)
- `departmentId` (string, optional)

`programId` is accepted server-side but is not currently appended by `SubmitResearch.jsx`.

## Frozen Contract v1 (Normative Rules)

1. Mobile submit payload must preserve web key names exactly, including dual `coAuthors` + `externalAuthorNotes` keys for compatibility.
2. New submissions must require a file; resubmissions with `id` must allow no new file.
3. Required text fields are `title`, `abstract`, and `category`.
4. Keywords are sent as comma string and normalized server-side.
5. Storage semantics must preserve bucket `research-papers` and path shape `${userId}/${uuid}.${ext}` with persisted `file_url` + `file_storage_path`.
6. Initial status semantics must stay `pending_faculty` when `facultyId` exists, otherwise `pending_editor`.
7. Resubmission must preserve server reroute behavior from `revision_required` using reviewer-role history.
8. Draft lifecycle must remain dual local+server (restore, periodic sync, cleanup on submit success).
9. Co-author invitations are post-submit side effects and must not fail the core submit operation.
10. No mobile service-role keys or privileged bypass to emulate web backend behavior; parity must remain compatible with anon+RLS constraints.
11. Submission scope tension with `PROJECT_CONTEXT.md` (read-first/no submit) is recorded and should be updated only when product scope is formally expanded (recommended in a later phase, not Phase 1).

## Blockers

- **Checklist contradiction (Owner: product):** current web checklist requires adviser, while submit logic and server allow no adviser and route to `pending_editor`.
- **Student/faculty lookup under mobile RLS (Owner: christian SQL/RLS):** web relies on backend service-role reads; mobile needs policy-safe equivalent (likely RPC-backed or constrained views).
- **Schema compatibility fallback risk (Owner: christian backend/schema):** backend still includes fallback paths for optional columns (`program_id`, `external_author_notes`, `file_storage_path`); Phase 2 needs confirmed baseline.

## Resolved Ambiguities

- `programId` is **server-supported but not client-origin** in current web submit page.
- Resubmit without file is valid when `id` is present.
- `coAuthors` and `externalAuthorNotes` are both sent, with duplicate values from the external notes field.
- Post-submit invitation failures are non-blocking relative to successful primary submission.

## Deferred Items

- RN-level parity UX for drag/drop-like upload affordances and simulated progress.
- PDF extraction parity if RN endpoint wiring is unavailable in Phase 2 initial slice.

## Recommended Phase 2 First Slice (ordering only)

1. Wire submit policy + categories + department/faculty lookup contracts and finalize checklist/adviser decision.
2. Implement core multipart submit contract (new + resubmit) with exact field names and status semantics.
3. Add draft restore/autosave/delete lifecycle.
4. Add co-author search and invitation side effects with non-blocking error handling.
5. Add optional PDF metadata extraction helper and final UX polish once core contract is stable.
