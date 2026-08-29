/**
 * See research.test.ts header for the mocking approach: `src/lib/supabase.ts` is frozen and
 * mocked below; `fetchAppUserProfile` (also frozen, under src/auth/) runs for real against the
 * faked client so the email-based identity resolution path is actually exercised. Every
 * facultyApi function gates on role === 'faculty' via its own resolveCurrentFacultyProfile,
 * distinct from the student-only resolver used by research/invitations/notifications.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../lib/supabase', () => {
  const { createSupabaseClientMock } = require('./supabaseTestUtils');
  return { supabase: createSupabaseClientMock() };
});

import { supabase } from '../../lib/supabase';
import { facultyApi, summarizeFacultyWorkload } from '../faculty';
import { apiCache } from '../../utils/apiCache';
import {
  createQueryBuilder,
  MockSupabaseClient,
  queryResult,
  queueProfileLookup,
} from './supabaseTestUtils';

const mockSupabase = supabase as unknown as MockSupabaseClient;

function facultyProfile(overrides: Record<string, unknown> = {}) {
  return { role: 'faculty', id: 'faculty-1', ...overrides };
}

function paperRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'paper-1',
    title: 'Title',
    abstract: 'Abstract',
    status: 'pending_faculty',
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  apiCache.clear();
  mockSupabase.from.mockImplementation(() => createQueryBuilder(queryResult()));
  mockSupabase.storage.from.mockImplementation(() => ({
    createSignedUrl: jest.fn<() => Promise<any>>().mockResolvedValue(queryResult()),
    upload: jest.fn(),
    getPublicUrl: jest.fn(),
  }));
});

describe('summarizeFacultyWorkload (pure)', () => {
  it('buckets papers by status', () => {
    const summary = summarizeFacultyWorkload([
      { status: 'pending_faculty' } as any,
      { status: 'revision_required' } as any,
      { status: 'pending_dean' } as any,
      { status: 'approved' } as any,
      { status: 'published' } as any,
      { status: 'draft' } as any,
    ]);

    expect(summary).toEqual({
      pendingReview: 1,
      revisionRequired: 1,
      forwardedByYou: 1,
      approvedByYou: 2,
      totalAssigned: 6,
    });
  });
});

describe('facultyApi.getAssignedPapers', () => {
  it('loads papers assigned to the signed-in faculty member', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    const builder = createQueryBuilder(
      queryResult({
        data: [
          paperRow({ id: 'p1', submission_date: '2026-01-01T00:00:00.000Z' }),
          paperRow({ id: 'p2', submission_date: '2026-03-01T00:00:00.000Z' }),
        ],
      }),
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await facultyApi.getAssignedPapers();

    expect(builder.eq).toHaveBeenCalledWith('faculty_id', 'faculty-1');
    expect(result.map((p) => p.id)).toEqual(['p2', 'p1']);
  });

  it('rejects when the signed-in user is not faculty', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { role: 'student' } });

    await expect(facultyApi.getAssignedPapers()).rejects.toThrow('Faculty access is required');
  });

  it('propagates a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'load failed' } })),
    );

    await expect(facultyApi.getAssignedPapers()).rejects.toThrow('load failed');
  });
});

describe('facultyApi.getReviewDetail', () => {
  it('returns the paper detail with workflow sorted newest-first', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(
        queryResult({
          data: paperRow({
            id: 'p1',
            approval_workflow: [
              { id: 'w1', reviewed_at: '2026-01-01T00:00:00.000Z' },
              { id: 'w2', reviewed_at: '2026-02-01T00:00:00.000Z' },
            ],
          }),
        }),
      ),
    );

    const result = await facultyApi.getReviewDetail('p1');

    expect(result.id).toBe('p1');
    expect(result.workflow.map((w) => w.id)).toEqual(['w2', 'w1']);
  });

  it('throws when the paper is not assigned to this faculty member', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.from.mockReturnValueOnce(createQueryBuilder(queryResult({ data: null })));

    await expect(facultyApi.getReviewDetail('p1')).rejects.toThrow('not assigned to you');
  });

  it('propagates a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'boom' } })),
    );

    await expect(facultyApi.getReviewDetail('p1')).rejects.toThrow('boom');
  });
});

describe('facultyApi.getReviewFile', () => {
  it('returns a signed URL for a storage-backed file', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(
        queryResult({
          data: {
            id: 'p1',
            file_url:
              'https://project.supabase.co/storage/v1/object/public/research-papers/student-1/file.pdf',
          },
        }),
      ),
    );
    mockSupabase.storage.from.mockReturnValueOnce({
      createSignedUrl: jest
        .fn<() => Promise<any>>()
        .mockResolvedValue({ data: { signedUrl: 'https://signed.example/file.pdf' }, error: null }),
      upload: jest.fn(),
      getPublicUrl: jest.fn(),
    });

    const result = await facultyApi.getReviewFile('p1');

    expect(result).toEqual({ fileUrl: 'https://signed.example/file.pdf', isSigned: true });
  });

  it('throws when no file is attached', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ data: { id: 'p1', file_url: null } })),
    );

    await expect(facultyApi.getReviewFile('p1')).rejects.toThrow('No file is attached');
  });

  it('propagates a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'read failed' } })),
    );

    await expect(facultyApi.getReviewFile('p1')).rejects.toThrow('read failed');
  });
});

describe('facultyApi.getDeanChairMembers', () => {
  it('maps dean/chair rows', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [
        { id: 'd1', first_name: 'Ada', last_name: 'Lovelace', role: 'dean', department: 'CCIS' },
      ],
      error: null,
    });

    const result = await facultyApi.getDeanChairMembers();

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_dean_chair_members');
    expect(result).toEqual([{ id: 'd1', name: 'Ada Lovelace', role: 'dean', department: 'CCIS' }]);
  });

  it('propagates an RPC error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });

    await expect(facultyApi.getDeanChairMembers()).rejects.toThrow('rpc failed');
  });
});

describe('facultyApi.approvePaper / requestRevision / rejectPaper', () => {
  it('approvePaper calls the SECURITY DEFINER RPC with the right args and returns the new status', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.rpc.mockResolvedValueOnce({ data: 'pending_dean', error: null });

    const result = await facultyApi.approvePaper('p1', 'dean-1', 'dean', '  looks good  ');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('faculty_approve_paper', {
      p_paper_id: 'p1',
      p_target_user_id: 'dean-1',
      p_target_role: 'dean',
      p_comments: 'looks good',
    });
    expect(result).toBe('pending_dean');
  });

  it('approvePaper propagates an RPC error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'not pending_faculty' },
    });

    await expect(facultyApi.approvePaper('p1', 'dean-1', 'dean')).rejects.toThrow(
      'not pending_faculty',
    );
  });

  it('requestRevision sends trimmed notes and returns the new status', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.rpc.mockResolvedValueOnce({ data: 'revision_required', error: null });

    const result = await facultyApi.requestRevision('p1', 'please fix the abstract');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('faculty_request_revision', {
      p_paper_id: 'p1',
      p_notes: 'please fix the abstract',
    });
    expect(result).toBe('revision_required');
  });

  it('requestRevision propagates an RPC error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });

    await expect(facultyApi.requestRevision('p1', 'notes')).rejects.toThrow('rpc failed');
  });

  it('rejectPaper sends the reason and returns the new status', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.rpc.mockResolvedValueOnce({ data: 'rejected', error: null });

    const result = await facultyApi.rejectPaper('p1', 'out of scope');

    expect(mockSupabase.rpc).toHaveBeenCalledWith('faculty_reject_paper', {
      p_paper_id: 'p1',
      p_reason: 'out of scope',
    });
    expect(result).toBe('rejected');
  });

  it('rejectPaper propagates an RPC error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });

    await expect(facultyApi.rejectPaper('p1', 'reason')).rejects.toThrow('rpc failed');
  });
});

describe('facultyApi.getAnnotations', () => {
  it('parses the meta envelope out of the stored comment', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    const comment =
      '[[meta]]{"annotationType":"note","pageNumber":2,"highlightColor":"#ffcc00","anchorPercent":{"x":10,"y":20}}[[/meta]]Please expand this section.';
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(
        queryResult({
          data: [
            {
              id: 'a1',
              comment,
              parent_id: null,
              created_at: '2026-01-01T00:00:00.000Z',
              reviewer: { id: 'r1', first_name: 'Ada', last_name: 'Lovelace', role: 'dean' },
            },
          ],
        }),
      ),
    );

    const result = await facultyApi.getAnnotations('p1');

    expect(result).toEqual([
      expect.objectContaining({
        id: 'a1',
        annotationType: 'note',
        pageNumber: 2,
        highlightColor: '#ffcc00',
        anchorPercent: { x: 10, y: 20 },
        note: 'Please expand this section.',
        reviewerName: 'Ada Lovelace',
        reviewerRole: 'dean',
      }),
    ]);
  });

  it('treats a plain comment (no meta envelope) as an unpositioned note', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(
        queryResult({
          data: [{ id: 'a1', comment: 'Looks good overall.', created_at: null, reviewer: null }],
        }),
      ),
    );

    const result = await facultyApi.getAnnotations('p1');

    expect(result[0]).toEqual(
      expect.objectContaining({
        annotationType: 'comment',
        pageNumber: null,
        note: 'Looks good overall.',
      }),
    );
  });

  it('propagates a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'load failed' } })),
    );

    await expect(facultyApi.getAnnotations('p1')).rejects.toThrow('load failed');
  });
});

describe('facultyApi.createNoteAnnotation', () => {
  it('assembles the meta envelope and inserts via the SECURITY DEFINER RPC', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.rpc.mockResolvedValueOnce({ data: 'annotation-1', error: null });

    const result = await facultyApi.createNoteAnnotation({
      paperId: 'p1',
      note: '  see fig 2  ',
      pageNumber: 3,
      anchorPercent: { x: 25, y: 50 },
    });

    expect(mockSupabase.rpc).toHaveBeenCalledWith('create_faculty_annotation', {
      p_paper_id: 'p1',
      p_comment:
        '[[meta]]{"annotationType":"note","pageNumber":3,"anchorPercent":{"x":25,"y":50},"highlightColor":"#CDA434"}[[/meta]]\nsee fig 2',
    });
    expect(result).toBe('annotation-1');
  });

  it('rejects an empty note before hitting the RPC', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });

    await expect(
      facultyApi.createNoteAnnotation({
        paperId: 'p1',
        note: '   ',
        pageNumber: 1,
        anchorPercent: { x: 0, y: 0 },
      }),
    ).rejects.toThrow('Add a note before saving');
    expect(mockSupabase.rpc).not.toHaveBeenCalled();
  });

  it('propagates an RPC error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'not assigned to you' },
    });

    await expect(
      facultyApi.createNoteAnnotation({
        paperId: 'p1',
        note: 'x',
        pageNumber: 1,
        anchorPercent: { x: 0, y: 0 },
      }),
    ).rejects.toThrow('not assigned to you');
  });
});

describe('facultyApi.getPublishedPapers', () => {
  it('queries published/approved statuses, newest first', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    const builder = createQueryBuilder(
      queryResult({
        data: [
          paperRow({ id: 'p1', submission_date: '2026-01-01T00:00:00.000Z' }),
          paperRow({ id: 'p2', submission_date: '2026-02-01T00:00:00.000Z' }),
        ],
      }),
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await facultyApi.getPublishedPapers();

    expect(builder.in).toHaveBeenCalledWith(
      'status',
      expect.arrayContaining(['approved', 'published']),
    );
    expect(result.map((p) => p.id)).toEqual(['p2', 'p1']);
  });

  it('propagates a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'boom' } })),
    );

    await expect(facultyApi.getPublishedPapers()).rejects.toThrow('boom');
  });
});

describe('facultyApi.getNotifications / markNotificationRead / markAllNotificationsRead', () => {
  it('loads the faculty member notifications', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    const builder = createQueryBuilder(
      queryResult({
        data: [
          {
            id: 'n1',
            user_id: 'faculty-1',
            is_read: false,
            created_at: '2026-01-01T00:00:00.000Z',
          },
        ],
      }),
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await facultyApi.getNotifications();

    expect(builder.eq).toHaveBeenCalledWith('user_id', 'faculty-1');
    expect(result).toHaveLength(1);
  });

  it('getNotifications propagates a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'load failed' } })),
    );

    await expect(facultyApi.getNotifications()).rejects.toThrow('load failed');
  });

  it('markNotificationRead scopes the update to the caller', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    const builder = createQueryBuilder(queryResult());
    mockSupabase.from.mockReturnValueOnce(builder);

    await facultyApi.markNotificationRead('n1');

    expect(builder.eq).toHaveBeenNthCalledWith(1, 'id', 'n1');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'user_id', 'faculty-1');
  });

  it('markAllNotificationsRead propagates a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: facultyProfile() });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'update failed' } })),
    );

    await expect(facultyApi.markAllNotificationsRead()).rejects.toThrow('update failed');
  });
});
