-- ============================================================
-- RECORD: Hybrid Search — embedding store (table + ANN index + RLS lock-down)
-- Introduced by the Hybrid Search undertaking (H-S), Phase 1 — 2026-06-25.
-- Stores one whole-paper embedding per paper for semantic discovery search.
-- Embeddings come from Supabase built-in gte-small (384 dims).
-- Locked down: RLS enabled with NO policies (deny-all) and all grants revoked
-- from anon/authenticated, so embeddings are never client-readable; only the
-- SECURITY DEFINER function search_research_papers (see hybrid_search_rpcs.sql)
-- reads them.
-- This file is a snapshot of deployed definitions, not a migration script.
-- ============================================================

-- ----------------------------------------------------------------
-- research_paper_embeddings — whole-paper vectors (gte-small, 384-dim)
-- ----------------------------------------------------------------
create table if not exists public.research_paper_embeddings (
  paper_id    uuid primary key
                references public.research_papers(id) on delete cascade,
  embedding   vector(384) not null,
  source_hash text        not null,   -- hash of title|abstract|keywords; staleness check
  updated_at  timestamptz not null default now()
);

alter table public.research_paper_embeddings enable row level security;
revoke all on table public.research_paper_embeddings from anon, authenticated;

create index if not exists idx_research_paper_embeddings_hnsw
  on public.research_paper_embeddings
  using hnsw (embedding vector_cosine_ops);
