# NUcleus Mobile — Project Context

This document is the canonical product and system overview for the NUcleus Mobile application. It presents the product purpose, audience, core features, typical user flows, minimal architecture, navigation model, and domain expectations used for onboarding engineers and guiding product decisions.

## Purpose

NUcleus Mobile is a focused research reader and student workspace for enrolled students at National University — Dasmariñas. The app helps students discover, read, monitor, and submit research outputs relevant to their studies.

Core user value:
- Fast, reliable access to published research and personal paper status.
- A simple reading experience for PDFs and paper metadata.
- A personal view of the student's papers, invitations, and notifications.
- The ability to submit and resubmit research papers directly from mobile with full web parity.

## Audience

- Primary: enrolled students (role: `student`).
- Non-students (faculty, staff, admin) are not the intended audience; the app surfaces a limited/unsupported experience for them.

## In-scope (What the app provides)

- Student authentication and session persistence.
- Browse published research with search and category filters.
- Research detail views showing metadata, available workflow notes, and file access.
- My Papers: a list and filters scoped to the signed-in student's papers.
- Dashboard: personal summary and lightweight analytics derived from the student's papers.
- Notifications: listing, unread indicators, and mark-as-read behavior.
- Co-author invitations: view, accept, and decline.
- Research submission: students can submit new research papers and resubmit papers requiring revision, with draft autosave, file attachment, faculty adviser selection, structured co-author invitations, and full parity with the web submission flow.

## Out-of-scope (What the app does NOT provide)

- Editorial and administrative workflows (faculty review, dean approval, admin actions).
- Faculty, admin, or staff dashboards and management features.
- Research submission by non-students.

These exclusions keep the mobile product focused and safe for student use.

## High-level user flows

- Login → Dashboard
    - Student signs in or restores a session and lands on a personal Dashboard summarizing recent activity.

- Browse → Research Detail → Open PDF
    - Student discovers papers, opens a detail view for metadata and workflow context, then opens the PDF in-app or via an external viewer where permitted.

- My Papers / Dashboard
    - Student inspects their own papers, views workflow status and recent changes; Dashboard provides quick counts and recents for fast insight.

- Notifications / Invitations
    - Notifications present recent updates; students can mark items read or open related content. Invitations list shows co-author invitations with accept/decline actions and updated state.

- My Papers → Submit Research → Confirmation → My Papers
    - Student initiates a new submission or resubmission from My Papers, completes the form (title, abstract, keywords, category, faculty adviser, department, co-authors, file), and is returned to My Papers on successful submit.

These flows define the UX contract and are intentionally implementation-agnostic.

## Minimal system architecture (conceptual)

- Mobile App → Supabase (Authentication, Database, Storage)
- Web Backend → Admin / provisioning (separate from mobile runtime data flow)

Notes:
- The mobile client relies on a hosted platform (Supabase) for authentication, data, and file storage. The web backend is responsible for administrative and provisioning workflows and is not part of the mobile runtime data path. This section remains conceptual and does not prescribe implementation details.

## Navigation model

- Root stack:
    - `Login` — authentication screen
    - `UnsupportedRole` — shown to non-students
    - `StudentTabs` — bottom tabs for authenticated students
- Student tabs:
    - `Dashboard`
    - `MyPapers`
    - `Browse`
    - `Notifications`
    - `Invitations`
- Additional stack screens:
    - `ResearchDetail` — full paper details and file access; params: `{ paperId: string }`
    - `SubmitResearch` — research submission and resubmission form; params: `{ resubmitPaperId?: string } | undefined`

Consult routing and gating in `src/navigation/AppNavigator.tsx` and `src/navigation/types.ts` when implementing behavior.

## Data and domain expectations

- Core domain types are defined in `src/types/domain.ts` and should be treated as the canonical shapes for the app's UI and facades.
- Submit Research-specific types (`SubmitInput`, `SubmitDraftFormState`, `DepartmentRow`, `FacultyMember`, `StudentSearchResult`) live in `src/api/research.ts`, not in `domain.ts`.
- Typical entities:
    - Research paper: title, abstract, authors, status, file reference
    - User profile: identity fields, display name, role
    - Notification: id, title, body, timestamp, read state
    - Invitation: id, paper reference, inviter, status
    - Submission draft: form state persisted locally and best-effort to `submission_drafts` table

Design guidance: map backend rows to these shapes without renaming fields unnecessarily.

**Known data/storage gap (2026-07-04):** 26 mock/smoke `research_papers` rows (8 seeded by `smoke.student@nucleus.local` + 18 junk-titled QA scratch rows) were hard-deleted from `public.research_papers` (cascaded to child tables). Their PDF files were **not** removed from the `research-papers` storage bucket — direct SQL against `storage.objects` is blocked by a protect-delete trigger, and cleanup requires the Storage API with the service-role key, which mobile-scoped tooling does not hold. These files are orphaned (unreferenced by any DB row) but still occupy the bucket under folders `7a857672-628a-4889-be7b-61ffba420056/`, `0e0955f8-2d55-419a-a2e2-c834dfb535e1/`, `0eb203d0-fb60-4c38-9f0a-e60383dc7267/`, and `a8f223c6-7afd-4fa1-a0a9-aa4f168edc00/`. Delete manually via Supabase Studio → Storage → `research-papers` when convenient.

## Access control & role model

- Authoritative user profile: the application relies on a canonical user profile record as the authoritative user identity (for example, the `public.users` profile used by backend services). A valid, complete application profile is REQUIRED for an authenticated mobile session; users without a complete profile are not considered provisioned for the student product.
- Role model: only users with the `student` role may access the student product experience. Non-student roles are presented with the `UnsupportedRole` flow and do not gain access to student tabs or data-scoped screens.
- Ownership: personal data and views (for example `My Papers`, Dashboard summaries, submission drafts) are scoped to the signed-in student unless explicitly documented as shared or global.

## Key source areas for onboarding

- App entry: `App.tsx`, `index.ts`
- Auth surface: `src/context/AuthContext.tsx`
- Navigation: `src/navigation/AppNavigator.tsx`, `src/navigation/types.ts`
- Domain types: `src/types/domain.ts`
- High-level API facades: `src/api/*` — `researchApi` for read paths and file access, `submitApi` for submission, drafts, policy, directories, and co-author invitations

## Environment and configuration (conceptual)

- The app requires runtime configuration for authentication, data, and storage endpoints. Provide these via environment variables or build-time configuration and avoid committing secrets.

## How to use this document

- Use this file as the product-level source of truth for scope, UX contracts, and onboarding.
- For implementation details or migration history, consult service-specific docs or the codebase; this document intentionally avoids step-by-step migration instructions.

## Principles

- Student-only product experience: only users with the `student` role are permitted into the student product experience; non-student roles must be redirected to the `UnsupportedRole` flow.
- Student-first product: the mobile app serves students as readers and authors; it provides no editorial, administrative, or faculty-facing capabilities.
- Preserve navigation and UX contracts; avoid breaking changes unless required by product decisions.
- Keep client responsibilities lightweight; prefer server-side operations for heavy or administrative tasks.

---

This document is intended to remain a stable reference for product, design, and engineering discussions about NUcleus Mobile.