/**
 * See research.test.ts header for the mocking approach: `src/lib/supabase.ts` is frozen and
 * mocked below. Unlike the other facades, collections.ts does no client-side identity
 * resolution (no resolveCurrentStudentProfile) — RLS scopes every query to the caller
 * implicitly, so there is no `users` lookup to queue here.
 */
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.mock('../../lib/supabase', () => {
  const { createSupabaseClientMock } = require('./supabaseTestUtils');
  return { supabase: createSupabaseClientMock() };
});

import { supabase } from '../../lib/supabase';
import {
  getMyCollections,
  getSavedPaperIds,
  getSavedPapers,
  togglePaperSaved,
} from '../collections';
import { createQueryBuilder, MockSupabaseClient, queryResult } from './supabaseTestUtils';

const mockSupabase = supabase as unknown as MockSupabaseClient;

beforeEach(() => {
  jest.resetAllMocks();
  mockSupabase.from.mockImplementation(() => createQueryBuilder(queryResult()));
});

describe('togglePaperSaved', () => {
  it('calls the toggle RPC with the paper id and returns the boolean result', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: true, error: null });

    await expect(togglePaperSaved('paper-1')).resolves.toBe(true);
    expect(mockSupabase.rpc).toHaveBeenCalledWith('toggle_paper_saved', { p_paper_id: 'paper-1' });
  });

  it('propagates the raw Supabase error', async () => {
    mockSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'rpc failed' } });

    // collections.ts re-throws the raw Supabase error object (not `new Error(...)`), so
    // `.toThrow()` (which expects an Error instance) can't match it — assert the shape instead.
    await expect(togglePaperSaved('paper-1')).rejects.toMatchObject({ message: 'rpc failed' });
  });
});

describe('getSavedPaperIds', () => {
  it('returns paper ids from the default collection', async () => {
    const collectionsBuilder = createQueryBuilder(queryResult({ data: { id: 'col-1' } }));
    const papersBuilder = createQueryBuilder(
      queryResult({ data: [{ paper_id: 'p1' }, { paper_id: 'p2' }] })
    );
    mockSupabase.from.mockReturnValueOnce(collectionsBuilder).mockReturnValueOnce(papersBuilder);

    const result = await getSavedPaperIds();

    expect(collectionsBuilder.eq).toHaveBeenCalledWith('is_default', true);
    expect(papersBuilder.eq).toHaveBeenCalledWith('collection_id', 'col-1');
    expect(result).toEqual(['p1', 'p2']);
  });

  it('returns an empty array when no default collection exists yet', async () => {
    mockSupabase.from.mockReturnValueOnce(createQueryBuilder(queryResult({ data: null })));

    await expect(getSavedPaperIds()).resolves.toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1); // no collection_papers lookup attempted
  });

  it('propagates a Supabase error looking up the default collection', async () => {
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'lookup failed' } }))
    );

    await expect(getSavedPaperIds()).rejects.toMatchObject({ message: 'lookup failed' });
  });

  it('propagates a Supabase error loading saved paper ids', async () => {
    mockSupabase.from
      .mockReturnValueOnce(createQueryBuilder(queryResult({ data: { id: 'col-1' } })))
      .mockReturnValueOnce(createQueryBuilder(queryResult({ error: { message: 'papers failed' } })));

    await expect(getSavedPaperIds()).rejects.toMatchObject({ message: 'papers failed' });
  });
});

describe('getMyCollections', () => {
  it('orders the default collection first, then by created_at', async () => {
    const builder = createQueryBuilder(
      queryResult({ data: [{ id: 'col-1', is_default: true, name: 'Saved' }] })
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await getMyCollections();

    expect(builder.order).toHaveBeenNthCalledWith(1, 'is_default', { ascending: false });
    expect(builder.order).toHaveBeenNthCalledWith(2, 'created_at', { ascending: true });
    expect(result).toEqual([{ id: 'col-1', is_default: true, name: 'Saved' }]);
  });

  it('propagates a Supabase error', async () => {
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'boom' } }))
    );

    await expect(getMyCollections()).rejects.toMatchObject({ message: 'boom' });
  });
});

describe('getSavedPapers', () => {
  it('returns basic info for saved papers, capped at the limit', async () => {
    mockSupabase.from
      .mockReturnValueOnce(createQueryBuilder(queryResult({ data: { id: 'col-1' } })))
      .mockReturnValueOnce(
        createQueryBuilder(queryResult({ data: [{ paper_id: 'p1' }, { paper_id: 'p2' }] }))
      );
    const papersBuilder = createQueryBuilder(
      queryResult({ data: [{ id: 'p1', title: 'Paper One' }] })
    );
    mockSupabase.from.mockReturnValueOnce(papersBuilder);

    const result = await getSavedPapers(1);

    expect(papersBuilder.in).toHaveBeenCalledWith('id', ['p1']);
    expect(result).toEqual([{ id: 'p1', title: 'Paper One' }]);
  });

  it('returns an empty array without querying research_papers when nothing is saved', async () => {
    mockSupabase.from.mockReturnValueOnce(createQueryBuilder(queryResult({ data: null })));

    await expect(getSavedPapers()).resolves.toEqual([]);
    expect(mockSupabase.from).toHaveBeenCalledTimes(1);
  });

  it('propagates a Supabase error loading the paper rows', async () => {
    mockSupabase.from
      .mockReturnValueOnce(createQueryBuilder(queryResult({ data: { id: 'col-1' } })))
      .mockReturnValueOnce(createQueryBuilder(queryResult({ data: [{ paper_id: 'p1' }] })))
      .mockReturnValueOnce(createQueryBuilder(queryResult({ error: { message: 'papers failed' } })));

    await expect(getSavedPapers()).rejects.toMatchObject({ message: 'papers failed' });
  });
});
