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
-- Resolves inviter from auth.email(). Validates paper ownership by title lookup.
-- Per-invitee: student check, existing co-author check, pending invite check.
-- Generates 64-char hex token (two concatenated gen_random_uuid() calls, hyphens removed).
-- Inserts invitation row. Inserts invitee notification with paper title (best-effort).
-- Returns TABLE(invitee_id uuid, result text) with values:
--   CREATED, SKIPPED_SELF, SKIPPED_NOT_STUDENT, SKIPPED_ALREADY_COAUTHOR, SKIPPED_ALREADY_PENDING
--
-- Fix history:
--   Initial deployment had unqualified `invitee_id` in EXISTS check on co_author_invitations.
--   Because RETURNS TABLE(invitee_id uuid, ...) creates a PL/pgSQL output variable also named
--   `invitee_id`, PostgreSQL raised 42702 (ambiguous column reference) on every call —
--   silently caught by mobile, causing zero invitations to ever be created.
--   Fixed by adding `cai.` table alias to the EXISTS predicate.
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
  v_invitee_id uuid;
  v_paper_title text;
  v_invitee_email text;
  v_token text;
  v_expires_at timestamptz;
BEGIN
  -- Resolve inviter from auth.email()
  SELECT u.id INTO v_inviter_id
  FROM public.users u
  WHERE u.email = auth.email();

  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Unable to resolve inviter identity';
  END IF;

  -- Verify inviter owns the paper
  SELECT rp.title INTO v_paper_title
  FROM public.research_papers rp
  WHERE rp.id = p_research_id AND rp.author_id = v_inviter_id;

  IF v_paper_title IS NULL THEN
    RAISE EXCEPTION 'Access denied: not paper author';
  END IF;

  v_expires_at := NOW() + INTERVAL '7 days';

  FOREACH v_invitee_id IN ARRAY p_invitee_ids
  LOOP
    -- Skip self-invitation
    IF v_invitee_id = v_inviter_id THEN
      RETURN QUERY SELECT v_invitee_id, 'SKIPPED_SELF'::text;
      CONTINUE;
    END IF;

    -- Check invitee exists and is a student
    SELECT u.email INTO v_invitee_email
    FROM public.users u
    WHERE u.id = v_invitee_id AND u.role::text = 'student';

    IF v_invitee_email IS NULL THEN
      RETURN QUERY SELECT v_invitee_id, 'SKIPPED_NOT_STUDENT'::text;
      CONTINUE;
    END IF;

    -- Skip if already a co-author
    IF EXISTS (
      SELECT 1 FROM public.research_authors ra
      WHERE ra.research_id = p_research_id AND ra.user_id = v_invitee_id
    ) THEN
      RETURN QUERY SELECT v_invitee_id, 'SKIPPED_ALREADY_COAUTHOR'::text;
      CONTINUE;
    END IF;

    -- Skip if pending invitation already exists
    IF EXISTS (
      SELECT 1 FROM public.co_author_invitations cai
      WHERE cai.research_id = p_research_id
        AND cai.invitee_id = v_invitee_id
        AND cai.status = 'pending'
    ) THEN
      RETURN QUERY SELECT v_invitee_id, 'SKIPPED_ALREADY_PENDING'::text;
      CONTINUE;
    END IF;

    -- Generate 64-char hex token (two concatenated gen_random_uuid() calls, hyphens removed)
    v_token := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');

    -- Insert invitation
    INSERT INTO public.co_author_invitations (
      research_id,
      inviter_id,
      invitee_id,
      invitee_email,
      token,
      status,
      expires_at
    ) VALUES (
      p_research_id,
      v_inviter_id,
      v_invitee_id,
      v_invitee_email,
      v_token,
      'pending',
      v_expires_at
    );

    -- Insert notification for invitee (best-effort — never blocks invitation creation)
    BEGIN
      INSERT INTO public.notifications (
        user_id,
        research_id,
        type,
        title,
        message
      ) VALUES (
        v_invitee_id,
        p_research_id,
        'coauthor_invite',
        'Co-author Invitation',
        format(
          'You were invited to co-author "%s". Open your invitations to accept or decline.',
          v_paper_title
        )
      );
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    RETURN QUERY SELECT v_invitee_id, 'CREATED'::text;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_co_author_invitations(uuid, uuid[]) TO anon, authenticated;
