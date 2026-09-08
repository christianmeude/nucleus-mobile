# Capstone Nucleus

The unified mobile client for students and faculty to manage, submit, and review research papers at National University Dasmariñas.

## Language

**Faculty Dashboard**:
A command center focused on insight and immediate priority, surfacing high-level workload metrics and an activity feed.
_Avoid_: Faculty home, faculty index

**Review Queue**:
The comprehensive ledger and management screen for all papers assigned to a faculty member, supporting bulk processing.
_Avoid_: Faculty papers, assignment list

**Activity Stream**:
A read-only, historical feed of events (e.g., "User invited you to a project") that are not actionable inline.
_Avoid_: Notifications, feed

**Action Queue**:
A strict list of pending requests that require explicit user action (e.g., Accept/Decline), which are removed once acted upon.
_Avoid_: pending requests

**Co-author Invitation**:
A concrete Action Queue item inviting a student to co-author a research project. Only pending invitations expose Accept/Decline actions; accepted, declined, and expired ones render status only.
_Avoid_: Invitations (generic)

**Review Progress**:
The owner-visible, newest-first sequence of review events for a paper (status, reviewer role, date, comments). Rendered in My Papers and Dashboard detail views at every status; never exposed in Browse.
_Avoid_: Submission timeline

**Student Dashboard**:
A command center for the student focused on immediate priority and actionable insight (e.g., papers needing revision).
_Avoid_: Student home, public discover page

**My Papers**:
The comprehensive ledger and historical archive of all submissions made by the student.
_Avoid_: Student history, student repository

**Publication Year**:
The year a paper was published or approved for the repository, strictly referring to this date rather than when it was submitted.
_Avoid_: Submission year, creation date

**Privacy Notice Gate**:
A client-side UI wrapper around authentication flows (Login and Register) that ensures users have accepted the Data Privacy Policy and RA 10173 terms before proceeding. Acceptance is ephemeral (in-memory per app session) and does not persist to the backend. External links open in the system browser to reduce friction when returning to accept terms.
_Avoid_: Privacy modal, terms screen

**Internal Repository**:
An archive of papers that have passed internal faculty review (status 'approved') but have not yet been assigned a DOI via an external publisher.
_Avoid_: Published repository, local archive

**Formal Publication**:
The final state of a paper that has been accepted by an external publisher and assigned a DOI, moving its status from 'approved' to 'published'.
_Avoid_: Official release, external publication
