-- ============================================================
-- users RLS Policies (current canonical state)
-- Last updated: 2026-06-15
-- ============================================================

-- Policy 1: Self-read by email (pre-existing)
-- Allows any session to read their own public.users row.
CREATE POLICY "Allow users to read own profile by email"
  ON public.users
  FOR SELECT
  TO public
  USING (auth.email() = (email)::text);

-- Policy 2: Open read for authenticated users
-- Allows any authenticated session to read all public.users rows.
-- Required so that PAPER_SELECT structured_authors join resolves
-- co-author names across user boundaries (Issue #7 fix).
CREATE POLICY "Allow authenticated users to read all profiles"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (true);
