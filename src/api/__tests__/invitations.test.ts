/**
 * See research.test.ts header for the mocking approach: `src/lib/supabase.ts` is frozen and
 * mocked below; `fetchAppUserProfile` (also frozen, under src/auth/) runs for real against the
 * faked client so the email-based identity resolution path is actually exercised.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../lib/supabase', () => {
  const { createSupabaseClientMock } = require('./supabaseTestUtils');
  return { supabase: createSupabaseClientMock() };
});

import { supabase } from '../../lib/supabase';
import { invitationsApi } from '../invitations';
import {
  createQueryBuilder,
  MockSupabaseClient,
  queryResult,
  queueProfileLookup,
} from './supabaseTestUtils';

const mockSupabase = supabase as unknown as MockSupabaseClient;

function invitationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-1',
    research_id: 'paper-1',
    inviter_id: 'faculty-1',
    invitee_id: 'student-1',
    token: 'tok-1',
    status: 'pending',
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSupabase.from.mockImplementation(() => createQueryBuilder(queryResult()));
});

describe('invitationsApi.getInvitations', () => {
  it('loads invitations, resolves inviter names via RPC (deduped), and computes pending count', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const listBuilder = createQueryBuilder(
      queryResult({
        data: [
          invitationRow({ id: 'inv-1', inviter_id: 'faculty-1' }),
          invitationRow({ id: 'inv-2', inviter_id: 'faculty-1' }),
        ],
      }),
    );
    mockSupabase.from.mockReturnValueOnce(listBuilder);
    mockSupabase.rpc.mockResolvedValueOnce({
      data: [
        {
          id: 'faculty-1',
          email: 'prof@nu-dasma.edu.ph',
          first_name: 'Grace',
          last_name: 'Hopper',
        },
      ],
      error: null,
    });
    const countBuilder = createQueryBuilder(queryResult({ count: 5 }));
    mockSupabase.from.mockReturnValueOnce(countBuilder);

    const result = await invitationsApi.getInvitations();

    expect(listBuilder.eq).toHaveBeenCalledWith('invitee_id', 'student-1');
    expect(mockSupabase.rpc).toHaveBeenCalledTimes(1); // one call for two invitations sharing an inviter
    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_user_basic_info', { user_id: 'faculty-1' });
    expect(result.invitations).toHaveLength(2);
    expect(result.invitations[0].inviter?.fullName).toBe('Grace Hopper');
    expect(result.pendingCount).toBe(5);
  });

  it('filters by status when provided', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const listBuilder = createQueryBuilder(queryResult({ data: [] }));
    mockSupabase.from.mockReturnValueOnce(listBuilder);
    mockSupabase.from.mockReturnValueOnce(createQueryBuilder(queryResult({ count: 0 })));

    await invitationsApi.getInvitations('pending');

    expect(listBuilder.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('propagates a Supabase error from the list query', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'list failed' } })),
    );

    await expect(invitationsApi.getInvitations()).rejects.toThrow('list failed');
  });

  it('propagates an error resolving the inviter profile via RPC', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ data: [invitationRow({ inviter_id: 'faculty-1' })] })),
    );
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });

    await expect(invitationsApi.getInvitations()).rejects.toThrow('rpc failed');
  });

  it('propagates a Supabase error computing the pending count', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(createQueryBuilder(queryResult({ data: [] })));
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'count failed' } })),
    );

    await expect(invitationsApi.getInvitations()).rejects.toThrow('count failed');
  });
});

describe('invitationsApi.acceptInvitation', () => {
  it('marks the invitation accepted and adds a new co-author entry at the next order', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const updateBuilder = createQueryBuilder(queryResult());
    const invitationLookupBuilder = createQueryBuilder(
      queryResult({ data: { research_id: 'paper-1' } }),
    );
    const existingLookupBuilder = createQueryBuilder(queryResult({ data: null }));
    const maxOrderBuilder = createQueryBuilder(queryResult({ data: { author_order: 2 } }));
    const upsertBuilder = createQueryBuilder(queryResult());

    mockSupabase.from
      .mockReturnValueOnce(updateBuilder)
      .mockReturnValueOnce(invitationLookupBuilder)
      .mockReturnValueOnce(existingLookupBuilder)
      .mockReturnValueOnce(maxOrderBuilder)
      .mockReturnValueOnce(upsertBuilder);

    await invitationsApi.acceptInvitation('tok-1');

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted', responded_at: expect.any(String) }),
    );
    expect(updateBuilder.eq).toHaveBeenNthCalledWith(1, 'token', 'tok-1');
    expect(updateBuilder.eq).toHaveBeenNthCalledWith(2, 'invitee_id', 'student-1');
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      { research_id: 'paper-1', user_id: 'student-1', is_primary: false, author_order: 3 },
      { onConflict: 'research_id,user_id' },
    );
  });

  it('propagates the Supabase error from the status update', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'update rejected' } })),
    );

    await expect(invitationsApi.acceptInvitation('tok-1')).rejects.toThrow('update rejected');
  });

  it('swallows errors from the research_authors side effect rather than throwing', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const updateBuilder = createQueryBuilder(queryResult());
    mockSupabase.from
      .mockReturnValueOnce(updateBuilder)
      .mockReturnValueOnce(
        createQueryBuilder(queryResult({ error: { message: 'lookup failed' } })),
      );

    await expect(invitationsApi.acceptInvitation('tok-1')).resolves.toBeUndefined();
  });
});

describe('invitationsApi.declineInvitation', () => {
  it('marks the invitation declined without touching research_authors', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const updateBuilder = createQueryBuilder(queryResult());
    mockSupabase.from.mockReturnValueOnce(updateBuilder);

    await invitationsApi.declineInvitation('tok-1');

    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'declined' }),
    );
    expect(mockSupabase.from).toHaveBeenCalledTimes(2); // users profile lookup + the update
  });

  it('propagates the Supabase error from the status update', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'update rejected' } })),
    );

    await expect(invitationsApi.declineInvitation('tok-1')).rejects.toThrow('update rejected');
  });
});
