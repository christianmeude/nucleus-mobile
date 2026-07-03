-- ============================================================
-- RECORD: Faculty review action RPCs (approve, request_revision, reject) + approver directory
-- Deployed for mobile faculty decision actions (Faculty Access v2).
-- Mobile is anon + RLS only; the web app runs these transitions server-side under the
-- service role. Each write RPC is SECURITY DEFINER and re-validates the caller server-side:
-- faculty identity via auth.email(), paper ownership via faculty_id, and the gate
-- status = 'pending_faculty'. No new RLS policies are required — SECURITY DEFINER bypasses
-- RLS for the writes, the same pattern as create_co_author_invitations.
-- Email-resolved caller_id matches public.users to auth.email() (project convention).
-- This file is a snapshot of deployed definitions, not a migration script.
-- ============================================================

-- ----------------------------------------------------------------
-- get_dean_chair_members — directory for the faculty Approve picker
-- ----------------------------------------------------------------
-- Returns all ACTIVE dean + program_chair users (global; no department filter — matches
-- web's getDeanChairMembers, with the added is_active = true guard so suspended reviewers
-- are not forwardable). Faculty picks one target to forward an approved paper to; the
-- target's role decides pending_dean vs pending_program_chair.
CREATE OR REPLACE FUNCTION public.get_dean_chair_members()
RETURNS TABLE (
  id uuid,
  email character varying,
  first_name character varying,
  middle_name character varying,
  last_name character varying,
  role character varying,
  department character varying,
  department_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.email,
    u.first_name,
    u.middle_name,
    u.last_name,
    u.role,
    u.department,
    u.department_id
  FROM public.users u
  WHERE u.role::text IN ('dean', 'program_chair')
    AND u.is_active = true
  ORDER BY u.role, u.last_name NULLS LAST, u.first_name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_dean_chair_members() TO anon, authenticated;

-- ----------------------------------------------------------------
-- faculty_notify_paper_parties — internal notification fan-out (author + co-authors)
-- ----------------------------------------------------------------
-- Best-effort: a failed notification never blocks the review action. NOT callable by
-- anon/authenticated — the default PUBLIC EXECUTE grant is revoked below. Only the
-- SECURITY DEFINER review RPCs invoke it (as the function owner). Co-authors come from
-- research_authors, excluding the primary author to avoid a double ping.
CREATE OR REPLACE FUNCTION public.faculty_notify_paper_parties(
  p_research_id uuid,
  p_author_id uuid,
  p_type character varying,
  p_author_title character varying,
  p_author_message text,
  p_coauthor_title character varying,
  p_coauthor_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Primary author
  BEGIN
    INSERT INTO public.notifications (user_id, research_id, type, title, message)
    VALUES (p_author_id, p_research_id, p_type, p_author_title, p_author_message);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Co-authors (research_authors), excluding the primary author
  BEGIN
    INSERT INTO public.notifications (user_id, research_id, type, title, message)
    SELECT ra.user_id, p_research_id, p_type, p_coauthor_title, p_coauthor_message
    FROM public.research_authors ra
    WHERE ra.research_id = p_research_id
      AND ra.user_id <> p_author_id;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END;
$$;

-- Keep the helper internal: drop the default PUBLIC EXECUTE grant.
REVOKE ALL ON FUNCTION public.faculty_notify_paper_parties(uuid, uuid, character varying, character varying, text, character varying, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.faculty_notify_paper_parties(uuid, uuid, character varying, character varying, text, character varying, text) FROM anon, authenticated;

-- ----------------------------------------------------------------
-- faculty_approve_paper — pending_faculty -> pending_dean / pending_program_chair
-- ----------------------------------------------------------------
-- Sets dean_chair_id to the chosen target; records an 'approve' workflow event
-- (workflow.status = 'approved', constrained set); notifies author + co-authors + the
-- chosen next reviewer. Returns the new paper status.
CREATE OR REPLACE FUNCTION public.faculty_approve_paper(
  p_paper_id uuid,
  p_target_user_id uuid,
  p_target_role text,
  p_comments text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_faculty_id uuid;
  v_author_id uuid;
  v_title text;
  v_new_status text;
BEGIN
  SELECT u.id INTO v_faculty_id
  FROM public.users u
  WHERE u.email = auth.email() AND u.role::text = 'faculty';
  IF v_faculty_id IS NULL THEN
    RAISE EXCEPTION 'Unable to resolve faculty identity';
  END IF;

  IF p_target_role NOT IN ('dean', 'program_chair') THEN
    RAISE EXCEPTION 'Invalid target role: must be dean or program_chair';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = p_target_user_id AND u.role::text = p_target_role
  ) THEN
    RAISE EXCEPTION 'Target reviewer not found or role mismatch';
  END IF;

  SELECT rp.author_id, rp.title INTO v_author_id, v_title
  FROM public.research_papers rp
  WHERE rp.id = p_paper_id
    AND rp.faculty_id = v_faculty_id
    AND rp.status::text = 'pending_faculty';
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Paper not found, not assigned to you, or not awaiting your review';
  END IF;

  v_new_status := CASE p_target_role WHEN 'dean' THEN 'pending_dean' ELSE 'pending_program_chair' END;

  UPDATE public.research_papers
  SET status = v_new_status,
      dean_chair_id = p_target_user_id,
      updated_at = now()
  WHERE id = p_paper_id;

  INSERT INTO public.approval_workflow (
    research_id, reviewer_id, reviewer_role, status, action_type,
    comments, previous_status, new_status
  ) VALUES (
    p_paper_id, v_faculty_id, 'faculty', 'approved', 'approve',
    NULLIF(btrim(coalesce(p_comments, '')), ''), 'pending_faculty', v_new_status
  );

  PERFORM public.faculty_notify_paper_parties(
    p_paper_id, v_author_id, 'approval',
    'Research Approved',
    format('Your research "%s" has been approved by your adviser and is now pending Dean/Program Chair review.', v_title),
    'Co-authored Paper Advanced',
    format('The paper "%s" you co-authored has been approved by the adviser and advanced for review.', v_title)
  );

  -- Notify the chosen next reviewer (best-effort)
  BEGIN
    INSERT INTO public.notifications (user_id, research_id, type, title, message)
    VALUES (p_target_user_id, p_paper_id, 'review_request',
            'New Research for Review',
            format('Research "%s" is ready for your review.', v_title));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN v_new_status;
END;
$$;

GRANT EXECUTE ON FUNCTION public.faculty_approve_paper(uuid, uuid, text, text) TO anon, authenticated;

-- ----------------------------------------------------------------
-- faculty_request_revision — pending_faculty -> revision_required
-- ----------------------------------------------------------------
-- Sets revision_notes, last_reviewer_role = 'faculty', previous_status = 'pending_faculty';
-- records a 'request_revision' workflow event (workflow.status = 'revision_required');
-- notifies author + co-authors. Returns the new paper status.
CREATE OR REPLACE FUNCTION public.faculty_request_revision(
  p_paper_id uuid,
  p_notes text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_faculty_id uuid;
  v_author_id uuid;
  v_title text;
BEGIN
  IF btrim(coalesce(p_notes, '')) = '' THEN
    RAISE EXCEPTION 'Revision notes are required';
  END IF;

  SELECT u.id INTO v_faculty_id
  FROM public.users u
  WHERE u.email = auth.email() AND u.role::text = 'faculty';
  IF v_faculty_id IS NULL THEN
    RAISE EXCEPTION 'Unable to resolve faculty identity';
  END IF;

  SELECT rp.author_id, rp.title INTO v_author_id, v_title
  FROM public.research_papers rp
  WHERE rp.id = p_paper_id
    AND rp.faculty_id = v_faculty_id
    AND rp.status::text = 'pending_faculty';
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Paper not found, not assigned to you, or not awaiting your review';
  END IF;

  UPDATE public.research_papers
  SET status = 'revision_required',
      revision_notes = p_notes,
      last_reviewer_role = 'faculty',
      previous_status = 'pending_faculty',
      updated_at = now()
  WHERE id = p_paper_id;

  INSERT INTO public.approval_workflow (
    research_id, reviewer_id, reviewer_role, status, action_type,
    comments, previous_status, new_status
  ) VALUES (
    p_paper_id, v_faculty_id, 'faculty', 'revision_required', 'request_revision',
    p_notes, 'pending_faculty', 'revision_required'
  );

  PERFORM public.faculty_notify_paper_parties(
    p_paper_id, v_author_id, 'revision_required',
    'Revision Required',
    format('Your adviser has requested revisions on "%s". Notes: %s', v_title, p_notes),
    'Revision Requested for Co-authored Paper',
    format('Revision has been requested for the paper "%s" you co-authored. Please check the feedback.', v_title)
  );

  RETURN 'revision_required';
END;
$$;

GRANT EXECUTE ON FUNCTION public.faculty_request_revision(uuid, text) TO anon, authenticated;

-- ----------------------------------------------------------------
-- faculty_reject_paper — pending_faculty -> rejected
-- ----------------------------------------------------------------
-- Sets rejection_reason; records a 'reject' workflow event (workflow.status = 'rejected');
-- notifies author + co-authors. Returns the new paper status.
CREATE OR REPLACE FUNCTION public.faculty_reject_paper(
  p_paper_id uuid,
  p_reason text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_faculty_id uuid;
  v_author_id uuid;
  v_title text;
BEGIN
  IF btrim(coalesce(p_reason, '')) = '' THEN
    RAISE EXCEPTION 'Rejection reason is required';
  END IF;

  SELECT u.id INTO v_faculty_id
  FROM public.users u
  WHERE u.email = auth.email() AND u.role::text = 'faculty';
  IF v_faculty_id IS NULL THEN
    RAISE EXCEPTION 'Unable to resolve faculty identity';
  END IF;

  SELECT rp.author_id, rp.title INTO v_author_id, v_title
  FROM public.research_papers rp
  WHERE rp.id = p_paper_id
    AND rp.faculty_id = v_faculty_id
    AND rp.status::text = 'pending_faculty';
  IF v_author_id IS NULL THEN
    RAISE EXCEPTION 'Paper not found, not assigned to you, or not awaiting your review';
  END IF;

  UPDATE public.research_papers
  SET status = 'rejected',
      rejection_reason = p_reason,
      updated_at = now()
  WHERE id = p_paper_id;

  INSERT INTO public.approval_workflow (
    research_id, reviewer_id, reviewer_role, status, action_type,
    comments, previous_status, new_status
  ) VALUES (
    p_paper_id, v_faculty_id, 'faculty', 'rejected', 'reject',
    p_reason, 'pending_faculty', 'rejected'
  );

  PERFORM public.faculty_notify_paper_parties(
    p_paper_id, v_author_id, 'rejection',
    'Research Rejected',
    format('Your research "%s" was rejected by your adviser. Reason: %s', v_title, p_reason),
    'Co-authored Paper Rejected',
    format('The paper "%s" you co-authored has been rejected. Please check the feedback.', v_title)
  );

  RETURN 'rejected';
END;
$$;

GRANT EXECUTE ON FUNCTION public.faculty_reject_paper(uuid, text) TO anon, authenticated;
