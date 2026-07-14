-- ============================================================
-- RECORD: Faculty annotation write RPC (#14) — create_faculty_annotation
-- Deployed 2026-07-09 for the mobile faculty note-pin write path.
-- Mobile is anon + RLS only. The existing research_comments INSERT policy
-- ("Users can insert comments") checks user_id = auth.uid(), which never matches
-- public.users.id in this project (the UUID-mismatch trap), so a direct client
-- insert silently fails its with_check. This SECURITY DEFINER RPC is the
-- established fix (same pattern as faculty_approve_paper): re-resolve the faculty
-- identity by auth.email(), confirm the paper is assigned to that faculty member,
-- then insert one non-internal comment row with user_id forced to the resolved id.
--
-- The comment text carries the web's meta-in-text envelope,
--   [[meta]]{json}[[/meta]]\n<note>
-- assembled client-side (see facultyApi.createAnnotation). is_internal = false so
-- the row is visible to the read path (facultyApi.getAnnotations) and the web
-- annotation viewer. Additive and reversible:
--   DROP FUNCTION public.create_faculty_annotation(uuid, text);
-- This file is a snapshot of the deployed definition, not a migration script.
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_faculty_annotation(
  p_paper_id uuid,
  p_comment text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_faculty_id uuid;
  v_new_id uuid;
BEGIN
  IF btrim(coalesce(p_comment, '')) = '' THEN
    RAISE EXCEPTION 'Annotation text is required';
  END IF;
  IF length(p_comment) > 8000 THEN
    RAISE EXCEPTION 'Annotation is too long';
  END IF;

  SELECT u.id INTO v_faculty_id
  FROM public.users u
  WHERE u.email = auth.email() AND u.role::text = 'faculty';
  IF v_faculty_id IS NULL THEN
    RAISE EXCEPTION 'Unable to resolve faculty identity';
  END IF;

  -- Least privilege: only a paper assigned to this faculty member is annotatable.
  IF NOT EXISTS (
    SELECT 1 FROM public.research_papers rp
    WHERE rp.id = p_paper_id AND rp.faculty_id = v_faculty_id
  ) THEN
    RAISE EXCEPTION 'Paper not found or not assigned to you';
  END IF;

  INSERT INTO public.research_comments (research_id, user_id, comment, is_internal)
  VALUES (p_paper_id, v_faculty_id, p_comment, false)
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_faculty_annotation(uuid, text) TO anon, authenticated;
