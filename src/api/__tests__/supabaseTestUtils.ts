/**
 * Shared fixture for mocking `src/lib/supabase.ts` (frozen — never imported for real in tests).
 *
 * The Supabase JS query builder is chainable and "thenable" (awaiting the chain directly, or
 * calling `.maybeSingle()` / `.single()` first, both resolve the query). This fixture reproduces
 * just enough of that shape for facade unit tests: every chain method returns the same builder
 * instance (so call args can be asserted per method), and the builder resolves to a fixed
 * `{ data, error, count }` result when awaited.
 *
 * Usage pattern per test:
 *   const supabaseMock = createSupabaseClientMock();
 *   jest.mocked(supabase).from.mockImplementation(supabaseMock.from);
 *   ...
 * or, more commonly, replace the whole client — see each facade's test file header.
 */
import { jest } from '@jest/globals';

export interface QueryResult<T = unknown> {
  data: T | null;
  error: { message: string; code?: string } | null;
  count?: number | null;
}

export function queryResult<T>(overrides: Partial<QueryResult<T>> = {}): QueryResult<T> {
  return { data: null, error: null, count: null, ...overrides };
}

export interface MockQueryBuilder {
  select: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  in: jest.Mock;
  is: jest.Mock;
  ilike: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  match: jest.Mock;
  upsert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  insert: jest.Mock;
  or: jest.Mock;
  maybeSingle: jest.Mock;
  single: jest.Mock;
  then: (onFulfilled?: any, onRejected?: any) => Promise<unknown>;
  catch: (onRejected?: any) => Promise<unknown>;
}

const CHAIN_METHODS = [
  'select',
  'eq',
  'neq',
  'in',
  'is',
  'ilike',
  'order',
  'limit',
  'match',
  'upsert',
  'update',
  'delete',
  'insert',
  'or',
] as const;

/** Builds a chainable query-builder mock that resolves to `result` however the chain ends. */
export function createQueryBuilder<T>(result: QueryResult<T>): MockQueryBuilder {
  const builder = {} as MockQueryBuilder;

  CHAIN_METHODS.forEach((method) => {
    (builder as any)[method] = jest.fn(() => builder);
  });

  builder.maybeSingle = jest.fn(() => Promise.resolve(result));
  builder.single = jest.fn(() => Promise.resolve(result));
  builder.then = (onFulfilled?: any, onRejected?: any) =>
    Promise.resolve(result).then(onFulfilled, onRejected);
  builder.catch = (onRejected?: any) => Promise.resolve(result).catch(onRejected);

  return builder;
}

export interface MockSupabaseClient {
  auth: { getUser: jest.Mock<(...args: any[]) => Promise<any>> };
  from: jest.Mock<(...args: any[]) => MockQueryBuilder>;
  rpc: jest.Mock<(...args: any[]) => Promise<any>>;
  storage: { from: jest.Mock<(...args: any[]) => any> };
}

/** A fresh, empty Supabase client mock. Configure `.from`/`.rpc`/`.auth.getUser` per test. */
export function createSupabaseClientMock(): MockSupabaseClient {
  return {
    auth: { getUser: jest.fn() },
    from: jest.fn(() => createQueryBuilder(queryResult())),
    rpc: jest.fn(),
    storage: { from: jest.fn() },
  };
}

export interface FakeAuthUser {
  id: string;
  email: string;
}

export interface FakeProfileRow {
  id: string;
  email: string;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  role: string;
  department?: string | null;
  department_id?: string | null;
  program?: string | null;
  program_id?: string | null;
  created_at?: string | null;
  is_active?: boolean | null;
  suspended_at?: string | null;
}

export function fakeAuthUser(overrides: Partial<FakeAuthUser> = {}): FakeAuthUser {
  return { id: 'auth-user-1', email: 'student@nu-dasma.edu.ph', ...overrides };
}

export function fakeProfileRow(overrides: Partial<FakeProfileRow> = {}): FakeProfileRow {
  return {
    id: 'app-user-1',
    email: 'student@nu-dasma.edu.ph',
    first_name: 'Ada',
    middle_name: null,
    last_name: 'Lovelace',
    role: 'student',
    department: null,
    department_id: null,
    program: null,
    program_id: null,
    created_at: '2026-01-01T00:00:00.000Z',
    is_active: true,
    suspended_at: null,
    ...overrides,
  };
}

/**
 * Queues the auth.getUser() + `.from('users')...maybeSingle()` sequence that every facade's
 * `resolveCurrent*Profile()` helper performs via the real (unmocked) `fetchAppUserProfile`.
 * Call this first, before queuing any of the facade's own `.from()`/`.rpc()` results, since it
 * consumes the first `from` call in the sequence.
 */
export function queueProfileLookup(
  client: MockSupabaseClient,
  opts: { authUser?: Partial<FakeAuthUser>; profileRow?: Partial<FakeProfileRow> | null } = {}
) {
  const authUser = fakeAuthUser(opts.authUser);
  const profileRow = opts.profileRow === null ? null : fakeProfileRow(opts.profileRow ?? {});

  client.auth.getUser.mockResolvedValueOnce({
    data: { user: authUser },
    error: null,
  });

  (client.from as jest.Mock).mockReturnValueOnce(
    createQueryBuilder(queryResult({ data: profileRow, error: null }))
  );

  return { authUser, profileRow };
}
