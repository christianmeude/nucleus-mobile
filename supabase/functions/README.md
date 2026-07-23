# Supabase Edge Functions — Hybrid Search (#29)

These two functions are **already deployed and ACTIVE** on the live project. The
source here is a version-controlled mirror of what is running — commit it so the
functions live in the repo, not just on the server.

| Function        | Auth                           | Purpose                                                                                                                                                                    |
| --------------- | ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `search-papers` | caller JWT (`verify_jwt` on)   | Embeds the query with `gte-small`, calls the `search_research_papers` RPC as the caller, returns `{ results: [{ paper_id, score }] }`. No secret.                          |
| `embed-papers`  | **service-role key** as bearer | Maintenance backfill: (re)generates one `gte-small` embedding per approved/published paper into `research_paper_embeddings`, prunes stale rows. Not callable by app users. |

## One-time / periodic: run the embedding backfill

`research_paper_embeddings` starts **empty**, so the semantic half of search
returns nothing until this is run at least once. Keyword (full-text) search works
regardless. Run it yourself in a terminal **outside** Claude Code — it needs the
**service-role key**, which must never be pasted into this tool:

```bash
# Set these in YOUR shell (not committed, not shared):
#   SUPABASE_URL=https://<project-ref>.supabase.co
#   SERVICE_ROLE_KEY=<your service-role key>
curl -sS -X POST "$SUPABASE_URL/functions/v1/embed-papers" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json"
# → {"total":N,"upserted":N,"skipped":0,"pruned":0}
```

Re-run it after papers are approved/published or edited — it hashes
`title|abstract|keywords` and skips rows whose embedding is already current.

## Enabling the feature in the app

The Browse data source is gated behind `flags.hybridSearch` (in
`src/config/flags.ts`), default **off**. Flip it to `true` after the backfill has
run and you've QA'd search end-to-end.

## Redeploying (only if the source changes)

These were deployed via the Supabase MCP / dashboard. Any change to the `.ts`
files must be redeployed the same way — a plain-language brief + approval first
(CLAUDE.md Rule 3), since deploys touch the live project.
