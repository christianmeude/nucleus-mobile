-- ============================================================
-- RECORD: research_authors RLS policies
-- Deployed to allow anon+RLS reads and student-owned writes
-- Required for PAPER_SELECT structured_authors join and research_authors upsert on submit and invitation accept
-- This file is a snapshot of deployed definitions, not a migration script.
-- ============================================================

-- SELECT: open read for anon (research_authors contains no sensitive data)
CREATE POLICY "anon can read research_authors"
ON public.research_authors
FOR SELECT
USING (true);

-- INSERT: student may insert co-author rows for papers they own
CREATE POLICY "Students can insert research_authors for own papers"
ON public.research_authors
FOR INSERT
WITH CHECK (
  research_id IN (
    SELECT id FROM public.research_papers
    WHERE author_id = (
      SELECT u.id FROM public.users u
      WHERE u.email = auth.email()
    )
  )
);

-- UPDATE: student may update co-author rows for papers they own (required for upsert)
CREATE POLICY "Students can update research_authors for own papers"
ON public.research_authors
FOR UPDATE
USING (
  research_id IN (
    SELECT id FROM public.research_papers
    WHERE author_id = (
      SELECT u.id FROM public.users u
      WHERE u.email = auth.email()
    )
  )
);

-- INSERT: invitee may insert their own research_authors row on invitation accept
-- Scoped to users with a pending or accepted co_author_invitations row for the same research_id.
-- Note: status check includes 'accepted' because respondToInvitation updates status before
-- the research_authors upsert runs, so 'pending' alone would always reject the insert.
CREATE POLICY "Invitees can insert own research_authors row on accept"
ON public.research_authors
FOR INSERT
WITH CHECK (
  user_id = (
    SELECT u.id FROM public.users u
    WHERE u.email = auth.email()
  )
  AND EXISTS (
    SELECT 1 FROM public.co_author_invitations cai
    WHERE cai.research_id = research_id
      AND cai.invitee_id = (
        SELECT u.id FROM public.users u
        WHERE u.email = auth.email()
      )
      AND cai.status IN ('pending', 'accepted')
  )
);