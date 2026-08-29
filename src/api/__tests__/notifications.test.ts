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
import { notificationsApi } from '../notifications';
import {
  createQueryBuilder,
  MockSupabaseClient,
  queryResult,
  queueProfileLookup,
} from './supabaseTestUtils';

const mockSupabase = supabase as unknown as MockSupabaseClient;

function notificationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n1',
    user_id: 'student-1',
    is_read: false,
    created_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.resetAllMocks();
  mockSupabase.from.mockImplementation(() => createQueryBuilder(queryResult()));
});

describe('notificationsApi.getNotifications', () => {
  it('loads the caller notifications, newest first, with the default limit', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const builder = createQueryBuilder(
      queryResult({ data: [notificationRow({ id: 'n1' }), notificationRow({ id: 'n2' })] }),
    );
    mockSupabase.from.mockReturnValueOnce(builder);

    const result = await notificationsApi.getNotifications();

    expect(builder.eq).toHaveBeenCalledWith('user_id', 'student-1');
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(builder.limit).toHaveBeenCalledWith(100);
    expect(result.map((n) => n.id)).toEqual(['n1', 'n2']);
  });

  it('passes through a custom limit', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const builder = createQueryBuilder(queryResult({ data: [] }));
    mockSupabase.from.mockReturnValueOnce(builder);

    await notificationsApi.getNotifications(10);

    expect(builder.limit).toHaveBeenCalledWith(10);
  });

  it('propagates a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'load failed' } })),
    );

    await expect(notificationsApi.getNotifications()).rejects.toThrow('load failed');
  });
});

describe('notificationsApi.getUnreadCount', () => {
  it('returns the unread count for the caller', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const builder = createQueryBuilder(queryResult({ count: 3 }));
    mockSupabase.from.mockReturnValueOnce(builder);

    await expect(notificationsApi.getUnreadCount()).resolves.toBe(3);
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'user_id', 'student-1');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'is_read', false);
  });

  it('defaults to 0 when count is null', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(createQueryBuilder(queryResult({ count: null })));

    await expect(notificationsApi.getUnreadCount()).resolves.toBe(0);
  });

  it('propagates a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'count failed' } })),
    );

    await expect(notificationsApi.getUnreadCount()).rejects.toThrow('count failed');
  });
});

describe('notificationsApi.markAsRead', () => {
  it('marks a single notification read, scoped to the caller', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const builder = createQueryBuilder(queryResult());
    mockSupabase.from.mockReturnValueOnce(builder);

    await notificationsApi.markAsRead('n1');

    expect(builder.update).toHaveBeenCalledWith({ is_read: true });
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'id', 'n1');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'user_id', 'student-1');
  });

  it('propagates a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'update failed' } })),
    );

    await expect(notificationsApi.markAsRead('n1')).rejects.toThrow('update failed');
  });
});

describe('notificationsApi.markAllAsRead', () => {
  it('marks every unread notification for the caller as read', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    const builder = createQueryBuilder(queryResult());
    mockSupabase.from.mockReturnValueOnce(builder);

    await notificationsApi.markAllAsRead();

    expect(builder.update).toHaveBeenCalledWith({ is_read: true });
    expect(builder.eq).toHaveBeenNthCalledWith(1, 'user_id', 'student-1');
    expect(builder.eq).toHaveBeenNthCalledWith(2, 'is_read', false);
  });

  it('propagates a Supabase error', async () => {
    queueProfileLookup(mockSupabase, { profileRow: { id: 'student-1' } });
    mockSupabase.from.mockReturnValueOnce(
      createQueryBuilder(queryResult({ error: { message: 'update failed' } })),
    );

    await expect(notificationsApi.markAllAsRead()).rejects.toThrow('update failed');
  });
});
