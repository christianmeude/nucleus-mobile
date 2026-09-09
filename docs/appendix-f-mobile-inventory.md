# Appendix F (Mobile) — Functionality Inventory

Source of truth for the mobile-centric test document. Web draft
(`capstone-nucleus` repo) trimmed to what `capstone-nucleus-rn` actually ships.
Decisions applied: Dean/Chair/Staff/Admin excluded (mobile shows
`UnsupportedRole`), Resubmit wired in, Chat/Download recorded as N/A with reason.

## E2E navigation (verified in code)

- Unauth: `PrivacyNoticeGate > LoginScreen` (`src/navigation/AppNavigator.tsx:176-180`).
  No Register route. Forgot = OTP bottom-sheet (`src/screens/auth/LoginScreen.tsx:204-250`).
- Role gate: `student` → StudentTabs, `faculty` → FacultyTabs, else
  `UnsupportedRole` (`src/navigation/AppNavigator.tsx:170-244`).
- Student: `StudentTabs` = Dashboard | MyPapers | Browse | Profile
  (`src/navigation/AppNavigator.tsx:41-53`) + overlays
  `ResearchDetail {paperId}` / `SubmitResearch {resubmitPaperId?}` / `Activity`
  (`src/navigation/types.ts:6-16`). Onboarding is first-run only, not a route
  (`src/navigation/AppNavigator.tsx:149-154`).
- Faculty: `FacultyTabs` = FacultyDashboard | FacultyReview | FacultyRepository
  (reused `BrowseScreen`) | FacultyProfile (reused `ProfileScreen`)
  (`src/navigation/FacultyTabs.tsx:22-33`) + overlays
  `FacultyReviewDetail {paperId}` / `FacultyPaperDetail` / `Activity`
  (`src/navigation/AppNavigator.tsx:209-237`).

## Mobile modules (proposed Appendix F rows)

### GENERAL MODULES (mobile)

| No. | Module Name | Function Name | Description | Status |
|---|---|---|---|---|
| 1 | Login | Authenticate | Verifies email + password via Supabase and starts a session for provisioned users. | Keep |
| 1 | Login | Forgot Password (OTP) | Requests OTP then verifies code + new password via bottom-sheet. | Keep (rename from web email-link) |
| 1 | Login | Privacy Notice Gate | Blocks login until RA 10173 notice is scrolled to bottom and accepted; decline signs out. | Keep (mobile-only) |
| 1 | Login | Register | — | DROP (no mobile UI) |
| 2 | Account Access | Role-Based Redirection | Student → StudentTabs, Faculty → FacultyTabs, others → UnsupportedRole. | Keep (scoped) |
| 3 | Profile | View Profile | Read-only identity header + security/appearance settings. | Keep (partial) |
| 3 | Profile | Edit Profile | Recovery email + change password only; no name/avatar/dept edit. | Keep (scoped) |
| 4 | Sign Out | Logout Function | Ends session, clears tokens, returns to login. | Keep |
| 5 | Navigation | Use Tab Navigation | Floating tab bar with role-specific tabs; bell → Activity. | Keep (tab, not sidebar) |
| 5 | Navigation | View Navigation Badges | Unread/pending counters where surfaced. | Keep |
| 6 | Notifications | View Notifications | Today/Earlier grouped list, tap deep-links to detail. | Keep |
| 6 | Notifications | Manage Notifications | Mark read on open, mark all read, pull-refresh. No delete/search. | Keep (scoped) |
| 7 | Repository | Browse and Search Repository | Hybrid server + client search by title/author/keyword/abstract. | Keep |
| 7 | Repository | Filter and Sort Repository | Category/department/program/year filters, list/grid toggle. | Keep |
| 7 | Repository | Open Paper Details | Routes to ResearchDetail (student) / FacultyPaperDetail (faculty). | Keep |
| 8 | Research Detail | View Research Details | Metadata, abstract, authors, keywords, status, DOI card, related, timeline (owner-only). | Keep |
| 8 | Research Detail | Preview File | In-app pdf.js preview (blurred) + fullscreen reader; no native download. | Keep (scoped) |
| 8 | Research Detail | Download File | — | N/A — viewer-only by design (RN 0.85 download fails; `Open in browser` fallback) |
| 8 | Research Detail | Open Research Chat | — | N/A — read-only Feedback/AnnotationPanel, no composer |
| 9 | Onboarding | View Onboarding | Student-only 4-slide first-run carousel; not re-openable. | Keep (replaces User Guide) |
| 9 | User Guide | View User Guide | — | DROP (no persistent route) |

### STUDENT

| No. | Module Name | Function Name | Description | Status |
|---|---|---|---|---|
| 1 | Student Dashboard | View Student Dashboard | Greeting, Up Next (revise-first), Recent Activity, Recommended fallback. | Keep |
| 2 | Submit Research | Upload and Submit Research | 4-step wizard with policy-checked file picker + metadata + checklist gate. | Keep |
| 2 | Submit Research | Manage Co-Authors | Student search, add/remove chips, external notes; invites best-effort. | Keep |
| 2 | Submit Research | Resubmit Revised Research | Hydrates form for `revision_required` paper; file optional; **now wired** via card + detail CTA. | Keep (wired this change) |
| 3 | My Research | View My Submissions | Searchable newest-first list with status cards. | Keep |
| 3 | My Research | Filter My Submissions | All / In Review / Needs Revision / Approved segments. | Keep |
| 3 | My Research | View Submission Status and Feedback | Status on card; timeline + feedback only inside ResearchDetail (owner-gated). | Keep (split) |
| 4 | Co-Author Invitations | View and Respond to Invitations | Activity → Invites tab; accept/decline with expiry guard. | Keep |

### FACULTY

| No. | Module Name | Function Name | Description | Status |
|---|---|---|---|---|
| 1 | Faculty Dashboard | View Faculty Dashboard | Assigned totals, workload chart → filtered queue, Up Next, notifications. | Keep |
| 2 | Faculty Review Queue | View and Search Review Queue | Assigned papers, paged (20), debounced title/abstract search. | Keep (scoped: no author/keyword server search) |
| 2 | Faculty Review Queue | Filter Faculty Review Queue | needs_review / revisions / forwarded / approved / all pills. | Keep |
| 2 | Faculty Review Queue | Open Review Detail | Navigates to FacultyReviewDetail workspace. | Keep |
| 2 | Faculty Review Queue | Declare Conflict of Interest | — | DROP (no UI/RPC) |
| 3 | Review Detail | View Review Workspace | Metadata, workflow progress, secure PDF, history timeline. | Keep |
| 3 | Review Detail | Add Note Annotations | Gold note pins during `pending_faculty` only. | Keep (scoped) |
| 3 | Review Detail | Edit/Delete/Reply Annotations | — | DROP (panel is read-only) |
| 3 | Review Detail | Draw and Save PDF Markup | — | DROP (props exist, never wired) |
| 3 | Review Detail | Approve Research | Forward to Dean/Chair with notes; 2-step confirm. | Keep |
| 3 | Review Detail | Reject Research | Required reason; 2-step confirm. | Keep |
| 3 | Review Detail | Request Revision | Required notes; returns paper to `revision_required`. | Keep |
| 3 | Review Detail | Correct Metadata / Assign Reviewer / Set Deadline / Publish / Unpublish | — | DROP (web-only roles) |

### EXCLUDED (web-only, no mobile UI)

Dean Dashboard, Program Chair Dashboard, Dean/Chair Review Queue, Staff
Dashboard/Queue, Admin Dashboard/Paper Queue/User Management/User Data/Analytics,
arbitrary reviewer assignment, deadlines, publish/unpublish. Mobile authenticates
these roles then shows `UnsupportedRole` (`src/screens/auth/UnsupportedRoleScreen.tsx:89-95`).

## Resubmit wiring (this change)

- `StandardPaperCard` gains optional `onResubmit`; renders `Resubmit revision`
  link for `revision_required` (`src/components/StandardPaperCard.tsx`).
- `MyPapersScreen` passes `onResubmit → SubmitResearch {resubmitPaperId}` and
  refreshes on focus so the updated status shows on return
  (`src/screens/main/MyPapersScreen.tsx`).
- `ResearchDetailScreen` shows `Resubmit revision` button for owner +
  `revision_required` (`src/screens/main/ResearchDetailScreen.tsx`).
- `DashboardScreen` Up Next card gets the same entry point
  (`src/screens/main/DashboardScreen.tsx`).
- Verified: `npm run typecheck` clean, `eslint` warnings-only (pre-existing),
  `npm test` 9 suites / 142 tests pass.
