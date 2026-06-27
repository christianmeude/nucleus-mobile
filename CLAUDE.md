# NUcleus Mobile — Claude Code Brief

Read this file in full before doing anything. Then follow the Session Opening Protocol below.

---

## What This Project Is

NUcleus Mobile is a React Native (Expo) app for enrolled students at National University Dasmariñas — students browse, read, and submit research papers. The mobile client talks to Supabase (auth, database, storage) using the **anon key + RLS only**. The web backend uses the service role key and is entirely out of scope for mobile work.

Full context: `docs/PROJECT_CONTEXT.md`  
GitHub repo: `christianmeude/capstone-nucleus-rn`

---

## Session Opening Protocol

Work runs as parallel **undertakings**, each with its own branch, plan, handoff
lineage, and (optionally) a git worktree. Resume is routed by undertaking — say
"resume faculty access" or "resume ux remodel" and this protocol loads that
undertaking's state. Run these steps in order; do not act until all are done.

1. Read `docs/PROJECT_CONTEXT.md`
2. Read `docs/CONVENTIONS.md`
3. **Resolve the target undertaking.** Match the user's opening message (e.g.
   "resume faculty access") against the Undertaking Registry below. If the user
   named none, list the non-`complete` undertakings and ask which to resume —
   do not assume.
4. **Load that undertaking's state.** Check out its branch (or open its
   worktree), then read its Plan and its latest handoff — the most recent
   `docs/handoffs/HANDOFF_<SHORT>_*.md` for that undertaking's short code.
5. Report:
   - Current project state (undertaking, branch, phase, open blockers)
   - Open decisions or unresolved items
   - Proposed first action
6. Stop and wait for confirmation before doing anything

### Undertaking Registry

Routing table for resume. The name→short→branch→plan mapping is stable; the only
recurring upkeep is `Status` (updated at session close, CONVENTIONS §9). The
latest handoff is discovered by recency on the branch, not tracked here.

| Undertaking | Short | Branch | Plan | Status |
|---|---|---|---|---|
| Submit Research | `S-R` | merged → `main` | `docs/plans/SUBMIT_RESEARCH.md` | complete |
| UX Remodel | `UX-R` | `feat/ux-remodel` | `docs/plans/UX_REMODEL.md` | active |
| Faculty Access | `FAC` | `feat/faculty-access` | `docs/plans/FACULTY_ACCESS.md` | active |
| Hybrid Search | `H-S` | `feat/hybrid-search` | `docs/plans/HYBRID_SEARCH.md` | active |

> A plan/handoff path resolves once you are on that undertaking's branch (each
> lives on its own branch). Add a new undertaking = add a row + a plan doc; it
> becomes resumable automatically.

### Worktrees (optional, for simultaneous work)

Active/parked undertakings may each have a git worktree pinned to their branch,
so two undertakings run at once without checkout churn. "Resume <undertaking>" =
open its worktree, or check out its branch in the main dir. Run
`git worktree list` for the current map; the main repo dir tracks whichever
undertaking is currently active.

---

## Non-Negotiable Rules

1. **Investigate before implementing.** Read relevant source files, confirm component interfaces, check the frozen file list — then report findings before writing a single line of code.
2. **Never touch frozen files.** Listed below and enforced in `.claude/settings.json`. If a change seems to require a frozen file, stop and report it.
3. **Supabase changes require a plain-language brief, then Claude deploys.** Claude has Supabase MCP access and (as of 2026-06-25) **deploys SQL itself after approval — including DDL/migrations** — but must first explain every change in **plain, simple language** and wait for Christian's explicit per-change approval before deploying. Rules within this rule:
   - **Explain simply, then deploy.** Break the change down in plain language — what it does, what it touches, whether it is destructive/reversible, and the data-security impact — so Christian understands it before it lands. Wait for approval, then deploy via MCP (`apply_migration` for DDL, `execute_sql` for data/reads).
   - **Test queries are encouraged** — run lightweight, read-only checks (SELECT, EXPLAIN) to validate assumptions before any write. Show the test query to Christian first so he can check it himself.
   - **Destructive operations** (DROP, DELETE, ALTER, policy drops, schema changes) must be explained with extra care — what breaks if it goes wrong, and whether it is reversible. No exceptions.
   - **Snapshot files** — after any deployed change, write or update the corresponding snapshot in `docs/sql/`. These remain the canonical record of what is live.
   - **Mobile never uses the service role key** (anon + RLS only — see rule 4). Note the **MCP connection itself is privileged**: it can run DDL and is **not** limited by RLS (confirmed 2026-06-25 — it returns non-public rows). That is exactly why every change goes through the explain-and-approve gate, and why any new object must enforce its own RLS + least-privilege grants.
4. **Never use the service role key on mobile.** Anon key + RLS only.
5. **tsc gate is non-negotiable.** Run `npx tsc --noEmit` after every code change. Green typecheck is required before reporting done.
6. **Commits.** Stage specific files (never `git add .`), draft a message following `docs/CONVENTIONS.md` §2, and present for review. Do not commit without explicit user confirmation.
7. **Handoffs.** At the end of a session or when context grows long, draft a handoff using `docs/handoffs/HANDOFF_TEMPLATE.md`, present for review, then commit once approved.

---

## Frozen Files

Never edit or create files at these paths. Also enforced in `.claude/settings.json`.

| Path | Reason |
|---|---|
| `src/context/AuthContext.tsx` | Auth surface — session-critical |
| `src/lib/supabase.ts` | Supabase client — session-critical |
| `src/auth/` | Auth helpers — session-critical |
| `src/storage/authStorage.ts` | Token persistence — session-critical |
| `src/types/domain.ts` | Canonical domain types |
| `src/navigation/types.ts` | Navigation contract |
| `src/navigation/AppNavigator.tsx` | Navigation contract |
| `src/screens/main/SubmitResearchScreen.tsx` | Locked after Submit Research Phase 2 |
| `docs/sql/submit_research_rpcs.sql` | Deployed SQL snapshot |
| `docs/sql/submit_research_rls_policies.sql` | Deployed SQL snapshot |

**Frozen is the project-wide default, enforced per branch.** An undertaking whose scope genuinely requires a listed file may unfreeze that one entry **in its own branch's `.claude/settings.json`** — a deliberate, scoped exception for that work, not a project-wide unfreeze (e.g. an undertaking that owns navigation changes unfreezes the navigation files on its branch). The session-critical core — `AuthContext.tsx`, `supabase.ts`, `src/auth/`, `authStorage.ts`, `domain.ts` — stays frozen on every branch, no exceptions.

---

## Critical Architecture

These are invariants that do not change between sessions. Know them before touching any code.

### UUID mismatch — most common source of silent RLS failures

`auth.users.id` (from `auth.uid()`) does **not** match `public.users.id` for any user in this project. RLS policies using `auth.uid()` silently return zero rows. Always resolve identity via email:

```sql
SELECT id FROM public.users WHERE email = auth.email()
```

### Email-based RLS (project-wide pattern)

All mobile RLS policies resolve ownership via:

```sql
user_id = (
  SELECT u.id FROM public.users u
  WHERE u.email::text = auth.email()
  LIMIT 1
)
```

### SECURITY DEFINER RPC (established fix for RLS failures)

When direct anon + RLS writes fail due to `42P17` recursion, UUID mismatch, or unreliable `auth.email()` resolution in INSERT context — the fix is a SECURITY DEFINER function:

- `LANGUAGE plpgsql`, `SECURITY DEFINER`, `SET search_path = public`
- `GRANT EXECUTE ON FUNCTION ... TO anon, authenticated`

Representative RPCs using this pattern: `increment_view_count`, `get_faculty_members`, `create_co_author_invitations`. Not exhaustive — each undertaking adds its own; the canonical deployed set lives in `docs/sql/`.

### `public.users` recursion trap

The `public.users` SELECT policy cannot reference itself — triggers `42P17`. Cross-user reads must go through a SECURITY DEFINER RPC. Any policy on another table that chains through `research_papers` back to the same table also risks `42P17`.

### Mobile auth model

- Anon key + RLS only on mobile. Never service role.
- `public.users` has no `auth_id` column — email is the only bridge between `auth.users` and `public.users`
- `fetchAppUserProfile()` resolves by `auth.email()` against `public.users.email`
- Only `student` role gets the full app experience. Non-students see `UnsupportedRole`.

---

## Key Files

| File | Purpose |
|---|---|
| `docs/PROJECT_CONTEXT.md` | Product scope, navigation model, access control, principles |
| `docs/CONVENTIONS.md` | All conventions: commits, phase protocol, issues, SQL, handoffs |
| `docs/plans/` | Per-undertaking plans — see the Undertaking Registry for the active set |
| `docs/handoffs/HANDOFF_TEMPLATE.md` | Handoff structure template |
| `docs/sql/` | Deployed SQL snapshots (RLS policies + RPC definitions) |
| `src/types/domain.ts` | Canonical domain types (frozen) |
| `src/api/research.ts` | Research and submission API facade |
| `src/api/invitations.ts` | Invitations API facade |
| `src/api/notifications.ts` | Notifications API facade |
| `src/theme/` | Design tokens — always use, never hardcode values |
| `src/components/ui/` | Shared UI primitives |
