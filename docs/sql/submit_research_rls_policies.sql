-- ============================================================
-- RECORD: submission_drafts RLS + anon read policies (submit research)
-- Deployed for mobile submit flow (drafts, lookups, policy bootstrap)
-- Email-resolved user_id matches public.users to auth.email() (project convention)
-- This file is a snapshot of deployed policies, not a migration script.
-- ============================================================

-- ----------------------------------------------------------------
-- submission_drafts — author-scoped CRUD (four policies)
-- ----------------------------------------------------------------

CREATE POLICY submission_drafts_select_own
ON public.submission_drafts
FOR SELECT
TO anon, authenticated
USING (
  user_id = (
    SELECT u.id
    FROM public.users u
    WHERE u.email::text = auth.email()
    LIMIT 1
  )
);

CREATE POLICY submission_drafts_insert_own
ON public.submission_drafts
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id = (
    SELECT u.id
    FROM public.users u
    WHERE u.email::text = auth.email()
    LIMIT 1
  )
);

CREATE POLICY submission_drafts_update_own
ON public.submission_drafts
FOR UPDATE
TO anon, authenticated
USING (
  user_id = (
    SELECT u.id
    FROM public.users u
    WHERE u.email::text = auth.email()
    LIMIT 1
  )
)
WITH CHECK (
  user_id = (
    SELECT u.id
    FROM public.users u
    WHERE u.email::text = auth.email()
    LIMIT 1
  )
);

CREATE POLICY submission_drafts_delete_own
ON public.submission_drafts
FOR DELETE
TO anon, authenticated
USING (
  user_id = (
    SELECT u.id
    FROM public.users u
    WHERE u.email::text = auth.email()
    LIMIT 1
  )
);

-- ----------------------------------------------------------------
-- research_categories — anon read (submit form category picker)
-- ----------------------------------------------------------------

CREATE POLICY anon_can_read_research_categories
ON public.research_categories
FOR SELECT
TO anon
USING (true);

-- ----------------------------------------------------------------
-- departments — anon read (submit form department picker)
-- ----------------------------------------------------------------

CREATE POLICY anon_can_read_departments
ON public.departments
FOR SELECT
TO anon
USING (true);

-- ----------------------------------------------------------------
-- system_policy_settings — anon read (file size / allowed types bootstrap)
-- ----------------------------------------------------------------

CREATE POLICY "anon can read submission policy"
ON public.system_policy_settings
FOR SELECT
TO anon
USING (true);
