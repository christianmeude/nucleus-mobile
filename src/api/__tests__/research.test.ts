/**
 * `src/lib/supabase.ts` is frozen (session-critical) — never imported for real here.
 * The module is mocked below; `supabaseTestUtils` builds a chainable fake client that
 * mirrors the real Supabase query-builder shape (chain methods return the builder,
 * awaiting it or calling `.maybeSingle()`/`.single()` resolves to a fixed result).
 *
 * `fetchAppUserProfile` (src/auth/, also frozen) is intentionally NOT mocked — it runs
 * for real against the faked Supabase client, so these tests exercise the actual
 * email-based identity resolution path described in CLAUDE.md's Critical Architecture
 * section (auth.getUser() -> `users` table lookup by email -> role gate).
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../lib/supabase', () => {
  const { createSupabaseClientMock } = require('./supabaseTestUtils');
  return { supabase: createSupabaseClientMock() };
});

import { supabase } from '../../lib/supabase';
import { researchApi, submitApi } from '../research';
import { apiCache } from '../../utils/apiCache';
import {
  createQueryBuilder,
  MockSupabaseClient,
  queryResult,
  queueProfileLookup,
} from './supabaseTestUtils';

const mockSupabase = supabase as unknown as MockSupabaseClient;

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'paper-x',
    title: 'Title',
    abstract: 'Abstract',
    status: 'published',
    ...overrides,
  };
}

function defaultStorageBucket() {
  return {
    createSignedUrl: jest.fn<() => Promise<any>>().mockResolvedValue(queryResult()),
    upload: jest.fn<() => Promise<any>>().mockResolvedValue(queryResult()),
    getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://example.test/public.pdf' } })),
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  apiCache.clear();
  mockSupabase.from.mockImplementation(() => createQueryBuilder(queryResult()));
  mockSupabase.storage.from.mockImplementation(() => defaultStorageBucket());
});

describe('researchApi.getMyPapers', () => {
  it('merges primary-authored and co-authored papers, newest first, without duplicates', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });

    const primaryBuilder = createQueryBuilder(
      queryResult({
        data: [
          row({ id: 'p1', published_date: '2026-01-01T00:00:00.000Z' }),
          row({ id: 'p2', published_date: '2026-03-01T00:00:00.000Z' }),
        ],
      })
    );
    const coAuthorIdsBuilder = createQueryBuilder(
      queryResult({ data: [{ research_id: 'p3' }, { research_id: 'p1' }] })
    );
    const coAuthoredBuilder = createQueryBuilder(
      queryResult({ data: [row({ id: 'p3', published_date: '2026-02-01T00:00:00.000Z' })] })
    );

    mockSupabase.from
      .mockReturnValueOnce(primaryBuilder)
      .mockReturnValueOnce(coAuthorIdsBuilder)
      .mockReturnValueOnce(coAuthoredBuilder);

    const result = await researchApi.getMyPapers();

    // p1 appears in both the primary set and the co-author id list; it must not duplicate.
    expect(result.map((p) => p.id)).toEqual(['p2', 'p3', 'p1']);
    expect(primaryBuilder.eq).toHaveBeenCalledWith('author_id', 'student-1');
    expect(coAuthorIdsBuilder.eq).toHaveBeenNthCalledWith(1, 'user_id', 'student-1');
    expect(coAuthorIdsBuilder.eq).toHaveBeenNthCalledWith(2, 'is_primary', false);
    expect(coAuthoredBuilder.in).toHaveBeenCalledWith('id', ['p3']);
  });

  it('skips the co-authored lookup entirely when there are no co-authored ids', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from
      .mockReturnValueOnce(createQueryBuilder(queryResult({ data: [row({ id: 'p1' })] })))
      .mockReturnValueOnce(createQueryBuilder(queryResult({ data: [] })));

    const result = await researchApi.getMyPapers();

    expect(result.map((p) => p.id)).toEqual(['p1']);
    expect(mockSupabase.from).toHaveBeenCalledTimes(3); // users, research_papers, research_authors
  });

  it('propagates a Supabase error from the primary papers query', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'db down' } }))
    );

    await expect(researchApi.getMyPapers()).rejects.toThrow('db down');
  });

  it('rejects when the signed-in user is not a student', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { role: 'faculty' } });

    await expect(researchApi.getMyPapers()).rejects.toThrow('Student access is required');
  });

  it('rejects when the email has no matching application profile (not provisioned)', async () => {
    queueProfileLookup(mockSupabase, { profileRow: null });

    await expect(researchApi.getMyPapers()).rejects.toThrow(/not been provisioned/i);
  });
});

describe('researchApi.getPublishedPapers', () => {
  it('queries only published/approved statuses and applies client-side filters', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const builder = createQueryBuilder(
      queryResult({
        data: [
          row({ id: 'p1', category: 'cs', published_date: '2026-01-01T00:00:00.000Z' }),
          row({ id: 'p2', category: 'bio', published_date: '2026-01-02T00:00:00.000Z' }),
        ],
      })
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await researchApi.getPublishedPapers({ category: 'cs' });

    expect(builder.in).toHaveBeenCalledWith('status', expect.arrayContaining(['approved', 'published']));
    expect(result.map((p) => p.id)).toEqual(['p1']);
  });

  it('propagates a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'timeout' } }))
    );

    await expect(researchApi.getPublishedPapers()).rejects.toThrow('timeout');
  });

  it('filters papers by department name client-side', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const builder = createQueryBuilder(
      queryResult({
        data: [
          row({ id: 'p1', department: 'CCIS', department_id: 'd1' }),
          row({ id: 'p2', department: 'College of Education', department_id: 'd2' }),
        ],
      })
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await researchApi.getPublishedPapers({ department: 'college of education' });

    expect(result.map((p) => p.id)).toEqual(['p2']);
  });

  it('filters papers by program name and maps the program relation through', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const builder = createQueryBuilder(
      queryResult({
        data: [
          row({
            id: 'p1',
            department: 'CCIS',
            department_id: 'd1',
            program_id: 'pr1',
            program: { id: 'pr1', name: 'Computer Science', code: 'BSCS' },
          }),
          row({
            id: 'p2',
            department: 'CCIS',
            department_id: 'd1',
            program_id: 'pr2',
            program: { id: 'pr2', name: 'Information Technology', code: 'BSIT' },
          }),
          row({ id: 'p3', department: 'CCIS', department_id: 'd1' }),
        ],
      })
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await researchApi.getPublishedPapers({ department: 'ccis', program: 'computer science' });

    expect(result.map((p) => p.id)).toEqual(['p1']);
    expect(result[0].department_id).toBe('d1');
    expect(result[0].program_id).toBe('pr1');
    expect(result[0].program).toEqual({ id: 'pr1', name: 'Computer Science', code: 'BSCS' });
  });

  it('excludes papers without a matching program when a program filter is set', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const builder = createQueryBuilder(
      queryResult({
        data: [
          row({ id: 'p1', department: 'CCIS', department_id: 'd1' }),
          row({
            id: 'p2',
            department: 'CCIS',
            department_id: 'd1',
            program_id: 'pr2',
            program: { id: 'pr2', name: 'Information Technology', code: 'BSIT' },
          }),
        ],
      })
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await researchApi.getPublishedPapers({ program: 'computer science' });

    expect(result.map((p) => p.id)).toEqual([]);
  });
});

describe('researchApi.getCategories', () => {
  it('returns the categories list without resolving a profile', async () => {
    const builder = createQueryBuilder(
      queryResult({ data: [{ id: '1', name: 'Computer Science' }] })
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await researchApi.getCategories();

    expect(mockSupabase.from).toHaveBeenCalledWith('research_categories');
    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
    expect(result).toEqual([{ id: '1', name: 'Computer Science' }]);
  });

  it('propagates a Supabase error', async () => {
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'relation missing' } }))
    );

    await expect(researchApi.getCategories()).rejects.toThrow('relation missing');
  });
});

describe('researchApi.getResearchById', () => {
  it('sorts workflow history newest-first and returns the paper', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const builder = createQueryBuilder(
      queryResult({
        data: row({
          id: 'p1',
          approval_workflow: [
            { id: 'w1', reviewed_at: '2026-01-01T00:00:00.000Z' },
            { id: 'w2', reviewed_at: '2026-03-01T00:00:00.000Z' },
          ],
        }),
      })
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await researchApi.getResearchById('p1');

    expect(builder.eq).toHaveBeenCalledWith('id', 'p1');
    expect(result.paper.id).toBe('p1');
    expect(result.workflowHistory.map((w) => w.id)).toEqual(['w2', 'w1']);
  });

  it('throws when the paper does not exist', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(createQueryBuilder(queryResult({ data: null })));

    await expect(researchApi.getResearchById('missing')).rejects.toThrow('Paper not found.');
  });

  it('propagates a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'boom' } }))
    );

    await expect(researchApi.getResearchById('p1')).rejects.toThrow('boom');
  });
});

describe('researchApi.getResearchFile', () => {
  it('returns a signed storage URL when the file lives in the research-papers bucket', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(
        queryResult({
          data: {
            id: 'p1',
            file_url:
              'https://project.supabase.co/storage/v1/object/public/research-papers/student-1/file.pdf',
          },
        })
      )
    );
    const createSignedUrl = jest
      .fn<() => Promise<any>>()
      .mockResolvedValue({ data: { signedUrl: 'https://signed.example/file.pdf' }, error: null });
    mockSupabase.storage.from.mockReturnValueOnce({ createSignedUrl, upload: jest.fn(), getPublicUrl: jest.fn() });

    const result = await researchApi.getResearchFile('p1');

    expect(mockSupabase.storage.from).toHaveBeenCalledWith('research-papers');
    expect(createSignedUrl).toHaveBeenCalledWith('student-1/file.pdf', 3600);
    expect(result).toEqual({
      fileUrl: 'https://signed.example/file.pdf',
      isSigned: true,
      source: 'supabase-storage',
      storagePath: 'student-1/file.pdf',
    });
  });

  it('falls back to the stored public URL when signed-URL creation fails', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(
        queryResult({
          data: {
            id: 'p1',
            file_url:
              'https://project.supabase.co/storage/v1/object/public/research-papers/student-1/file.pdf',
          },
        })
      )
    );
    mockSupabase.storage.from.mockReturnValueOnce({
      createSignedUrl: jest.fn<() => Promise<any>>().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
    });

    const result = await researchApi.getResearchFile('p1');

    expect(result.isSigned).toBe(false);
    expect(result.source).toBe('public-url');
    expect(result.fileUrl).toContain('research-papers/student-1/file.pdf');
  });

  it('reports no-file when the paper has no file_url', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ data: { id: 'p1', file_url: null } }))
    );

    const result = await researchApi.getResearchFile('p1');

    expect(result).toEqual({ fileUrl: '', isSigned: false, source: 'no-file' });
  });

  it('throws when the paper is not found', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(createQueryBuilder(queryResult({ data: null })));

    await expect(researchApi.getResearchFile('missing')).rejects.toThrow('Paper not found.');
  });

  it('propagates a Supabase error looking up the paper', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'read failed' } }))
    );

    await expect(researchApi.getResearchFile('p1')).rejects.toThrow('read failed');
  });
});

describe('researchApi.trackView', () => {
  it('increments the view count and logs a view row, swallowing errors', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.rpc.mockResolvedValueOnce({ error: null });
    const insertBuilder = createQueryBuilder(queryResult());
    mockSupabase.from.mockReturnValueOnce(insertBuilder);

    await researchApi.trackView('p1');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('increment_view_count', { row_id: 'p1' });
    expect(mockSupabase.from).toHaveBeenCalledWith('paper_views');
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ paper_id: 'p1', user_id: 'student-1', viewed_at: expect.any(String) })
    );
  });

  it('never throws even when the RPC call fails', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.rpc.mockResolvedValueOnce({ error: { message: 'rpc failed' } });

    await expect(researchApi.trackView('p1')).resolves.toBeUndefined();
    // The insert step is unreachable once the RPC error throws inside the try block.
    expect(mockSupabase.from).not.toHaveBeenCalledWith('paper_views');
  });
});

describe('researchApi.getProfileData', () => {
  it('computes stats from the caller papers', async () => {
    // First profile lookup drives getMyPapers(); second drives the standalone
    // resolveCurrentStudentProfile() call getProfileData makes for `profile.userId`.
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from
      .mockReturnValueOnce(
        createQueryBuilder(
          queryResult({ data: [row({ id: 'p1', status: 'published' }), row({ id: 'p2', status: 'pending' })] })
        )
      )
      .mockReturnValueOnce(createQueryBuilder(queryResult({ data: [] })));
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });

    const result = await researchApi.getProfileData();

    expect(result.profile).toEqual({ userId: 'student-1', role: 'student' });
    expect(result.stats).toEqual({ totalRecords: 2, uploadedCount: 2, publishedCount: 1 });
    expect(result.records).toHaveLength(2);
  });
});

describe('researchApi.getRelatedPapers', () => {
  it('fetches similar papers via hybrid search and filters out the current paper', async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: {
        results: [
          { paper_id: 'p2', score: 0.9 },
          { paper_id: 'p1', score: 0.8 },
          { paper_id: 'p3', score: 0.7 }
        ]
      },
      error: null
    });

    const builder = createQueryBuilder(
      queryResult({
        data: [
          row({ id: 'p2' }),
          row({ id: 'p1' }),
          row({ id: 'p3' })
        ]
      })
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    const paper = row({ id: 'p1', title: 'Test Title', abstract: 'Test Abstract' }) as any;
    const result = await researchApi.getRelatedPapers(paper, 2);

    expect(mockSupabase.functions.invoke).toHaveBeenCalledWith('search-papers', {
      body: { q: 'Test Title Test Abstract', limit: 4 }
    });
    
    expect(builder.in).toHaveBeenCalledWith('id', ['p2', 'p1', 'p3']);
    
    // p1 is filtered out, leaving p2 and p3
    expect(result.map(r => r.id)).toEqual(['p2', 'p3']);
  });
  
  it('gracefully handles empty search results', async () => {
    mockSupabase.functions.invoke.mockResolvedValueOnce({
      data: { results: [] },
      error: null
    });

    const paper = row({ id: 'p1', title: 'Test', abstract: 'Abstract' }) as any;
    const result = await researchApi.getRelatedPapers(paper, 3);

    expect(result).toEqual([]);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });
});

describe('submitApi.getSubmissionPolicy', () => {
  it('normalizes allowed file types from the stored settings row', async () => {
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(
        queryResult({ data: { max_file_size_mb: 25, allowed_file_types: ['.PDF', 'Docx'] } })
      )
    );

    const policy = await submitApi.getSubmissionPolicy();

    expect(policy).toEqual({ maxFileSizeMb: 25, allowedFileTypes: ['pdf', 'docx'] });
  });

  it('falls back to defaults on a Supabase error rather than throwing', async () => {
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'no policy table' } }))
    );

    await expect(submitApi.getSubmissionPolicy()).resolves.toEqual({
      maxFileSizeMb: 10,
      allowedFileTypes: ['pdf'],
    });
  });
});

describe('submitApi.getDepartments', () => {
  it('returns department rows', async () => {
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ data: [{ id: 'd1', name: 'CCIS', code: 'CCIS' }] }))
    );

    await expect(submitApi.getDepartments()).resolves.toEqual([
      { id: 'd1', name: 'CCIS', code: 'CCIS' },
    ]);
  });

  it('returns an empty array on a Supabase error rather than throwing', async () => {
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'boom' } }))
    );

    await expect(submitApi.getDepartments()).resolves.toEqual([]);
  });
});

describe('submitApi.getPrograms', () => {
  it('filters by department and returns active programs ordered by name', async () => {
    const builder = createQueryBuilder(
      queryResult({
        data: [
          { id: 'pr1', name: 'Computer Science', code: 'BSCS', department_id: 'd1' },
          { id: 'pr2', name: 'Information Technology', code: 'BSIT', department_id: 'd1' },
        ],
      })
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    await expect(submitApi.getPrograms('d1')).resolves.toEqual([
      { id: 'pr1', name: 'Computer Science', code: 'BSCS', department_id: 'd1' },
      { id: 'pr2', name: 'Information Technology', code: 'BSIT', department_id: 'd1' },
    ]);

    expect(builder.select).toHaveBeenCalledWith('id, name, code, department_id');
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'is_active', true);
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'department_id', 'd1');
    expect(builder.order).toHaveBeenCalledWith('name', { ascending: true });
  });

  it('skips the department filter when no department is given', async () => {
    const builder = createQueryBuilder(queryResult({ data: [] }));
    mockSupabase.from.mockReturnValueOnce(builder);

    await expect(submitApi.getPrograms()).resolves.toEqual([]);

    expect(builder.eq).toHaveBeenCalledTimes(1);
    expect(builder.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('returns an empty array on a Supabase error rather than throwing', async () => {
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'relation missing' } }))
    );

    await expect(submitApi.getPrograms('d1')).resolves.toEqual([]);
  });
});

describe('submitApi.getFacultyMembers', () => {
  it('maps RPC rows, preferring full_name, falling back to name parts', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [
        { id: 'f1', full_name: 'Dr. Ada Lovelace', email: 'ada@nu.edu.ph', department: 'CCIS' },
        { id: 'f2', first_name: 'Grace', last_name: 'Hopper', email: 'grace@nu.edu.ph' },
      ],
      error: null,
    });

    const result = await submitApi.getFacultyMembers({ department: 'CCIS' });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_faculty_members', {
      p_department: 'CCIS',
      p_department_id: null,
    });
    expect(result).toEqual([
      { id: 'f1', email: 'ada@nu.edu.ph', fullName: 'Dr. Ada Lovelace', department: 'CCIS', department_id: null },
      { id: 'f2', email: 'grace@nu.edu.ph', fullName: 'Grace Hopper', department: null, department_id: null },
    ]);
  });

  it('returns an empty array on an RPC error rather than throwing', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });

    await expect(submitApi.getFacultyMembers()).resolves.toEqual([]);
  });
});

describe('submitApi.searchStudents', () => {
  it('returns an empty list without any Supabase calls for short queries', async () => {
    await expect(submitApi.searchStudents('a')).resolves.toEqual([]);
    expect(mockSupabase.auth.getUser).not.toHaveBeenCalled();
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('excludes the caller from the results', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [
        { id: 'student-1', full_name: 'Me' },
        { id: 'student-2', full_name: 'Other Student' },
      ],
      error: null,
    });

    const result = await submitApi.searchStudents('grace');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('search_students', { p_query: 'grace' });
    expect(result.map((r) => r.id)).toEqual(['student-2']);
  });

  it('returns an empty list rather than throwing when the profile lookup fails', async () => {
    queueProfileLookup(mockSupabase, { profileRow: null });

    await expect(submitApi.searchStudents('grace')).resolves.toEqual([]);
  });
});

describe('submitApi.getMyDraft / saveMyDraft / deleteMyDraft', () => {
  it('getMyDraft returns the stored draft payload', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const draft = { formData: {}, selectedCoAuthors: [], hasNewFile: false, updatedAt: 'now' };
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ data: { id: 'd1', draft_data: draft } }))
    );

    await expect(submitApi.getMyDraft(null)).resolves.toEqual(draft);
  });

  it('getMyDraft returns null rather than throwing on a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'boom' } }))
    );

    await expect(submitApi.getMyDraft(null)).resolves.toBeNull();
  });

  it('saveMyDraft reports persisted:false on a Supabase error instead of throwing', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'write failed' } }))
    );

    await expect(
      submitApi.saveMyDraft(null, {
        formData: {} as never,
        selectedCoAuthors: [],
        hasNewFile: false,
        updatedAt: 'now',
      })
    ).resolves.toEqual({ persisted: false });
  });

  it('deleteMyDraft swallows errors and never throws', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'delete failed' } }))
    );

    await expect(submitApi.deleteMyDraft(null)).resolves.toBeUndefined();
  });
});

describe('submitApi.createCoAuthorInvitations', () => {
  it('short-circuits with no Supabase call for an empty invitee list', async () => {
    await expect(submitApi.createCoAuthorInvitations('p1', [])).resolves.toEqual({
      created: 0,
      skipped: 0,
    });
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('counts CREATED rows from the RPC response, deduping invitee ids', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [{ result: 'CREATED' }, { result: 'ALREADY_INVITED' }],
      error: null,
    });

    const result = await submitApi.createCoAuthorInvitations('p1', ['u1', 'u2', 'u1']);

    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_co_author_invitations', {
      p_research_id: 'p1',
      p_invitee_ids: ['u1', 'u2'],
    });
    expect(result).toEqual({ created: 1, skipped: 1 });
  });

  it('reports every invitee as skipped on an RPC error rather than throwing', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });

    await expect(submitApi.createCoAuthorInvitations('p1', ['u1', 'u2'])).resolves.toEqual({
      created: 0,
      skipped: 2,
    });
  });
});

describe('submitApi.submitResearch (validation only)', () => {
  it('requires a file for a brand-new submission', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });

    await expect(
      submitApi.submitResearch({
        title: 'T',
        abstract: 'A',
        keywords: '',
        coAuthors: '',
        category: 'cs',
        facultyId: '',
        department: '',
        departmentId: '',
      })
    ).rejects.toThrow('A file is required for new submissions.');
  });

  it('requires title, abstract, and category', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });

    await expect(
      submitApi.submitResearch({
        id: 'existing-paper',
        title: '',
        abstract: 'A',
        keywords: '',
        coAuthors: '',
        category: 'cs',
        facultyId: '',
        department: '',
        departmentId: '',
      })
    ).rejects.toThrow('Title, abstract, and category are required.');
  });

  it('wraps a failed profile resolution as a stage-prefixed error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: null });

    await expect(
      submitApi.submitResearch({
        id: 'existing-paper',
        title: 'T',
        abstract: 'A',
        keywords: '',
        coAuthors: '',
        category: 'cs',
        facultyId: '',
        department: '',
        departmentId: '',
      })
    ).rejects.toThrow(/^\[submit\] profile:/);
  });
});
