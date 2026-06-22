import { fetchAppUserProfile } from '../auth/fetchAppUserProfile';
import { supabase } from '../lib/supabase';
import { PaperStatus } from '../types/domain';

// =============================================================================
// Faculty API (read-only v1)
// -----------------------------------------------------------------------------
// Self-contained faculty data facade. The student facade (researchApi) hard-
// rejects non-students via resolveCurrentStudentProfile, so faculty cannot reuse
// it — this module resolves the faculty profile itself and reads under the
// existing deployed RLS. The live `research_papers` SELECT policy already grants
// faculty access to assigned rows (faculty_id = email-resolved public.users.id),
// and the `users` SELECT policy is open-read for authenticated sessions, so
// author/co-author names resolve via plain PostgREST joins — no SECURITY DEFINER
// RPC and no new SQL are required for reads. Faculty-only types live here, not in
// the frozen domain.ts (mirrors the SubmitInput-in-research.ts convention).
// =============================================================================

export interface FacultyAssignedPaper {
  id: string;
  title: string;
  abstract: string;
  status: PaperStatus;
  category?: string | null;
  keywords?: string[] | null;
  submissionDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  revisionNotes?: string | null;
  lastReviewerRole?: string | null;
  department?: string | null;
  departmentId?: string | null;
  authorName: string;
  authorEmail?: string | null;
}

export interface FacultyWorkloadSummary {
  pendingReview: number; // status === 'pending_faculty'
  revisionRequired: number; // status === 'revision_required'
  approvedByYou: number; // advanced past the faculty stage
  totalAssigned: number;
}

export interface FacultyWorkflowEntry {
  id: string;
  reviewerRole?: string | null;
  actionType?: string | null;
  status?: string | null;
  comments?: string | null;
  previousStatus?: string | null;
  newStatus?: string | null;
  reviewedAt?: string | null;
  createdAt?: string | null;
  reviewerName?: string | null;
}

export interface FacultyReviewDetail {
  id: string;
  title: string;
  abstract: string;
  status: PaperStatus;
  category?: string | null;
  keywords?: string[] | null;
  submissionDate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  revisionNotes?: string | null;
  rejectionReason?: string | null;
  department?: string | null;
  authorName: string;
  authorEmail?: string | null;
  fileUrl?: string | null;
  workflow: FacultyWorkflowEntry[];
}

export interface FacultyReviewFile {
  fileUrl: string;
  isSigned: boolean;
}

// Statuses that mean "this paper has moved past my (faculty) review stage."
// Broader than the web FacultyReview filter (which omits pending_dean /
// pending_program_chair); faculty approval routes a paper to dean/chair first,
// so those count as advanced-by-you here.
export const FACULTY_ADVANCED_STATUSES = new Set([
  'pending_dean',
  'pending_program_chair',
  'pending_editor',
  'pending_admin',
  'approved',
  'published',
]);

interface FacultyAuthorRow {
  id: string;
  email?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
}

type FacultyAuthorRelation = FacultyAuthorRow | FacultyAuthorRow[] | null | undefined;

interface FacultyStructuredAuthorRow {
  is_primary?: boolean | null;
  author?: FacultyAuthorRelation;
}

interface FacultyPaperRow {
  id: string;
  title: string;
  abstract: string;
  status: string;
  category?: string | null;
  keywords?: string[] | null;
  submission_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  revision_notes?: string | null;
  last_reviewer_role?: string | null;
  department?: string | null;
  department_id?: string | null;
  author?: FacultyAuthorRelation;
  structured_authors?: FacultyStructuredAuthorRow[] | null;
}

const FACULTY_PAPER_SELECT = `
  id,
  title,
  abstract,
  status,
  category,
  keywords,
  submission_date,
  created_at,
  updated_at,
  revision_notes,
  last_reviewer_role,
  department,
  department_id,
  author:users!research_papers_author_id_fkey(
    id,
    email,
    first_name,
    middle_name,
    last_name
  ),
  structured_authors:research_authors!research_authors_research_id_fkey(
    is_primary,
    author:users!research_authors_user_id_fkey(
      id,
      email,
      first_name,
      middle_name,
      last_name
    )
  )
`;

function pickAuthor(rel?: FacultyAuthorRelation): FacultyAuthorRow | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

function buildFullName(row?: FacultyAuthorRow | null): string {
  if (!row) return '';
  const parts = [row.first_name, row.middle_name, row.last_name].filter(Boolean) as string[];
  const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
  return joined || String(row.email || '').trim();
}

function resolveAuthorRow(row: FacultyPaperRow): FacultyAuthorRow | null {
  return (
    pickAuthor(row.author) ??
    pickAuthor(row.structured_authors?.find((entry) => entry?.is_primary)?.author) ??
    null
  );
}

function toFacultyAssignedPaper(row: FacultyPaperRow): FacultyAssignedPaper {
  const author = resolveAuthorRow(row);
  return {
    id: row.id,
    title: row.title,
    abstract: row.abstract,
    status: row.status,
    category: row.category ?? null,
    keywords: row.keywords ?? null,
    submissionDate: row.submission_date ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    revisionNotes: row.revision_notes ?? null,
    lastReviewerRole: row.last_reviewer_role ?? null,
    department: row.department ?? null,
    departmentId: row.department_id ?? null,
    authorName: buildFullName(author) || 'Unknown author',
    authorEmail: author?.email ?? null,
  };
}

interface FacultyWorkflowRow {
  id: string;
  reviewer_role?: string | null;
  action_type?: string | null;
  status?: string | null;
  comments?: string | null;
  previous_status?: string | null;
  new_status?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  reviewer?: FacultyAuthorRelation;
}

interface FacultyDetailRow extends FacultyPaperRow {
  rejection_reason?: string | null;
  file_url?: string | null;
  approval_workflow?: FacultyWorkflowRow[] | null;
}

const FACULTY_DETAIL_SELECT = `
  ${FACULTY_PAPER_SELECT},
  rejection_reason,
  file_url,
  approval_workflow:approval_workflow!approval_workflow_research_id_fkey(
    id,
    reviewer_role,
    action_type,
    status,
    comments,
    previous_status,
    new_status,
    reviewed_at,
    created_at,
    reviewer:users!approval_workflow_reviewer_id_fkey(
      id,
      email,
      first_name,
      middle_name,
      last_name
    )
  )
`;

function toFacultyWorkflowEntry(row: FacultyWorkflowRow): FacultyWorkflowEntry {
  const reviewer = pickAuthor(row.reviewer);
  return {
    id: row.id,
    reviewerRole: row.reviewer_role ?? null,
    actionType: row.action_type ?? null,
    status: row.status ?? null,
    comments: row.comments ?? null,
    previousStatus: row.previous_status ?? null,
    newStatus: row.new_status ?? null,
    reviewedAt: row.reviewed_at ?? null,
    createdAt: row.created_at ?? null,
    reviewerName: reviewer ? buildFullName(reviewer) : null,
  };
}

function workflowTime(entry: FacultyWorkflowEntry): number {
  return new Date(entry.reviewedAt || entry.createdAt || 0).getTime();
}

function toFacultyReviewDetail(row: FacultyDetailRow): FacultyReviewDetail {
  const author = resolveAuthorRow(row);
  const workflow = Array.isArray(row.approval_workflow)
    ? row.approval_workflow
        .map(toFacultyWorkflowEntry)
        .sort((left, right) => workflowTime(right) - workflowTime(left))
    : [];

  return {
    id: row.id,
    title: row.title,
    abstract: row.abstract,
    status: row.status,
    category: row.category ?? null,
    keywords: row.keywords ?? null,
    submissionDate: row.submission_date ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    revisionNotes: row.revision_notes ?? null,
    rejectionReason: row.rejection_reason ?? null,
    department: row.department ?? null,
    authorName: buildFullName(author) || 'Unknown author',
    authorEmail: author?.email ?? null,
    fileUrl: row.file_url ?? null,
    workflow,
  };
}

function extractStoragePathFromUrl(fileUrl?: string | null): string | null {
  if (!fileUrl) return null;
  const trimmed = fileUrl.trim();
  if (!trimmed) return null;

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/^\/+/, '') || null;
  }

  try {
    const parsed = new URL(trimmed);
    const marker = '/object/public/research-papers/';
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex >= 0) {
      return parsed.pathname.slice(markerIndex + marker.length).replace(/^\//, '') || null;
    }
    const segments = parsed.pathname.split('/research-papers/');
    if (segments.length > 1) {
      return segments[1].replace(/^\//, '') || null;
    }
  } catch {
    return null;
  }

  return null;
}

function paperSortTime(paper: FacultyAssignedPaper): number {
  return new Date(paper.submissionDate || paper.createdAt || 0).getTime();
}

async function resolveCurrentFacultyProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message || 'Unable to resolve the current session.');
  }

  if (!userData.user) {
    throw new Error('Sign in required to load faculty data.');
  }

  const profileResult = await fetchAppUserProfile(userData.user);

  if (!profileResult.user) {
    throw new Error(profileResult.message || 'Your account is not provisioned for faculty access.');
  }

  if (profileResult.user.role !== 'faculty') {
    throw new Error('Faculty access is required to load assigned papers.');
  }

  return profileResult.user;
}

/** Pure summary of a faculty member's assigned-paper workload (computed client-side). */
export function summarizeFacultyWorkload(papers: FacultyAssignedPaper[]): FacultyWorkloadSummary {
  let pendingReview = 0;
  let revisionRequired = 0;
  let approvedByYou = 0;

  for (const paper of papers) {
    if (paper.status === 'pending_faculty') {
      pendingReview += 1;
    } else if (paper.status === 'revision_required') {
      revisionRequired += 1;
    } else if (FACULTY_ADVANCED_STATUSES.has(String(paper.status))) {
      approvedByYou += 1;
    }
  }

  return { pendingReview, revisionRequired, approvedByYou, totalAssigned: papers.length };
}

export const facultyApi = {
  /**
   * Papers assigned to the signed-in faculty member (any status), newest first.
   * Relies on the deployed research_papers SELECT policy
   * (faculty_id = email-resolved public.users.id) — no RPC.
   */
  getAssignedPapers: async (): Promise<FacultyAssignedPaper[]> => {
    const profile = await resolveCurrentFacultyProfile();

    const { data, error } = await supabase
      .from('research_papers')
      .select(FACULTY_PAPER_SELECT)
      .eq('faculty_id', profile.id);

    if (error) {
      throw new Error(error.message || 'Unable to load assigned papers.');
    }

    const rows = Array.isArray(data) ? (data as unknown as FacultyPaperRow[]) : [];
    return rows.map(toFacultyAssignedPaper).sort((left, right) => paperSortTime(right) - paperSortTime(left));
  },

  /** Full review detail for one assigned paper (metadata + workflow history). RLS-scoped. */
  getReviewDetail: async (paperId: string): Promise<FacultyReviewDetail> => {
    await resolveCurrentFacultyProfile();

    const { data, error } = await supabase
      .from('research_papers')
      .select(FACULTY_DETAIL_SELECT)
      .eq('id', paperId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Unable to load the paper.');
    }
    if (!data) {
      throw new Error('Paper not found, or it is not assigned to you.');
    }

    return toFacultyReviewDetail(data as unknown as FacultyDetailRow);
  },

  /** Resolve an openable URL for a paper's PDF (signed URL, falling back to the stored URL). */
  getReviewFile: async (paperId: string): Promise<FacultyReviewFile> => {
    await resolveCurrentFacultyProfile();

    const { data: paperRow, error } = await supabase
      .from('research_papers')
      .select('id, file_url')
      .eq('id', paperId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Unable to load the paper file.');
    }
    if (!paperRow) {
      throw new Error('Paper not found.');
    }

    const fileUrl = (paperRow as { file_url?: string | null }).file_url ?? null;
    const storagePath = extractStoragePathFromUrl(fileUrl);

    if (storagePath) {
      const signed = await supabase.storage
        .from('research-papers')
        .createSignedUrl(storagePath, 3600);
      if (!signed.error && signed.data?.signedUrl) {
        return { fileUrl: signed.data.signedUrl, isSigned: true };
      }
    }

    if (fileUrl) {
      return { fileUrl, isSigned: false };
    }

    throw new Error('No file is attached to this paper.');
  },
};
