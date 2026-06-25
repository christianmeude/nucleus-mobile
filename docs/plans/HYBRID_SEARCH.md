# NUcleus Mobile — Implementation Plan: Hybrid Semantic Search

> **STATUS: ACTIVE** — Setup + **Phases 0–1 complete** (DB foundation deployed & verified on the live DB, 2026-06-25). Next: **Phase 2** (Edge Functions). Worktree `..\capstone-nucleus-rn-hybrid-search`, branch `feat/hybrid-search` cut from `dev` @ `5fd73df`.
> *Adds meaning-aware discovery to Browse: Postgres full-text search (keyword/acronym precision) fused with `pgvector` semantic similarity (meaning) via reciprocal rank fusion (RRF), built entirely on first-party Supabase. Follows `docs/CONVENTIONS.md`.*

**Canonical product context:** [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)
**Roadmap reference:** [PRODUCT_ROADMAP.md](../PRODUCT_ROADMAP.md)
**Process conventions:** [CONVENTIONS.md](../CONVENTIONS.md)

---

## 1. Constraints (must hold for every phase)

- **Merge-safe alongside siblings.** Branch is cut from `dev`, never from a sibling. `feat/ux-remodel` is actively redesigning [BrowseScreen.tsx](../../src/screens/main/BrowseScreen.tsx) (it has "Browse direction mockups A/B/C" committed) — the one collision file. All logic goes in **new files** (facade method, hook, Edge Functions, SQL snapshots); `BrowseScreen.tsx` is touched **last and minimally** so the diff re-applies cleanly over whichever Browse redesign lands.
- **Non-breaking for the shared DB.** Web reads/writes the same Postgres. Phase 1 SQL is **additive only** — no `ALTER`/`DROP`/`REPLACE`/re-grant of any existing object (web's `match_paper_content`, existing views, triggers, RLS, or the existing `search_vector`/trigger/GIN, which are reused as-is). The only new index is on the new, empty `research_paper_embeddings` table, so no existing table is locked.
- **Anon key + RLS only on mobile.** No service role. Embedding generation and query embedding run **server-side** (Edge Function / `SECURITY DEFINER` RPC).
- **Data security (fully enforced).** The `SECURITY DEFINER` RPC bypasses RLS, so: (a) it returns **only `(paper_id, score)`** — never paper content or embeddings; (b) candidates are restricted to the **RLS-public set `status in ('approved','published')`** (hardcoded — matches what the live RLS exposes; the DEFINER must never exceed RLS); (c) `GRANT EXECUTE` to **`authenticated` only** (revoked from `public`/`anon`). The `research_paper_embeddings` table has **RLS enabled, zero policies, all grants revoked** from `anon`/`authenticated` → client-unreadable. Paper *content* is always re-fetched via normal RLS, keeping RLS the single source of truth for visibility.
- **Supabase changes are briefed first.** Per CLAUDE.md rule 3 / CONVENTIONS §7: state the query in plain terms, wait for Christian's approval, Christian deploys, then snapshot to `docs/sql/`.
- **tsc gate.** `npx tsc --noEmit` green at every phase exit.
- **AI engine continuity.** Any AI reuses web's **Google Gemini** (`@google/generative-ai`), server-side only (Edge secret, never on mobile). See Phase 5 (gated) and Out of scope.
- **Commits are handled by Christian** (CONVENTIONS §2). Claude stages specific files and drafts messages.

---

## 2. Architecture & data flow

**Embeddings:** Supabase built-in `gte-small` (`Supabase.ai.Session('gte-small')`), **384-dim**, server-side, no API key, no per-call cost.

```
Ingestion (server-side):
  approved paper → embed(title+abstract+keywords) → upsert research_paper_embeddings(vector 384)
  keyword side → REUSE existing research_papers.search_vector + GIN idx_research_papers_search

Query (mobile = anon key only):
  BrowseScreen (debounced query)
    → researchApi.searchPapers(q)
    → supabase.functions.invoke('search-papers', { q })            [Edge Function]
        → embed(q)                                                 [gte-small, server-side]
        → rpc search_research_papers(q_text, q_embedding, n)       [SECURITY DEFINER]
            → RRF( ts_rank over websearch_to_tsquery , 1 - (embedding <=> q_embedding) )
            → hardcoded gate: status in (approved, published), not deleted  [never exceeds RLS]
        → ordered paper_ids (no content) → re-fetch rows under caller JWT  [RLS enforced]
    → map via existing toResearchPaper() → existing ResearchCard
```

**Web review (firsthand-verified, read-only):** the web repo has **no working hybrid search** — only an orphaned `ALTER FUNCTION public.match_paper_content(...)` in `backend/migrations/harden_rls_views_and_functions.sql:23` with no `CREATE`, no `pgvector`, no vector/tsvector columns, no embedding library (Gemini is for PDF chat only), no Edge Functions, no search API. Nothing to port — mobile builds net-new. The orphaned `ALTER` is a latent deploy-time bug to flag to the web owner (their repo, read-only to us).

---

## 3. Phased plan

### Phase 0 — Live DB verification (briefed, read-only) ✅ **COMPLETED (stable)**

**Findings (live DB `nnqnszprshnsyuebegnt`, 2026-06-25):**

- `pgvector` **0.8.0 already installed** (schema `public`; `hnsw` + `ivfflat` available). No extension work needed.
- **Full-text half already built — reuse, do not rebuild:** `research_papers.search_vector tsvector`, maintained by trigger `research_papers_search_vector_trigger` (`BEFORE INSERT/UPDATE OF title, abstract, keywords`) via `update_research_papers_search_vector()` with weighted `to_tsvector('english', …)` (title=A, abstract=B, keywords=C), plus GIN index `idx_research_papers_search`.
- **Semantic half not built:** authoritative `pg_attribute` scan → **no vector columns anywhere**; no whole-paper embedding store.
- **`match_paper_content` exists but is broken:** SECURITY INVOKER, per-paper RAG (chunk retrieval scoped to `p_paper_id`), references table `paper_content_embeddings` which **does not exist** → fails at runtime. It is the web "ask this paper" feature's DB layer, also incomplete. **Left untouched** (non-breaking); relevant to the separate future undertaking.
- **No Edge Functions** exist yet.
- **Access model:** `research_papers` RLS enabled (not forced). A row is **public only when `status = 'approved'`** (else author / faculty / staff-admin / co-author, via the email-resolved id). Non-deleted corpus = 33 papers: `approved`=8 (the entire public set), `pending_faculty`=16, `revision_required`=3, `pending_admin`=2, `rejected`=2, others 1 each — **no `'published'` rows**. (Mobile's `PUBLISHED_STATUSES=['approved','published']`, but RLS exposes only `'approved'` publicly.)

**Exit criteria met:** existing FTS reused; Phase 1 reduced to the embedding store + RRF function; security filter pinned to the RLS-public set (`'approved'`).

---

### Phase 1 — DB foundation ✅ **COMPLETED (stable)**

Deployed to the live DB and verified on 2026-06-25 (additive only; `pgvector` already present; existing `search_vector`/trigger/GIN reused untouched).

**Implementation summary**

- ✅ **Embedding store (locked down):** `public.research_paper_embeddings(paper_id uuid pk → research_papers(id) on delete cascade, embedding vector(384) not null, source_hash text not null, updated_at timestamptz default now())` + `hnsw (embedding vector_cosine_ops)` index. **RLS enabled, zero policies (deny-all), all grants revoked from `anon`/`authenticated`** → embeddings never client-readable (verified `has_table_privilege` false/false). Snapshot: `docs/sql/hybrid_search_schema.sql`.
- ✅ **Hybrid ranking RPC** `public.search_research_papers(query_text, query_embedding vector(384), match_count, full_text_weight, semantic_weight, rrf_k)` → **returns only `(paper_id, score)`**. `language sql stable security definer set search_path = public`, schema-qualified, no dynamic SQL, `match_count` capped ≤ 50. RRF-fuses `ts_rank_cd(search_vector, websearch_to_tsquery('english', …))` with `embedding <=> query_embedding`. **Hardcoded gate: `status in ('approved','published') and deleted_at is null`** (never exceeds RLS). **EXECUTE to `authenticated` only** — `anon` revoked (verified anon=false / authenticated=true). Snapshot: `docs/sql/hybrid_search_rpcs.sql`.
- ✅ **Published-papers read access (Option B):** new additive RLS policy `"Public can read published papers"` — `for select to authenticated using (status='published')`. The web-owned "Combined research read access" policy is **untouched**; `'approved'` stays anon-readable via it. Snapshot: `docs/sql/research_papers_published_read_policy.sql`.
- ✅ **Verified live:** keyword search returned ranked `approved` papers (ids+score only); `get_advisors` shows only the intended INFO ("RLS enabled, no policies" on the embeddings table = deliberate deny-all) — every other advisory is pre-existing / web-scope.

**Implementation decisions**

- Reused the existing `search_vector` FTS instead of building a new index (Phase 0 found it already maintained by web). Function gate widened from `'approved'` to `('approved','published')` after the Option-B read policy landed, so search stays consistent with what's viewable.
- The corrective `revoke … from anon` was required because Supabase auto-grants EXECUTE on new functions to `anon`/`authenticated`; `revoke … from public` alone did not remove the direct `anon` grant.

**Exit criteria met:**

- ✅ Embedding store + RRF function deployed and snapshotted; embeddings client-unreadable.
- ✅ RPC returns only public-set ids+score to `authenticated`; no new advisor issues from this change.
- ✅ Web untouched (additive only).

---

### Phase 2 — Edge Functions (new infra for this project) ⏳ **NOT STARTED**

Source in repo for record; deploy via MCP `deploy_edge_function` / Supabase CLI (Christian approves the deploy).

- ⏳ `supabase/functions/search-papers/index.ts` — input `{ q, limit? }`; embed `q` with `gte-small`; call `search_research_papers` → ordered `paper_id`s; **re-fetch full rows under the caller's JWT** (RLS enforced) → map → return. `verify_jwt` on.
- ⏳ `supabase/functions/embed-papers/index.ts` — backfill/refresh restricted to **`status='approved'`** (data minimization): embed `title+abstract+keywords`, upsert into `research_paper_embeddings`, and delete embeddings for papers no longer approved/deleted. Writer privilege (service-role inside the Edge runtime vs. a guarded `SECURITY DEFINER` upsert) is a Phase 2 security decision — see Risks. Scheduling (freshness) decided here.

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
