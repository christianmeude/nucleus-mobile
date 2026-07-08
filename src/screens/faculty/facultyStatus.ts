import { FACULTY_ADVANCED_STATUSES } from '../../api/faculty';

// Faculty review-queue filter helpers. Status *labels* and *tones* deliberately
// live in ONE place — `PaperStatusChip` / `utils/format` — so a given status
// reads identically for every role. Faculty screens no longer render status
// chips, so no faculty-specific status presentation belongs here; only the
// review-queue filtering does.

export type FacultyQueueFilter = 'needs_review' | 'revisions' | 'approved' | 'all';

export const FACULTY_QUEUE_FILTERS: { key: FacultyQueueFilter; label: string }[] = [
  { key: 'needs_review', label: 'Needs Review' },
  { key: 'revisions', label: 'Revisions' },
  { key: 'approved', label: 'Approved by You' },
  { key: 'all', label: 'All Assigned' },
];

export function matchesQueueFilter(status: string, filter: FacultyQueueFilter): boolean {
  switch (filter) {
    case 'needs_review':
      return status === 'pending_faculty' || status === 'revision_required';
    case 'revisions':
      return status === 'revision_required';
    case 'approved':
      return FACULTY_ADVANCED_STATUSES.has(status);
    case 'all':
    default:
      return true;
  }
}
