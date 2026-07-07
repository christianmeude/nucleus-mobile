import type { ChipTone } from '../../components/ui';
import { FACULTY_ADVANCED_STATUSES } from '../../api/faculty';

// Shared faculty presentation + queue-filter helpers, used by the Faculty
// Dashboard and Review queue so status labels, badge tones, and the
// "approved by you" bucket stay consistent. The advanced-status set is
// reused from the data layer (faculty.ts) so the queue's "Approved by You"
// count matches the dashboard's workload stat.

const STATUS_LABELS: Record<string, string> = {
  pending_faculty: 'Awaiting your review',
  revision_required: 'Revision requested',
  pending_dean: 'With Dean',
  pending_program_chair: 'With Program Chair',
  pending_editor: 'With Editor',
  pending_admin: 'With Admin',
  approved: 'Approved',
  published: 'Published',
  rejected: 'Rejected',
};

export function facultyStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function facultyStatusTone(status: string): ChipTone {
  switch (status) {
    case 'pending_faculty':
      return 'warning';
    // `revision_required` is an actionable "needs changes" state, not a terminal
    // failure — kept amber (warning) to match the student status chip
    // (PaperStatusChip), so the same status reads the same across both roles.
    case 'revision_required':
      return 'warning';
    case 'rejected':
      return 'danger';
    case 'approved':
    case 'published':
      return 'success';
    default:
      return 'info';
  }
}

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
