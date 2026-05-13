import { fetchAppUserProfile } from '../auth/fetchAppUserProfile';
import { supabase } from '../lib/supabase';
import {
  Category,
  PaperAuthor,
  ResearchPaper,
  StructuredAuthorEntry,
  SubmissionPolicy,
  WorkflowEntry,
} from '../types/domain';
import { getPrimaryAuthorName, paperDate } from '../utils/format';

interface ResearchDetailPayload {
  paper: ResearchPaper;
  workflowHistory: WorkflowEntry[];
}

interface ResearchFilePayload {
  fileUrl: string;
  isSigned?: boolean;
  source?: string;
  storagePath?: string;
}

interface ResearchAuthorRow {
  id: string;
  email?: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
}

type ResearchAuthorRelation = ResearchAuthorRow | ResearchAuthorRow[] | null | undefined;

interface ResearchAuthorEntryRow {
  id: string;
  author_order?: number | null;
  is_primary?: boolean | null;
  author?: ResearchAuthorRelation;
}

interface ResearchWorkflowRow {
  id: string;
  reviewer_role?: string | null;
  action_type?: string | null;
  status?: string | null;
  comments?: string | null;
  previous_status?: string | null;
  new_status?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
  reviewer?: ResearchAuthorRelation;
}

interface ResearchPaperRow {
  id: string;
  title: string;
  abstract: string;
  status: string;
  category?: string | null;
  keywords?: string[] | null;
  created_at?: string | null;
  updated_at?: string | null;
  submission_date?: string | null;
  published_date?: string | null;
  file_url?: string | null;
  rejection_reason?: string | null;
  revision_notes?: string | null;
  view_count?: number | null;
  download_count?: number | null;
  author_id?: string | null;
  author?: ResearchAuthorRelation;
  users?: ResearchAuthorRelation;
  structured_authors?: ResearchAuthorEntryRow[] | null;
  approval_workflow?: ResearchWorkflowRow[] | null;
}

interface ResearchListParams {
  category?: string;
  search?: string;
  year?: string;
  author?: string;
}

const PUBLISHED_STATUSES = new Set(['approved', 'published']);

const PAPER_SELECT = `
  id,
  title,
  abstract,
  status,
  category,
  keywords,
  created_at,
  updated_at,
  submission_date,
  published_date,
  file_url,
  rejection_reason,
  revision_notes,
  view_count,
  download_count,
  author_id,
  author:users!research_papers_author_id_fkey(
    id,
    email,
    first_name,
    middle_name,
    last_name
  ),
  structured_authors:research_authors!research_authors_research_id_fkey(
    id,
    author_order,
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

const PAPER_DETAIL_SELECT = `
  ${PAPER_SELECT},
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

function pickAuthor(row?: ResearchAuthorRelation): ResearchAuthorRow | null {
  if (!row) return null;
  if (Array.isArray(row)) return row[0] ?? null;
  return row;
}

function buildFullName(row?: ResearchAuthorRow | null) {
  if (!row) return '';

  const parts = [row.first_name, row.middle_name, row.last_name].filter(Boolean) as string[];
  const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
  return joined || String(row.email || '').trim();
}

function toPaperAuthor(row?: ResearchAuthorRelation): PaperAuthor | null {
  const normalized = pickAuthor(row);
  if (!normalized) return null;

  const fullName = buildFullName(normalized);

  return {
    id: normalized.id,
    email: normalized.email ?? undefined,
    first_name: normalized.first_name ?? undefined,
    middle_name: normalized.middle_name ?? undefined,
    last_name: normalized.last_name ?? undefined,
    fullName,
    name: fullName,
  };
}

function toStructuredAuthorEntry(row: ResearchAuthorEntryRow): StructuredAuthorEntry {
  return {
    user_id: pickAuthor(row.author)?.id,
    is_primary: row.is_primary ?? false,
    author_order: row.author_order ?? undefined,
    author: toPaperAuthor(row.author),
  };
}

function toWorkflowEntry(row: ResearchWorkflowRow): WorkflowEntry {
  return {
    id: row.id,
    reviewer_role: row.reviewer_role ?? undefined,
    action_type: row.action_type ?? undefined,
    status: row.status ?? undefined,
    comments: row.comments ?? null,
    previous_status: row.previous_status ?? null,
    new_status: row.new_status ?? null,
    reviewed_at: row.reviewed_at ?? undefined,
    created_at: row.created_at ?? undefined,
    reviewer: toPaperAuthor(row.reviewer),
  };
}

function toResearchPaper(row: ResearchPaperRow): ResearchPaper {
  const primaryAuthor =
    toPaperAuthor(row.author ?? row.users ?? row.structured_authors?.find((entry) => entry?.is_primary)?.author ?? null) ??
    undefined;

  const structuredAuthors = Array.isArray(row.structured_authors)
    ? row.structured_authors.map(toStructuredAuthorEntry)
    : [];

  return {
    id: row.id,
    title: row.title,
    abstract: row.abstract,
    status: row.status,
    category: row.category ?? null,
    keywords: row.keywords ?? null,
    created_at: row.created_at ?? undefined,
    updated_at: row.updated_at ?? undefined,
    submission_date: row.submission_date ?? undefined,
    published_date: row.published_date ?? undefined,
    file_url: row.file_url ?? null,
    revision_notes: row.revision_notes ?? null,
    rejection_reason: row.rejection_reason ?? null,
    view_count: row.view_count ?? undefined,
    download_count: row.download_count ?? undefined,
    users: primaryAuthor ?? null,
    author: primaryAuthor ?? null,
    structured_authors: structuredAuthors,
  };
}

function filterPublishedRows(rows: ResearchPaperRow[], params?: ResearchListParams) {
  const normalizedSearch = params?.search?.trim().toLowerCase() ?? '';
  const normalizedAuthor = params?.author?.trim().toLowerCase() ?? '';
  const normalizedYear = params?.year?.trim() ?? '';
  const normalizedCategory = params?.category?.trim() ?? '';

  return rows.filter((paper) => {
    const paperRecord = toResearchPaper(paper);

    if (normalizedCategory && paper.category !== normalizedCategory) {
      return false;
    }

    if (normalizedYear) {
      const dateValue = paperDate(paperRecord);
      const paperYear = dateValue ? new Date(dateValue).getFullYear().toString() : '';

      if (paperYear !== normalizedYear) {
        return false;
      }
    }

    if (normalizedAuthor) {
      const authorName = getPrimaryAuthorName(paperRecord).toLowerCase();
      const coAuthorNames = (paper.structured_authors || [])
        .map((entry) => buildFullName(pickAuthor(entry.author)))
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!authorName.includes(normalizedAuthor) && !coAuthorNames.includes(normalizedAuthor)) {
        return false;
      }
    }

    if (normalizedSearch) {
      const keywords = Array.isArray(paper.keywords) ? paper.keywords.join(' ') : '';
      const authorName = getPrimaryAuthorName(paperRecord);
      const target = `${paper.title} ${paper.abstract} ${keywords} ${authorName}`.toLowerCase();
      if (!target.includes(normalizedSearch)) {
        return false;
      }
    }

    return true;
  });
}

async function resolveCurrentStudentProfile() {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message || 'Unable to resolve the current session.');
  }

  if (!userData.user) {
    throw new Error('Sign in required to load research data.');
  }

  const profileResult = await fetchAppUserProfile(userData.user);

  if (!profileResult.user) {
    throw new Error(profileResult.message || 'Your account is not provisioned for research access.');
  }

  if (profileResult.user.role !== 'student') {
    throw new Error('Student access is required to load research data.');
  }

  return profileResult.user;
}

function extractStoragePathFromUrl(fileUrl?: string | null) {
  if (!fileUrl) return null;

  const trimmedValue = fileUrl.trim();
  if (!trimmedValue) return null;

  if (!/^https?:\/\//i.test(trimmedValue)) {
    return trimmedValue.replace(/^\/+/, '') || null;
  }

  try {
    const parsedUrl = new URL(trimmedValue);
    const marker = '/object/public/research-papers/';
    const markerIndex = parsedUrl.pathname.indexOf(marker);

    if (markerIndex >= 0) {
      return parsedUrl.pathname.slice(markerIndex + marker.length).replace(/^\//, '') || null;
    }

    const pathSegments = parsedUrl.pathname.split('/research-papers/');
    if (pathSegments.length > 1) {
      return pathSegments[1].replace(/^\//, '') || null;
    }
  } catch {
    return null;
  }

  return null;
}

async function loadResearchRows(selectQuery: string, filters?: ResearchListParams) {
  const profile = await resolveCurrentStudentProfile();

  const query = supabase
    .from('research_papers')
    .select(selectQuery)
    .eq('author_id', profile.id);

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message || 'Unable to load research data.');
  }

  const rows = Array.isArray(data) ? (data as unknown as ResearchPaperRow[]) : [];
  return filterPublishedRows(rows, filters);
}

export const researchApi = {
  getMyPapers: async () => {
    const rows = await loadResearchRows(PAPER_SELECT);
    return rows.map(toResearchPaper).sort((left, right) => {
      const leftDate = new Date(paperDate(left) || 0).getTime();
      const rightDate = new Date(paperDate(right) || 0).getTime();
      return rightDate - leftDate;
    });
  },

  getPublishedPapers: async (params?: ResearchListParams) => {
    await resolveCurrentStudentProfile();

    const { data, error } = await supabase
      .from('research_papers')
      .select(PAPER_SELECT)
      .in('status', Array.from(PUBLISHED_STATUSES))

    if (error) {
      throw new Error(error.message || 'Unable to load published papers.');
    }

    const rows = Array.isArray(data) ? (data as unknown as ResearchPaperRow[]) : [];
    return filterPublishedRows(rows, params)
      .map(toResearchPaper)
      .sort((left, right) => {
        const leftDate = new Date(paperDate(left) || 0).getTime();
        const rightDate = new Date(paperDate(right) || 0).getTime();
        return rightDate - leftDate;
      });
  },

  getCategories: async () => {
    const { data, error } = await supabase.from('research_categories').select('id, name').order('name', {
      ascending: true,
    });

    if (error) {
      throw new Error(error.message || 'Unable to load categories.');
    }

    return (Array.isArray(data) ? data : []) as Category[];
  },

  getResearchById: async (paperId: string) => {
    await resolveCurrentStudentProfile();

    const { data, error } = await supabase
      .from('research_papers')
      .select(PAPER_DETAIL_SELECT)
      .eq('id', paperId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message || 'Unable to load paper details.');
    }

    if (!data) {
      throw new Error('Paper not found.');
    }

    const row = data as unknown as ResearchPaperRow;
    const workflowHistory = Array.isArray(row.approval_workflow)
      ? row.approval_workflow
          .map(toWorkflowEntry)
          .sort((left, right) => {
            const leftDate = new Date(left.reviewed_at || left.created_at || 0).getTime();
            const rightDate = new Date(right.reviewed_at || right.created_at || 0).getTime();
            return rightDate - leftDate;
          })
      : [];

    return {
      paper: toResearchPaper(row),
      workflowHistory,
    } satisfies ResearchDetailPayload;
  },

  getResearchFile: async (paperId: string) => {
    await resolveCurrentStudentProfile();

    // Load paper metadata to resolve file path.
    const { data: paperRow, error: paperError } = await supabase
      .from('research_papers')
      .select('id, file_url')
      .eq('id', paperId)
      .maybeSingle();

    if (paperError) {
      throw new Error(paperError.message || 'Unable to load paper.');
    }

    if (!paperRow) {
      throw new Error('Paper not found.');
    }

    const storagePath = extractStoragePathFromUrl(paperRow.file_url);

    // If we have a storage path, create a signed URL; otherwise use file_url as fallback.
    if (storagePath) {
      try {
        const signedUrlData = await supabase.storage
          .from('research-papers')
          .createSignedUrl(storagePath, 3600);

        if (signedUrlData.error) {
          throw signedUrlData.error;
        }

        return {
          fileUrl: signedUrlData.data?.signedUrl || '',
          isSigned: true,
          source: 'supabase-storage',
          storagePath,
        } satisfies ResearchFilePayload;
      } catch (error) {
        console.warn('[getResearchFile] Signed URL creation failed:', error);
      }
    }

    if (paperRow.file_url) {
      return {
        fileUrl: paperRow.file_url,
        isSigned: false,
        source: 'public-url',
      } satisfies ResearchFilePayload;
    }

    return {
      fileUrl: '',
      isSigned: false,
      source: 'no-file',
    } satisfies ResearchFilePayload;
  },

  trackView: async (paperId: string) => {
    const profile = await resolveCurrentStudentProfile();

    try {
      const { error: rpcError } = await supabase.rpc('increment_view_count', {
        row_id: paperId,
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Failed to increment view count.');
      }

      const { error: insertError } = await supabase.from('paper_views').insert({
        paper_id: paperId,
        user_id: profile.id,
        viewed_at: new Date().toISOString(),
      });

      void insertError;
    } catch (error) {
      console.warn('[trackView] Error tracking view:', error);
    }
  },

  trackDownload: async (paperId: string) => {
    const profile = await resolveCurrentStudentProfile();

    try {
      const { data: paperRow, error: paperError } = await supabase
        .from('research_papers')
        .select('allow_download')
        .eq('id', paperId)
        .maybeSingle();

      if (paperError) {
        throw new Error(paperError.message || 'Unable to verify download permissions.');
      }

      if (!paperRow) {
        throw new Error('Paper not found.');
      }

      if (!(paperRow as any).allow_download) {
        throw new Error('Downloads are not allowed for this paper.');
      }

      const { error: rpcError } = await supabase.rpc('increment_download_count', {
        row_id: paperId,
      });

      if (rpcError) {
        throw new Error(rpcError.message || 'Failed to increment download count.');
      }

      const { error: insertError } = await supabase.from('paper_downloads').insert({
        paper_id: paperId,
        user_id: profile.id,
        downloaded_at: new Date().toISOString(),
      });

      void insertError;
    } catch (error) {
      console.warn('[trackDownload] Error tracking download:', error);
      throw error;
    }
  },

  getProfileData: async (_params?: {
    title?: string;
    details?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
  }) => {
    const papers = await researchApi.getMyPapers();

    return {
      profile: {
        userId: (await resolveCurrentStudentProfile()).id,
        role: 'student',
      },
      stats: {
        totalRecords: papers.length,
        uploadedCount: papers.length,
        publishedCount: papers.filter((paper) => PUBLISHED_STATUSES.has(String(paper.status))).length,
      },
      records: papers,
    };
  },
};

// =============================================================================
// Submit Research API (Phase 2)
// -----------------------------------------------------------------------------
// Maps the web parity contract (multipart POST /research/submit etc.) onto
// direct Supabase operations under the mobile anon key + RLS, per
// docs/plans/SUBMIT_RESEARCH_PARITY_MATRIX.md "Frozen Contract v1". The web
// Express backend is not reachable from the mobile runtime, so the wire-level
// multipart shape is replaced by column-mapped inserts that preserve the same
// semantics (field names, validators, status routing, storage path, post-submit
// side effects). Behavior of the existing researchApi above is unchanged.
// =============================================================================

export interface DepartmentRow {
  id: string;
  name: string;
  code?: string | null;
}

export interface FacultyMember {
  id: string;
  email?: string;
  fullName: string;
  department?: string | null;
  department_id?: string | null;
}

export interface StudentSearchResult {
  id: string;
  email?: string;
  fullName: string;
  program?: string | null;
}

export interface SubmitFileInput {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface SubmitDraftFormState {
  title: string;
  abstract: string;
  keywords: string;
  coAuthors: string;
  category: string;
  facultyId: string;
  department: string;
  departmentId: string;
}

export interface SubmitDraftPayload {
  formData: SubmitDraftFormState;
  selectedCoAuthors: StudentSearchResult[];
  hasNewFile: boolean;
  updatedAt: string;
}

interface SubmitDraftRow {
  id: string;
  user_id: string;
  paper_id: string | null;
  draft_data: SubmitDraftPayload | null;
  updated_at: string;
}

export interface SubmitInput {
  id?: string;
  file?: SubmitFileInput | null;
  title: string;
  abstract: string;
  keywords: string;
  coAuthors: string;
  externalAuthorNotes?: string;
  category: string;
  facultyId: string;
  department: string;
  departmentId: string;
  programId?: string;
  coAuthorIds?: string[];
}

export interface SubmitResult {
  paper: ResearchPaper;
}

const SUBMISSION_POLICY_FALLBACK: SubmissionPolicy = {
  maxFileSizeMb: 10,
  allowedFileTypes: ['pdf'],
};

// Storage path uniqueness only — not cryptographic. Frozen contract rule 5
// requires `${userId}/${uuid}.${ext}`; this helper produces a UUID-v4-shaped
// string without adding a uuid dependency.
function generatePathId(): string {
  const hex = (n: number) =>
    Math.floor(Math.random() * n)
      .toString(16)
      .padStart(1, '0');
  const seg = (len: number) =>
    Array.from({ length: len }, () => hex(16)).join('');
  const variant = ['8', '9', 'a', 'b'][Math.floor(Math.random() * 4)];
  return `${seg(8)}-${seg(4)}-4${seg(3)}-${variant}${seg(3)}-${seg(12)}`;
}

function buildDirectoryDisplayName(row: {
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}): string {
  const parts = [row.first_name, row.middle_name, row.last_name].filter(Boolean) as string[];
  const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
  return joined || String(row.email || '').trim();
}

async function getSubmissionPolicy(): Promise<SubmissionPolicy> {
  try {
    const { data, error } = await supabase
      .from('system_policy_settings')
      .select('max_file_size_mb, allowed_file_types')
      .maybeSingle();

    if (error || !data) {
      return SUBMISSION_POLICY_FALLBACK;
    }

    const allowedRaw = (data as { allowed_file_types?: unknown }).allowed_file_types;
    const allowed = Array.isArray(allowedRaw)
      ? (allowedRaw as unknown[])
          .map((value) => String(value || '').toLowerCase().replace(/^\./, ''))
          .filter(Boolean)
      : [];

    return {
      maxFileSizeMb:
        Number((data as { max_file_size_mb?: unknown }).max_file_size_mb) ||
        SUBMISSION_POLICY_FALLBACK.maxFileSizeMb,
      allowedFileTypes: allowed.length ? allowed : SUBMISSION_POLICY_FALLBACK.allowedFileTypes,
    };
  } catch {
    return SUBMISSION_POLICY_FALLBACK;
  }
}

async function getDepartments(): Promise<DepartmentRow[]> {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name, code')
      .order('name', { ascending: true });

    if (error) {
      return [];
    }

    return (Array.isArray(data) ? data : []) as DepartmentRow[];
  } catch {
    return [];
  }
}

async function getFacultyMembers(opts?: {
  department?: string | null;
  departmentId?: string | null;
}): Promise<FacultyMember[]> {
  try {
    let query = supabase
      .from('users')
      .select('id, email, first_name, middle_name, last_name, department, department_id')
      .eq('role', 'faculty')
      .order('last_name', { ascending: true });

    if (opts?.departmentId) {
      query = query.eq('department_id', opts.departmentId);
    } else if (opts?.department) {
      query = query.eq('department', opts.department);
    }

    const { data, error } = await query;

    if (error) {
      return [];
    }

    return (Array.isArray(data) ? data : []).map((row: any) => ({
      id: row.id,
      email: row.email ?? undefined,
      fullName: buildDirectoryDisplayName(row),
      department: row.department ?? null,
      department_id: row.department_id ?? null,
    }));
  } catch {
    return [];
  }
}

async function searchStudents(query: string): Promise<StudentSearchResult[]> {
  const trimmed = String(query || '').trim();
  if (trimmed.length < 2) return [];

  try {
    const profile = await resolveCurrentStudentProfile();
    const escaped = trimmed.replace(/[%_,]/g, '');
    const { data, error } = await supabase
      .from('users')
      .select('id, email, first_name, middle_name, last_name, program')
      .eq('role', 'student')
      .or(
        `first_name.ilike.%${escaped}%,middle_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%`
      )
      .neq('id', profile.id)
      .limit(10);

    if (error) {
      return [];
    }

    return (Array.isArray(data) ? data : []).map((row: any) => ({
      id: row.id,
      email: row.email ?? undefined,
      fullName: buildDirectoryDisplayName(row),
      program: row.program ?? null,
    }));
  } catch {
    return [];
  }
}

async function getMyDraft(paperId?: string | null): Promise<SubmitDraftPayload | null> {
  try {
    const profile = await resolveCurrentStudentProfile();
    let query = supabase
      .from('submission_drafts')
      .select('id, user_id, paper_id, draft_data, updated_at')
      .eq('user_id', profile.id)
      .order('updated_at', { ascending: false })
      .limit(1);

    if (paperId) {
      query = query.eq('paper_id', paperId);
    } else {
      query = query.is('paper_id', null);
    }

    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;

    const row = data as unknown as SubmitDraftRow;
    return row.draft_data ?? null;
  } catch {
    return null;
  }
}

async function saveMyDraft(
  paperId: string | null,
  payload: SubmitDraftPayload
): Promise<{ persisted: boolean }> {
  try {
    const profile = await resolveCurrentStudentProfile();
    const { error } = await supabase
      .from('submission_drafts')
      .upsert(
        {
          user_id: profile.id,
          paper_id: paperId,
          draft_data: payload,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,paper_id' }
      );

    if (error) {
      console.warn('[saveMyDraft] server draft save failed:', error.message);
      return { persisted: false };
    }
    return { persisted: true };
  } catch (error) {
    console.warn('[saveMyDraft]', error);
    return { persisted: false };
  }
}

async function deleteMyDraft(paperId: string | null): Promise<void> {
  try {
    const profile = await resolveCurrentStudentProfile();
    let query = supabase.from('submission_drafts').delete().eq('user_id', profile.id);

    if (paperId) {
      query = query.eq('paper_id', paperId);
    } else {
      query = query.is('paper_id', null);
    }

    await query;
  } catch (error) {
    console.warn('[deleteMyDraft]', error);
  }
}

async function submitResearch(input: SubmitInput): Promise<SubmitResult> {
  const profile = await resolveCurrentStudentProfile();

  // Frozen contract rule 2: file required for new submissions; optional on resubmit.
  if (!input.id && !input.file) {
    throw new Error('A file is required for new submissions.');
  }

  // Frozen contract rule 3: title, abstract, category required.
  if (!input.title?.trim() || !input.abstract?.trim() || !input.category?.trim()) {
    throw new Error('Title, abstract, and category are required.');
  }

  let fileFields: Record<string, unknown> = {};

  if (input.file) {
    const ext = (input.file.name.split('.').pop() || 'pdf').toLowerCase();
    const path = `${profile.id}/${generatePathId()}.${ext}`;

    const blob = await fetch(input.file.uri).then((response) => response.blob());

    const { error: uploadError } = await supabase.storage
      .from('research-papers')
      .upload(path, blob, {
        contentType: input.file.mimeType || 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      throw new Error(uploadError.message || 'File upload failed.');
    }

    const publicUrlResult = supabase.storage.from('research-papers').getPublicUrl(path);

    fileFields = {
      file_url: publicUrlResult.data?.publicUrl,
      file_storage_path: path,
      file_name: input.file.name,
      file_size: input.file.size,
    };
  }

  // Frozen contract rule 4: keywords are sent as comma string and normalized server-side;
  // mobile normalizes at insert boundary since there is no Express normalizer.
  const trimmedKeywords = (input.keywords || '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  // Frozen contract rule 1: external notes mirror coAuthors when present (web sends both
  // multipart keys with the same value; on mobile they target a single column).
  const externalNotes = String(input.externalAuthorNotes ?? input.coAuthors ?? '').trim() || null;

  // Frozen contract rule 6: deterministic status routing (identical to web backend logic).
  const status = input.facultyId ? 'pending_faculty' : 'pending_editor';

  const basePayload: Record<string, unknown> = {
    ...(input.id ? { id: input.id } : {}),
    title: input.title.trim(),
    abstract: input.abstract.trim(),
    keywords: trimmedKeywords,
    external_author_notes: externalNotes,
    category: input.category,
    author_id: profile.id,
    faculty_id: input.facultyId || null,
    department: input.department || profile.department || null,
    department_id: input.departmentId || profile.departmentId || null,
    program_id: input.programId || profile.programId || null,
    ...fileFields,
    ...(input.id ? {} : { status }),
  };

  const { data: row, error: writeError } = await supabase
    .from('research_papers')
    .upsert(basePayload)
    .select(PAPER_SELECT)
    .single();

  if (writeError) {
    throw new Error(writeError.message || 'Failed to save research record.');
  }

  const paperRow = row as unknown as ResearchPaperRow;
  const paperId = paperRow.id;

  // Mirror web `research_authors` upsert pattern: ensure primary author + structured co-authors.
  try {
    await supabase.from('research_authors').upsert(
      {
        research_id: paperId,
        user_id: profile.id,
        is_primary: true,
        author_order: 0,
      },
      { onConflict: 'research_id,user_id' }
    );

    if (input.coAuthorIds && input.coAuthorIds.length > 0) {
      const coAuthorRows = input.coAuthorIds
        .filter((authorId) => authorId && authorId !== profile.id)
        .map((authorId, index) => ({
          research_id: paperId,
          user_id: authorId,
          is_primary: false,
          author_order: index + 1,
        }));

      if (coAuthorRows.length > 0) {
        await supabase
          .from('research_authors')
          .upsert(coAuthorRows, { onConflict: 'research_id,user_id' });
      }
    }
  } catch (error) {
    // research_authors writes are best-effort — they don't gate primary submit success.
    console.warn('[submitResearch] research_authors upsert warning:', error);
  }

  return { paper: toResearchPaper(paperRow) };
}

async function createCoAuthorInvitations(
  researchId: string,
  inviteeIds: string[]
): Promise<{ created: number; skipped: number }> {
  if (!Array.isArray(inviteeIds) || inviteeIds.length === 0) {
    return { created: 0, skipped: 0 };
  }

  try {
    const profile = await resolveCurrentStudentProfile();
    const unique = Array.from(new Set(inviteeIds.filter(Boolean))).filter(
      (id) => id !== profile.id
    );

    if (unique.length === 0) {
      return { created: 0, skipped: 0 };
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const rows = unique.map((inviteeId) => ({
      research_id: researchId,
      inviter_id: profile.id,
      invitee_id: inviteeId,
      status: 'pending',
      token: generatePathId(),
      expires_at: expiresAt,
    }));

    const { data, error } = await supabase
      .from('co_author_invitations')
      .insert(rows)
      .select('id');

    if (error) {
      console.warn('[createCoAuthorInvitations]', error.message);
      return { created: 0, skipped: unique.length };
    }

    const createdCount = Array.isArray(data) ? data.length : 0;
    return { created: createdCount, skipped: unique.length - createdCount };
  } catch (error) {
    console.warn('[createCoAuthorInvitations]', error);
    return { created: 0, skipped: inviteeIds.length };
  }
}

export const submitApi = {
  getSubmissionPolicy,
  getDepartments,
  getFacultyMembers,
  searchStudents,
  getMyDraft,
  saveMyDraft,
  deleteMyDraft,
  submitResearch,
  createCoAuthorInvitations,
};
