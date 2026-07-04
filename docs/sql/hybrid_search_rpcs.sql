-- ============================================================
-- RECORD: Hybrid Search — ranking RPC (full-text + vector RRF)
-- Introduced by the Hybrid Search undertaking (H-S), Phase 1 — 2026-06-25.
-- search_research_papers blends Postgres full-text (existing research_papers.search_vector)
-- with pgvector similarity (research_paper_embeddings.embedding) via reciprocal rank fusion.
-- Security:
--   * SECURITY DEFINER + pinned search_path = public.
--   * Returns ONLY (paper_id, score) — never content or embeddings.
--   * Candidates hard-gated to the RLS-public set: status in ('approved','published')
--     and deleted_at is null, so it never exceeds RLS.
--   * EXECUTE granted to authenticated only (anon revoked).
--   * Content is re-fetched downstream under the caller's JWT, so RLS stays the
--     single content gate.
-- This file is a snapshot of deployed definitions, not a migration script.
-- ============================================================

-- ----------------------------------------------------------------
-- search_research_papers(query_text, query_embedding, match_count, weights, rrf_k)
-- ----------------------------------------------------------------
create or replace function public.search_research_papers(
  query_text       text,
  query_embedding  vector(384),
  match_count      integer          default 20,
  full_text_weight double precision default 1.0,
  semantic_weight  double precision default 1.0,
  rrf_k            integer          default 50
)
returns table (paper_id uuid, score double precision)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select least(greatest(coalesce(match_count, 20), 1), 50) as n
  ),
  fts as (
    select rp.id,
           row_number() over (
             order by ts_rank_cd(rp.search_vector,
                                 websearch_to_tsquery('english', query_text)) desc
           ) as rank_ix
    from public.research_papers rp
    where rp.status::text = any (array['approved','published'])
      and rp.deleted_at is null
      and query_text is not null
      and length(btrim(query_text)) > 0
      and rp.search_vector @@ websearch_to_tsquery('english', query_text)
    order by rank_ix
    limit (select n * 4 from bounds)
  ),
  semantic as (
    select rpe.paper_id as id,
           row_number() over (order by rpe.embedding <=> query_embedding) as rank_ix
    from public.research_paper_embeddings rpe
    join public.research_papers rp on rp.id = rpe.paper_id
    where rp.status::text = any (array['approved','published'])
      and rp.deleted_at is null
      and query_embedding is not null
    order by rank_ix
    limit (select n * 4 from bounds)
  )
  select
    coalesce(fts.id, semantic.id) as paper_id,
    full_text_weight * coalesce(1.0 / (rrf_k + fts.rank_ix), 0.0)
      + semantic_weight * coalesce(1.0 / (rrf_k + semantic.rank_ix), 0.0) as score
  from fts
  full outer join semantic on fts.id = semantic.id
  order by score desc
  limit (select n from bounds);
$$;

revoke all on function public.search_research_papers(text, vector, integer, double precision, double precision, integer) from public, anon;
grant execute on function public.search_research_papers(text, vector, integer, double precision, double precision, integer) to authenticated;
