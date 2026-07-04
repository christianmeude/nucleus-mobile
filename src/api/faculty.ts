import { fetchAppUserProfile } from '../auth/fetchAppUserProfile';
import { PUBLISHED_STATUSES } from './research';
import { supabase } from '../lib/supabase';
import { NotificationItem, PaperStatus } from '../types/domain';

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

export type FacultyApproverRole = 'dean' | 'program_chair';

/** A forward target for faculty approval — an active dean or program chair. */
export interface FacultyApprover {
  id: string;
  name: string;
  role: FacultyApproverRole;
  department?: string | null;
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

interface DeanChairRow {
  id: string;
  email?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  role?: string | null;
  department?: string | null;
  department_id?: string | null;
}

function toFacultyApprover(row: DeanChairRow): FacultyApprover {
  return {
    id: row.id,
    name: buildFullName(row) || 'Unnamed reviewer',
    role: row.role === 'dean' ? 'dean' : 'program_chair',
    department: row.department ?? null,
  };
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

// =============================================================================
// Annotations (read-only, #11)
// -----------------------------------------------------------------------------
// Faculty view prior reviewers' annotations over the PDF. The web stores each
// annotation in research_comments as a meta-in-text envelope:
//   [[meta]]{json}[[/meta]]\n<note>
// where json carries annotationType (comment | note | draw), pageNumber,
// %-based highlightRects / anchorPercent, highlightColor, and a flattened-PNG
// drawImageUrl. Spike (2026-06-27) confirmed faculty read these directly under
// the deployed RLS: every annotation is is_internal = false and the
// research_comments SELECT policy grants NOT-is_internal rows to authenticated
// callers — so no SECURITY DEFINER RPC and no new SQL. Drawing PNGs live in the
// public research-papers bucket, so their URLs load unsigned. Page-less rows
// (null pageNumber / coords) are general comments; positioned rows overlay the
// PDF. The data layer carries both; the UI decides presentation.
// =============================================================================

export type FacultyAnnotationType = 'comment' | 'note' | 'draw';

/** A highlight rectangle, in page-percentage units (0–100). */
export interface FacultyAnnotationRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A note pin's anchor on the page, in page-percentage units (0–100). */
export interface FacultyAnnotationPoint {
  x: number;
  y: number;
}

export interface FacultyAnnotation {
  id: string;
  parentId: string | null;
  annotationType: FacultyAnnotationType;
  note: string;
  pageNumber: number | null;
  highlightColor: string | null;
  sectionLabel: string | null;
  selectedText: string | null;
  highlightRects: FacultyAnnotationRect[] | null;
  anchorPercent: FacultyAnnotationPoint | null;
  drawImageUrl: string | null;
  createdAt: string | null;
  reviewerName: string;
  reviewerRole: string | null;
}

interface FacultyAnnotationUserRow extends FacultyAuthorRow {
  role?: string | null;
}

interface FacultyAnnotationRow {
  id: string;
  comment?: string | null;
  parent_id?: string | null;
  created_at?: string | null;
  reviewer?: FacultyAnnotationUserRow | FacultyAnnotationUserRow[] | null;
}

const FACULTY_ANNOTATION_SELECT = `
  id,
  comment,
  parent_id,
  created_at,
  reviewer:users!research_comments_user_id_fkey(
    id,
    email,
    first_name,
    middle_name,
    last_name,
    role
  )
`;

const ANNOTATION_META_OPEN = '[[meta]]';
const ANNOTATION_META_CLOSE = '[[/meta]]';

function clampPercent(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.min(100, Math.max(0, n));
}

function sanitizeHighlightRects(input: unknown): FacultyAnnotationRect[] | null {
  if (!Array.isArray(input)) return null;
  const out: FacultyAnnotationRect[] = [];
  for (const raw of input.slice(0, 80)) {
    if (!raw || typeof raw !== 'object') continue;
    const rect = raw as Record<string, unknown>;
    const left = clampPercent(rect.left);
    const top = clampPercent(rect.top);
    const width = clampPercent(rect.width);
    const height = clampPercent(rect.height);
    if (left === null || top === null || width === null || height === null) continue;
    if (width <= 0 || height <= 0) continue;
    out.push({ left, top, width, height });
  }
  return out.length ? out : null;
}

function sanitizeAnchorPercent(input: unknown): FacultyAnnotationPoint | null {
  if (!input || typeof input !== 'object') return null;
  const point = input as Record<string, unknown>;
  const x = clampPercent(point.x);
  const y = clampPercent(point.y);
  if (x === null || y === null) return null;
  return { x, y };
}

function normalizeAnnotationType(value: unknown): FacultyAnnotationType {
  return value === 'draw' || value === 'note' ? value : 'comment';
}

function pickReviewer(
  rel?: FacultyAnnotationUserRow | FacultyAnnotationUserRow[] | null,
): FacultyAnnotationUserRow | null {
  if (!rel) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}

function toFacultyAnnotation(row: FacultyAnnotationRow): FacultyAnnotation {
  const reviewer = pickReviewer(row.reviewer);
  const text = String(row.comment ?? '');

  let meta: Record<string, unknown> = {};
  let note = text;
  const metaStart = text.indexOf(ANNOTATION_META_OPEN);
  const metaEnd = text.indexOf(ANNOTATION_META_CLOSE);
  if (metaStart === 0 && metaEnd > ANNOTATION_META_OPEN.length) {
    try {
      meta = JSON.parse(text.slice(ANNOTATION_META_OPEN.length, metaEnd)) as Record<string, unknown>;
    } catch {
      meta = {};
    }
    note = text.slice(metaEnd + ANNOTATION_META_CLOSE.length).trim();
  }

  const pageRaw = Number(meta.pageNumber);
  const pageNumber = Number.isFinite(pageRaw) && pageRaw >= 1 ? Math.floor(pageRaw) : null;
  const drawImageUrl =
    typeof meta.drawImageUrl === 'string' && /^https?:\/\//i.test(meta.drawImageUrl)
      ? meta.drawImageUrl.slice(0, 2048)
      : null;

  return {
    id: row.id,
    parentId: row.parent_id ?? null,
    annotationType: normalizeAnnotationType(meta.annotationType),
    note,
    pageNumber,
    highlightColor: typeof meta.highlightColor === 'string' ? meta.highlightColor : null,
    sectionLabel: typeof meta.sectionLabel === 'string' ? meta.sectionLabel : null,
    selectedText: typeof meta.selectedText === 'string' ? meta.selectedText : null,
    highlightRects: sanitizeHighlightRects(meta.highlightRects),
    anchorPercent: sanitizeAnchorPercent(meta.anchorPercent),
    drawImageUrl,
    createdAt: row.created_at ?? null,
    reviewerName: (reviewer ? buildFullName(reviewer) : '') || 'Reviewer',
    reviewerRole: reviewer?.role ?? null,
  };
}

// =============================================================================
// Repository + Notifications (read-only, #12)
// -----------------------------------------------------------------------------
// Same self-contained-facade rule as the rest of this file: researchApi.getPublishedPapers
// and notificationsApi both hard-reject non-students via their own profile resolvers, so
// faculty needs its own read path. The underlying tables are role-agnostic under RLS —
// `research_papers` has a standalone "Public can read published papers" policy
// (status = 'published', TO public) and `notifications` SELECT/UPDATE is plain
// user_id = email-resolved public.users.id with no role check — so no new SQL is needed.
// =============================================================================

interface FacultyNotificationRow {
  id: string;
  user_id: string;
  research_id?: string | null;
  type?: string | null;
  title?: string | null;
  message?: string | null;
  is_read: boolean;
  created_at: string;
}

function toFacultyNotificationItem(row: FacultyNotificationRow): NotificationItem {
  return {
    id: row.id,
    user_id: row.user_id,
    research_id: row.research_id ?? null,
    type: row.type ?? undefined,
    title: row.title ?? undefined,
    message: row.message ?? undefined,
    is_read: row.is_read,
    created_at: row.created_at,
  };
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

  /** Active deans + program chairs — the forward-target options for Approve. */
  getDeanChairMembers: async (): Promise<FacultyApprover[]> => {
    await resolveCurrentFacultyProfile();

    const { data, error } = await supabase.rpc('get_dean_chair_members');

    if (error) {
      throw new Error(error.message || 'Unable to load deans and program chairs.');
    }

    const rows = Array.isArray(data) ? (data as DeanChairRow[]) : [];
    return rows.map(toFacultyApprover);
  },

  /**
   * Approve an assigned paper and forward it to a dean or program chair.
   * Calls the SECURITY DEFINER faculty_approve_paper RPC, which re-validates faculty
   * ownership and the pending_faculty gate server-side. Returns the new paper status.
   */
  approvePaper: async (
    paperId: string,
    targetUserId: string,
    targetRole: FacultyApproverRole,
    comments?: string,
  ): Promise<string> => {
    await resolveCurrentFacultyProfile();

    const { data, error } = await supabase.rpc('faculty_approve_paper', {
      p_paper_id: paperId,
      p_target_user_id: targetUserId,
      p_target_role: targetRole,
      p_comments: comments?.trim() || null,
    });

    if (error) {
      throw new Error(error.message || 'Unable to approve the paper.');
    }

    return String(data ?? '');
  },

  /** Send an assigned paper back to the student for revision. Returns the new status. */
  requestRevision: async (paperId: string, notes: string): Promise<string> => {
    await resolveCurrentFacultyProfile();

    const { data, error } = await supabase.rpc('faculty_request_revision', {
      p_paper_id: paperId,
      p_notes: notes,
    });

    if (error) {
      throw new Error(error.message || 'Unable to request revision.');
    }

    return String(data ?? 'revision_required');
  },

  /** Reject an assigned paper. Returns the new status. */
  rejectPaper: async (paperId: string, reason: string): Promise<string> => {
    await resolveCurrentFacultyProfile();

    const { data, error } = await supabase.rpc('faculty_reject_paper', {
      p_paper_id: paperId,
      p_reason: reason,
    });

    if (error) {
      throw new Error(error.message || 'Unable to reject the paper.');
    }

    return String(data ?? 'rejected');
  },

  /**
   * Prior reviewers' annotations for one paper (read-only, #11). Reads
   * research_comments directly under the deployed RLS — every annotation is
   * non-internal and the SELECT policy grants those to authenticated callers, so
   * no RPC is needed. Returns chronological order (oldest first); the caller
   * groups replies via parentId.
   */
  getAnnotations: async (paperId: string): Promise<FacultyAnnotation[]> => {
    await resolveCurrentFacultyProfile();

    const { data, error } = await supabase
      .from('research_comments')
      .select(FACULTY_ANNOTATION_SELECT)
      .eq('research_id', paperId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message || 'Unable to load annotations.');
    }

    const rows = Array.isArray(data) ? (data as unknown as FacultyAnnotationRow[]) : [];
    return rows.map(toFacultyAnnotation);
  },

  /** Published papers, newest first — same Repository content students browse. RLS-scoped. */
  getPublishedPapers: async (): Promise<FacultyAssignedPaper[]> => {
    await resolveCurrentFacultyProfile();

    const { data, error } = await supabase
      .from('research_papers')
      .select(FACULTY_PAPER_SELECT)
      .in('status', Array.from(PUBLISHED_STATUSES));

    if (error) {
      throw new Error(error.message || 'Unable to load published papers.');
    }

    const rows = Array.isArray(data) ? (data as unknown as FacultyPaperRow[]) : [];
    return rows.map(toFacultyAssignedPaper).sort((left, right) => paperSortTime(right) - paperSortTime(left));
  },

  /** The signed-in faculty member's notifications, newest first. RLS-scoped (own user_id only). */
  getNotifications: async (limit = 100): Promise<NotificationItem[]> => {
    const profile = await resolveCurrentFacultyProfile();

    const { data, error } = await supabase
      .from('notifications')
      .select('id, user_id, research_id, type, title, message, is_read, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message || 'Unable to load notifications.');
    }

    return (Array.isArray(data) ? (data as unknown as FacultyNotificationRow[]) : []).map(
      toFacultyNotificationItem
    );
  },

  markNotificationRead: async (notificationId: string): Promise<void> => {
    const profile = await resolveCurrentFacultyProfile();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', profile.id);

    if (error) {
      throw new Error(error.message || 'Unable to mark notification as read.');
    }
  },

  markAllNotificationsRead: async (): Promise<void> => {
    const profile = await resolveCurrentFacultyProfile();

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);

    if (error) {
      throw new Error(error.message || 'Unable to mark notifications as read.');
    }
  },
};
