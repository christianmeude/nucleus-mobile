# NUcleus Mobile — Implementation Plan: Hybrid Semantic Search

> **STATUS: ACTIVE** — Setup done (isolated worktree `..\capstone-nucleus-rn-hybrid-search`, branch `feat/hybrid-search` cut from `dev` @ `5fd73df`). Next: **Phase 0** (read-only DB verification, briefed per CLAUDE.md rule 3).
> *Adds meaning-aware discovery to Browse: Postgres full-text search (keyword/acronym precision) fused with `pgvector` semantic similarity (meaning) via reciprocal rank fusion (RRF), built entirely on first-party Supabase. Follows `docs/CONVENTIONS.md`.*

**Canonical product context:** [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)
**Roadmap reference:** [PRODUCT_ROADMAP.md](../PRODUCT_ROADMAP.md)
**Process conventions:** [CONVENTIONS.md](../CONVENTIONS.md)

---

## 1. Constraints (must hold for every phase)

- **Merge-safe alongside siblings.** Branch is cut from `dev`, never from a sibling. `feat/ux-remodel` is actively redesigning [BrowseScreen.tsx](../../src/screens/main/BrowseScreen.tsx) (it has "Browse direction mockups A/B/C" committed) — the one collision file. All logic goes in **new files** (facade method, hook, Edge Functions, SQL snapshots); `BrowseScreen.tsx` is touched **last and minimally** so the diff re-applies cleanly over whichever Browse redesign lands.
- **Non-breaking for the shared DB.** Web reads/writes the same Postgres. Phase 1 SQL is **additive only** — no `ALTER`/`DROP`/`REPLACE`/re-grant of any existing object (web's `match_paper_content`, existing views, triggers, RLS). Indexes are built `CREATE INDEX CONCURRENTLY` so live web writes are never locked.
- **Anon key + RLS only on mobile.** No service role. Embedding generation and query embedding run **server-side** (Edge Function / `SECURITY DEFINER` RPC). The search RPC follows the project's `SECURITY DEFINER` + published-status-filter pattern and `GRANT EXECUTE TO anon, authenticated`.
- **Supabase changes are briefed first.** Per CLAUDE.md rule 3 / CONVENTIONS §7: state the query in plain terms, wait for Christian's approval, Christian deploys, then snapshot to `docs/sql/`.
- **tsc gate.** `npx tsc --noEmit` green at every phase exit.
- **AI engine continuity.** Any AI reuses web's **Google Gemini** (`@google/generative-ai`), server-side only (Edge secret, never on mobile). See Phase 5 (gated) and Out of scope.
- **Commits are handled by Christian** (CONVENTIONS §2). Claude stages specific files and drafts messages.

---

## 2. Architecture & data flow

**Embeddings:** Supabase built-in `gte-small` (`Supabase.ai.Session('gte-small')`), **384-dim**, server-side, no API key, no per-call cost.

```
Ingestion (server-side):
  published paper → embed(title+abstract+keywords) → upsert research_paper_embeddings(vector 384)
  keyword side → functional GIN index on to_tsvector(title+abstract+keywords) [no schema change]

Query (mobile = anon key only):
  BrowseScreen (debounced query)
    → researchApi.searchPapers(q)
    → supabase.functions.invoke('search-papers', { q })            [Edge Function]
        → embed(q)                                                 [gte-small, server-side]
        → rpc search_research_papers(q_text, q_embedding, n)       [SECURITY DEFINER]
            → RRF( ts_rank over websearch_to_tsquery , 1 - (embedding <=> q_embedding) )
            → published-status filter inside the function
        → ranked published rows
    → map via existing toResearchPaper() → existing ResearchCard
```

**Web review (firsthand-verified, read-only):** the web repo has **no working hybrid search** — only an orphaned `ALTER FUNCTION public.match_paper_content(...)` in `backend/migrations/harden_rls_views_and_functions.sql:23` with no `CREATE`, no `pgvector`, no vector/tsvector columns, no embedding library (Gemini is for PDF chat only), no Edge Functions, no search API. Nothing to port — mobile builds net-new. The orphaned `ALTER` is a latent deploy-time bug to flag to the web owner (their repo, read-only to us).

---

## 3. Phased plan

### Phase 0 — Live DB verification (briefed, read-only) ⏳ **NOT STARTED**

Resolve greenfield vs. partial foundation against the live shared DB. Brief to Christian; run only after approval. None mutate anything.

- ⏳ `select extname, extversion from pg_extension where extname = 'vector';`
- ⏳ `select proname, pg_get_function_identity_arguments(oid) from pg_proc where proname = 'match_paper_content';` (+ `pg_get_functiondef` if present)
- ⏳ `select table_schema, table_name, column_name, udt_name from information_schema.columns where udt_name = 'vector';`
- ⏳ `select proname from pg_proc where proname ilike '%search%' or proname ilike '%match%';`
- ⏳ MCP `list_edge_functions` (confirm none yet) + `list_extensions` (confirm pgvector availability).

**Exit criteria:** a clear picture of what already exists in the live DB; Phase 1 SQL adjusted accordingly (reuse a real `match_paper_content` only by *calling* it, never modifying).

---

### Phase 1 — DB foundation (briefed SQL; Christian deploys; snapshot) ⏳ **NOT STARTED**

- ⏳ `create extension if not exists vector;`
- ⏳ **Keyword side:** functional GIN index (`CREATE INDEX CONCURRENTLY`) on `to_tsvector('english', coalesce(title,'')||' '||coalesce(abstract,'')||' '||coalesce(array_to_string(keywords,' '),''))` — index only, no schema change to `research_papers`.
- ⏳ **Semantic side:** sidecar `research_paper_embeddings(paper_id uuid pk references research_papers(id) on delete cascade, embedding vector(384), source_hash text, updated_at timestamptz default now())` + `hnsw` index (`CONCURRENTLY`). Own RLS default-deny (reads only via the RPC); cascade FK never blocks web deletes.
- ⏳ **Hybrid RPC** `search_research_papers(query_text text, query_embedding vector(384), match_count int default 20, full_text_weight float default 1, semantic_weight float default 1, rrf_k int default 50)` — `SECURITY DEFINER`, `SET search_path = public`, `GRANT EXECUTE TO anon, authenticated`; RRF-fuse `ts_rank`/`websearch_to_tsquery` with `embedding <=> query_embedding`; published-status filter inside; returns `research_papers` rows.
- ⏳ Snapshots: `docs/sql/hybrid_search_schema.sql`, `docs/sql/hybrid_search_rpcs.sql` (CONVENTIONS §7 header format).
- ⏳ Post-deploy `get_advisors` (security) clean; confirm additive-only (no existing web object altered).

**Exit criteria:** extension + indexes + sidecar + RPC deployed and snapshotted; advisors clean; web unaffected.

---

### Phase 2 — Edge Functions (new infra for this project) ⏳ **NOT STARTED**

Source in repo for record; deploy via MCP `deploy_edge_function` / Supabase CLI (Christian approves the deploy).

- ⏳ `supabase/functions/search-papers/index.ts` — input `{ q, limit?, category? }`; embed `q` with `gte-small`; call `search_research_papers`; return mapped rows. `verify_jwt` on (mobile passes the student session).
- ⏳ `supabase/functions/embed-papers/index.ts` — backfill/refresh: find published papers with missing/stale `source_hash`, embed `title+abstract+keywords`, upsert into `research_paper_embeddings`. Run once for backfill; scheduling (freshness) decided here — see Risks.

**Exit criteria:** `search-papers` returns ranked published results for a query; embeddings backfilled for existing published papers; no client secret required.

---

### Phase 3 — Mobile facade + hook (new files only) ⏳ **NOT STARTED**

- ⏳ `src/api/research.ts` → add `searchPapers(query, opts?)` calling `supabase.functions.invoke('search-papers', { body: { q, limit, category } })`, mapping via existing `toResearchPaper`. Mirror the established `.rpc()`/invoke shape.
- ⏳ `src/hooks/useDebouncedValue.ts` (new) — debounce the query so each keystroke does not invoke the function.

**Exit criteria:** facade returns typed `ResearchPaper[]`; `npx tsc --noEmit` green.

---

### Phase 4 — Browse wiring (merge-safe, done last) ⏳ **NOT STARTED**

- ⏳ `src/screens/main/BrowseScreen.tsx` — non-empty `query` renders debounced server results from `searchPapers`; empty query keeps current "list all" behavior. Preserve the category `Chip` filter, `Skeleton`/`EmptyState`/`InlineNotice` states, and `ResearchCard` rendering exactly. Edit limited to the data-source swap.

**Exit criteria:** end-to-end semantic search works in-app (synonym test); empty query restores full list; category filter still narrows; debounce prevents per-keystroke invokes; `npx tsc --noEmit` green; diff vs `dev` is new files + a tiny `BrowseScreen` change.

---

### Phase 5 — AI search suggestion (final; gated on hybrid search verified) ⏳ **NOT STARTED**

Only after Phases 1-4 work perfectly. Layers AI over the hybrid results — e.g. an AI-generated suggestion/summary synthesizing the top results for the query (exact UX defined when reached). Reuses **web's Gemini engine** (`@google/generative-ai`), **server-side in an Edge Function** (key as Edge secret). Likely extends `search-papers` or adds a sibling `suggest` function sharing the engine. Separable milestone: hybrid search ships and is validated without it.

**Exit criteria:** TBD when reached; must not regress Phases 1-4.

---

## 4. Critical files

| File | Change |
|---|---|
| `docs/sql/hybrid_search_schema.sql` | new snapshot — extension, GIN index, sidecar table, hnsw index |
| `docs/sql/hybrid_search_rpcs.sql` | new snapshot — `search_research_papers` SECURITY DEFINER |
| `supabase/functions/search-papers/index.ts` | new — query embedding + RPC call |
| `supabase/functions/embed-papers/index.ts` | new — embedding backfill/refresh |
| `src/api/research.ts` | add `searchPapers` (reuse `toResearchPaper`, `PUBLISHED_STATUSES`) |
| `src/hooks/useDebouncedValue.ts` | new debounce hook |
| `src/screens/main/BrowseScreen.tsx` | minimal data-source swap (merge hotspot — last) |
| `docs/plans/HYBRID_SEARCH.md`, `CLAUDE.md` | this plan + registry row (done in Setup) |

## 5. Reuse (don't reinvent)

- `toResearchPaper`, `PAPER_SELECT`, `PUBLISHED_STATUSES`, `filterPublishedRows` in [research.ts](../../src/api/research.ts).
- RPC convention (`p_`-prefixed args, `{ data, error }`) — `search_students`, `increment_view_count`, `get_faculty_members`.
- `SECURITY DEFINER` + published-status filtering pattern (CLAUDE.md "Critical Architecture").
- `getPrimaryAuthorName`, `paperDate` ([format.ts](../../src/utils/format.ts)); UI primitives `Chip`/`EmptyState`/`Skeleton`/`InlineNotice` already used in Browse.

## 6. Verification (end-to-end)

- **Phase 0:** read-only SELECTs return a clear greenfield/partial picture.
- **Phase 1:** `SELECT count(*) FROM research_paper_embeddings;`; call the RPC with a sample embedding → ranked rows; `EXPLAIN` shows GIN + hnsw usage; `get_advisors` clean.
- **Phase 2:** invoke `search-papers` with a query → ranked published results, no secret needed.
- **Phase 3-4:** `npx tsc --noEmit` green; in-app synonym test (e.g. "crops" → an "agriculture" paper substring search misses); empty query restores list; category filter narrows; debounce holds.
- **Merge-safety:** `git diff --stat dev...feat/hybrid-search` shows only new files + a tiny `BrowseScreen` diff; `git diff dev...feat/ux-remodel -- src/screens/main/BrowseScreen.tsx` reviewed for clean re-apply.

## 7. Risks & coordination

- **New Edge Function infra** — first one for this project; modest setup + a deploy Christian approves.
- **Embedding freshness ownership** — mobile (anon) can't run service-role ingestion. One-time backfill is simple; ongoing freshness needs a scheduled Edge Function (cron) or a web/backend hook. Decided in Phase 2.
- **ux-remodel Browse collision** — mitigated by facade/hook isolation and doing `BrowseScreen` last.
- **Shared DB** — foundation also benefits web; deploy only what mobile needs, snapshot it, flag rather than assume web's intent.

## 8. Out of scope / deferrals (file GitHub issues per CONVENTIONS §4)

- **"Ask this paper"** per-paper RAG chat — a planned **separate undertaking** (Christian, later session). Reuses the same Gemini engine; Phase 5's Edge wiring should expose that engine cleanly for it to build on.
- Web repo's orphaned `match_paper_content` `ALTER` (deploy-time bug) — their repo, read-only; flag to the web owner.
- Scheduled embedding-refresh automation, if Phase 2 ships backfill-only initially.
