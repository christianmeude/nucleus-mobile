import { FACULTY_ADVANCED_STATUSES } from '../../api/faculty';

// Faculty review-queue filter helpers. Status *labels* and *tones* deliberately
// live in ONE place — `PaperStatusChip` / `utils/format` — so a given status
// reads identically for every role. Faculty screens no longer render status
// chips, so no faculty-specific status presentation belongs here; only the
// review-queue filtering does.

export type FacultyQueueFilter = 'needs_review' | 'revisions' | 'forwarded' | 'approved' | 'all';

export const FACULTY_QUEUE_FILTERS: { key: FacultyQueueFilter; label: string }[] = [
  { key: 'needs_review', label: 'Needs Review' },
  { key: 'revisions', label: 'Revisions' },
  { key: 'forwarded', label: 'Forwarded' },
  { key: 'approved', label: 'Approved' },
  { key: 'all', label: 'All' },
];

export function matchesQueueFilter(status: string, filter: FacultyQueueFilter): boolean {
  switch (filter) {
    case 'needs_review':
      return status === 'pending_faculty' || status === 'revision_required';
    case 'revisions':
      return status === 'revision_required';
    case 'forwarded':
      return status === 'pending_dean' || status === 'pending_program_chair' || status === 'pending_editor' || status === 'pending_admin';
    case 'approved':
      return status === 'approved' || status === 'published';
    case 'all':
    default:
      return true;
  }
}
