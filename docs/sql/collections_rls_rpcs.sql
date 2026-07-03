-- ============================================================
-- RECORD: collections + collection_papers tables, RLS policies, and toggle_paper_saved RPC
-- Deployed for UX Remodel Phase 4 (save features backend)
-- Email-resolved user_id matches public.users to auth.email() (project convention)
-- Writes are RPC-only; direct INSERT/UPDATE/DELETE blocked by default (no policies for those ops)
-- This file is a snapshot of deployed definitions, not a migration script.
-- ============================================================

-- ----------------------------------------------------------------
-- collections — student-owned named lists of papers
-- ----------------------------------------------------------------

CREATE TABLE public.collections (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  is_default  boolean     NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collections_user_name_unique UNIQUE (user_id, name)
);

-- one default "Saved" collection per user
CREATE UNIQUE INDEX collections_one_default_per_user
  ON public.collections (user_id)
  WHERE is_default = true;

ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- collection_papers — junction: paper membership in a collection
-- ----------------------------------------------------------------

CREATE TABLE public.collection_papers (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid        NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  paper_id      uuid        NOT NULL REFERENCES public.research_papers(id) ON DELETE CASCADE,
  added_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT collection_papers_unique UNIQUE (collection_id, paper_id)
);

ALTER TABLE public.collection_papers ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- collections — SELECT policy (email-resolved, project convention)
-- ----------------------------------------------------------------

CREATE POLICY collections_select_own
ON public.collections
FOR SELECT
TO anon, authenticated
USING (
  user_id = (
    SELECT u.id FROM public.users u
    WHERE u.email::text = auth.email()
    LIMIT 1
  )
);

-- ----------------------------------------------------------------
-- collection_papers — SELECT policy (ownership chain through collections)
-- ----------------------------------------------------------------

CREATE POLICY collection_papers_select_own
ON public.collection_papers
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.collections c
    WHERE c.id = collection_id
      AND c.user_id = (
        SELECT u.id FROM public.users u
        WHERE u.email::text = auth.email()
        LIMIT 1
      )
  )
);

-- ----------------------------------------------------------------
-- toggle_paper_saved — SECURITY DEFINER RPC
-- Finds or creates the caller's default "Saved" collection, then
-- adds or removes the given paper. Returns true = now saved, false = now unsaved.
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.toggle_paper_saved(p_paper_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id        uuid;
  v_collection_id  uuid;
  v_already_saved  boolean;
BEGIN
  SELECT u.id INTO v_user_id
  FROM public.users u
  WHERE u.email::text = auth.email()
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'toggle_paper_saved: user not found for email %', auth.email();
  END IF;

  INSERT INTO public.collections (user_id, name, is_default)
  VALUES (v_user_id, 'Saved', true)
  ON CONFLICT (user_id, name) DO NOTHING;

  SELECT id INTO v_collection_id
  FROM public.collections
  WHERE user_id = v_user_id AND is_default = true
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.collection_papers
    WHERE collection_id = v_collection_id AND paper_id = p_paper_id
  ) INTO v_already_saved;

  IF v_already_saved THEN
    DELETE FROM public.collection_papers
    WHERE collection_id = v_collection_id AND paper_id = p_paper_id;
    RETURN false;
  ELSE
    INSERT INTO public.collection_papers (collection_id, paper_id)
    VALUES (v_collection_id, p_paper_id)
    ON CONFLICT (collection_id, paper_id) DO NOTHING;
    RETURN true;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_paper_saved(uuid) TO anon, authenticated;
