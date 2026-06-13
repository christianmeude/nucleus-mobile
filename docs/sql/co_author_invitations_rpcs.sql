-- ============================================================
-- RECORD: create_co_author_invitations RPC
-- Deployed to handle co-author invitation creation from mobile under anon+RLS
-- Direct INSERT into co_author_invitations was blocked by 42P17 recursion
-- (co_author_invitations INSERT policy referenced research_papers which
-- referenced co_author_invitations). SECURITY DEFINER bypasses RLS entirely.
-- Email-resolved inviter_id matches public.users to auth.email() (project convention).
-- This file is a snapshot of deployed definitions, not a migration script.
-- ============================================================

-- ----------------------------------------------------------------
-- create_co_author_invitations — post-submit invitation creation
-- ----------------------------------------------------------------
-- Resolves inviter from auth.email(). Validates paper ownership.
-- Per-invitee: student check, existing co-author check, pending invite check.
-- Generates 64-char hex token (two concatenated gen_random_uuid() calls, hyphens removed).
-- Inserts invitation row (including invitee_email). Inserts invitee notification (best-effort).
-- Returns TABLE(invitee_id uuid, result text) with values:
--   CREATED, SKIPPED_SELF, SKIPPED_NOT_STUDENT, SKIPPED_ALREADY_COAUTHOR, SKIPPED_ALREADY_PENDING
CREATE OR REPLACE FUNCTION public.create_co_author_invitations(
  p_research_id uuid,
  p_invitee_ids uuid[]
)
RETURNS TABLE (invitee_id uuid, result text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_id uuid;
  v_inviter_email text;
  v_paper_owner_id uuid;
  v_invitee_id uuid;
  v_invitee record;
  v_token text;
  v_expires_at timestamptz;
BEGIN
  -- Resolve inviter from auth.email()
  SELECT u.id, u.email::text
  INTO v_inviter_id, v_inviter_email
  FROM public.users u
  WHERE u.email::text = auth.email()
  LIMIT 1;

  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Inviter not found';
  END IF;

  -- Validate paper ownership
  SELECT rp.author_id
  INTO v_paper_owner_id
  FROM public.research_papers rp
  WHERE rp.id = p_research_id
  LIMIT 1;

  IF v_paper_owner_id IS NULL OR v_paper_owner_id <> v_inviter_id THEN
    RAISE EXCEPTION 'Paper not found or not owned by inviter';
  END IF;

  v_expires_at := now() + interval '7 days';

  FOREACH v_invitee_id IN ARRAY p_invitee_ids
  LOOP
    -- Skip self
    IF v_invitee_id = v_inviter_id THEN
      RETURN QUERY SELECT v_invitee_id, 'SKIPPED_SELF'::text;
      CONTINUE;
    END IF;

    -- Load invitee record
    SELECT u.id, u.email::text, u.role::text,
           u.first_name::text, u.last_name::text
    INTO v_invitee
    FROM public.users u
    WHERE u.id = v_invitee_id
    LIMIT 1;

    -- Skip non-students
    IF v_invitee.role IS NULL OR v_invitee.role <> 'student' THEN
      RETURN QUERY SELECT v_invitee_id, 'SKIPPED_NOT_STUDENT'::text;
      CONTINUE;
    END IF;

    -- Skip existing co-authors
    IF EXISTS (
      SELECT 1 FROM public.research_authors ra
      WHERE ra.research_id = p_research_id
        AND ra.user_id = v_invitee_id
    ) THEN
      RETURN QUERY SELECT v_invitee_id, 'SKIPPED_ALREADY_COAUTHOR'::text;
      CONTINUE;
    END IF;

    -- Skip existing pending invitations
    IF EXISTS (
      SELECT 1 FROM public.co_author_invitations cai
      WHERE cai.research_id = p_research_id
        AND cai.invitee_id = v_invitee_id
        AND cai.status = 'pending'
    ) THEN
      RETURN QUERY SELECT v_invitee_id, 'SKIPPED_ALREADY_PENDING'::text;
      CONTINUE;
    END IF;

    -- Generate 64-char hex token
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

    -- Insert invitation
    INSERT INTO public.co_author_invitations (
      research_id,
      inviter_id,
      invitee_id,
      invitee_email,
      status,
      token,
      expires_at
    ) VALUES (
      p_research_id,
      v_inviter_id,
      v_invitee_id,
      v_invitee.email,
      'pending',
      v_token,
      v_expires_at
    );

    -- Insert invitee notification (best-effort — never blocks invitation creation)
    BEGIN
      INSERT INTO public.notifications (
        user_id,
        type,
        title,
        body
      ) VALUES (
        v_invitee_id,
        'coauthor_invite',
        'Co-author Invitation',
        'You have been invited to co-author a research paper.'
      );
    EXCEPTION WHEN OTHERS THEN
      -- Swallow notification failures
    END;

    RETURN QUERY SELECT v_invitee_id, 'CREATED'::text;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_co_author_invitations(uuid, uuid[]) TO anon, authenticated;
