-- ============================================================
-- RECORD: get_faculty_members and search_students RPCs
-- Deployed for mobile anon+RLS directory access (submit research)
-- Created with exact column types matching public.users schema
-- This file is a snapshot of deployed definitions, not a migration script.
-- ============================================================

-- RPC: get_faculty_members (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.get_faculty_members(
  p_department text,
  p_department_id uuid
)
RETURNS TABLE (
  id uuid,
  email character varying,
  first_name character varying,
  middle_name character varying,
  last_name character varying,
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
    u.department,
    u.department_id
  FROM public.users u
  WHERE u.role::text = 'faculty'
    AND (
      (p_department_id IS NOT NULL AND u.department_id = p_department_id)
      OR (
        p_department_id IS NULL
        AND (
          p_department IS NULL
          OR length(trim(p_department)) = 0
          OR lower(trim(u.department)) = lower(trim(p_department))
        )
      )
    )
  ORDER BY u.last_name NULLS LAST, u.first_name NULLS LAST;
$$;

GRANT EXECUTE ON FUNCTION public.get_faculty_members(text, uuid) TO anon, authenticated;

-- RPC: search_students (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.search_students(p_query text)
RETURNS TABLE (
  id uuid,
  email character varying,
  first_name character varying,
  middle_name character varying,
  last_name character varying,
  program text
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
    u.program
  FROM public.users u
  WHERE u.role::text = 'student'
    AND trim(coalesce(p_query, '')) <> ''
    AND length(trim(p_query)) >= 2
    AND (
      u.email ILIKE '%' || trim(p_query) || '%'
      OR u.first_name ILIKE '%' || trim(p_query) || '%'
      OR u.last_name ILIKE '%' || trim(p_query) || '%'
      OR coalesce(u.middle_name, '') ILIKE '%' || trim(p_query) || '%'
    )
  ORDER BY u.last_name NULLS LAST, u.first_name NULLS LAST
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.search_students(text) TO anon, authenticated;
