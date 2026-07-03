-- ============================================================
-- RECORD: co_author_invitations RLS policies
-- Deployed to allow invitees to read and respond to their own invitations, and to allow students to create invitations for papers they authored.
-- Required for mobile anon+RLS co-author invitation flow.
-- This file is a snapshot of deployed definitions, not a migration script.
-- ============================================================

CREATE POLICY "Students can insert co_author_invitations for own papers"
ON public.co_author_invitations
FOR INSERT
WITH CHECK (
  inviter_id = (
    SELECT u.id FROM public.users u
    WHERE u.email = auth.email()
  )
  AND research_id IN (
    SELECT id FROM public.research_papers
    WHERE author_id = (
      SELECT u.id FROM public.users u
      WHERE u.email = auth.email()
    )
  )
);