# NUcleus Mobile — Claude Code Brief

Read this file in full before doing anything. Then follow the Session Opening Protocol below.

> **Human-facing summary:** `docs/HOW_WE_WORK.md` explains the whole workflow in
> plain language — what Christian does, what Claude handles, when Claude pauses.
> This brief is the detailed operating reference behind it.

---

## What This Project Is

NUcleus Mobile is a React Native (Expo) app for enrolled students at National University Dasmariñas — students browse, read, and submit research papers. The mobile client talks to Supabase (auth, database, storage) using the **anon key + RLS only**. The web backend uses the service role key and is entirely out of scope for mobile work.

Full context: `docs/PROJECT_CONTEXT.md`  
GitHub repo: `christianmeude/capstone-nucleus-rn`

---

## Session Opening Protocol

Trunk-based: `main` is the only long-lived branch. Work lands via short-lived
`feat/*` / `chore/*` branches → PR → `main`, deleted on merge (CONVENTIONS §1).
On opening a session, run these in order; do not act until all are done.

1. Read `docs/PROJECT_CONTEXT.md`
2. Read `docs/CONVENTIONS.md`
   - If the task is A-pillar (redesign) UI work, also read `docs/design/VISUAL_DIRECTION.md` and open `docs/design/mockup.html` — build to those exact values, not to a plan's prose (Rule 9).
3. **Establish where things stand.** `git status` + `git branch` + `gh pr list`
   — is this a fresh task off `main`, or continuing an open `feat/*` branch / PR?
   If continuing a branch, `git merge origin/main` first so the canonical docs
   (`CLAUDE.md`, `CONVENTIONS.md`, `PROJECT_CONTEXT.md`) are current on it
   (CONVENTIONS §1).
4. Report:
   - Current state (branch, open PRs, anything in flight)
   - Open decisions or unresolved items
   - Proposed first action
5. Stop and wait for confirmation before doing anything

### Branches

- One short-lived branch per task, cut from `main`, kebab-case: `feat/<task>`
  (feature) or `chore/<topic>` (maintenance). Target days, not weeks.
- Incomplete or risky work ships behind a **feature flag** (default off) so the
  branch can still merge to `main` quickly, rather than staying open for weeks
  (CONVENTIONS §1).
- Delete the branch on merge — git/PR history is the permanent record. There is
  no undertaking registry, plan-doc lineage, or handoff chain to maintain.
- Worktrees are **optional and ephemeral** — use one only to run parallel
  branches side by side; there is no persistent per-task worktree.

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
6. **Commits.** Stage specific files (never `git add .`), draft a message following `docs/CONVENTIONS.md` §2, and present for review. Once Christian approves the message, Claude Code executes the commit itself — Christian no longer runs `git commit` by hand.
7. **Session notes are optional.** The PR description and GitHub issues are the durable record. Write a handoff (`docs/handoffs/HANDOFF_TEMPLATE.md`) only to carry mid-task state across a context break — it is not a required per-session artifact.
8. **Once a plan is approved, execution is autonomous — not step-by-step.** Plan approval is the only entry gate; hard stops after that are only a SQL/schema change (Rule 3) or a frozen-file conflict (Rule 2). See **Autonomous Execution & Review Gate** below.
9. **Build redesign UI to the visual direction, not to prose.** For any A-pillar (redesign) UI work, `docs/design/VISUAL_DIRECTION.md` + `docs/design/mockup.html` are the **source of truth for both look and motion** — a plan's text is only a summary. Before writing redesign UI, read the spec and port the *exact* values (palette, easing curve + duration, radii, spacing). When motion is called out, treat the curve/timing as a spec, not a vibe. If a faithful port needs a new dep (e.g. `expo-blur`, `expo-linear-gradient`) or a dev-client rebuild, surface it as a decision — do not silently approximate. Verify against the mockup, not just "does it animate."

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

**Frozen is the project-wide default, enforced per branch.** A branch whose scope genuinely requires a listed file may unfreeze that one entry **in its own `.claude/settings.json`** — a deliberate, scoped exception for that work, not a project-wide unfreeze (e.g. a branch that owns navigation changes unfreezes the navigation files). The session-critical core — `AuthContext.tsx`, `supabase.ts`, `src/auth/`, `authStorage.ts`, `domain.ts` — stays frozen on every branch, no exceptions.

---

## Autonomous Execution & Review Gate

Once Christian approves a plan, execution runs unattended through to a pull request. Two human gates bracket it; everything between them is autonomous. Full mechanics: `docs/CONVENTIONS.md` §3.

1. **Plan approval (entry gate).** Christian approves the plan. Everything after this runs without per-step pauses.
2. **Execute.** Work runs end to end — investigate, implement, commit (Rule 6) — with no stop in between. Independent, disjoint-file units may run as parallel sub-agents instead of serially.
   - Hard stops mid-run: a SQL/schema change (Rule 3) or a frozen-file conflict (Frozen Files, above). Both pause for Christian, same as always.
3. **Test.** `npx tsc --noEmit` and `npm test` (Jest, wired via CI) gate the work (Rule 5) — a red `tsc` or red test run is a blocker, not something to smooth over. Manual QA stays Christian's and happens at the review gate below.
4. **Review & merge (exit gate).** At the branch's merge boundary — `feat/* → main` (CONVENTIONS §1) — Claude Code opens a GitHub PR with a structured description instead of merging locally. CI runs automatically. A review pass checks the diff against the plan. Christian runs his own manual QA and gives the go-ahead; Claude Code then merges via `gh pr merge` and deletes the branch.
5. **Escalation.** A blocker (ambiguous requirement, red `tsc`, a frozen-file hit, an unexpected merge conflict) is reported, not smoothed over. Independent work keeps running; Claude Code reports once, consolidated, when nothing independent remains: blockers first, completed work after.

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

Representative RPCs using this pattern: `increment_view_count`, `get_faculty_members`, `create_co_author_invitations`. Not exhaustive — each feature adds its own; the canonical deployed set lives in `docs/sql/`.

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
| `docs/design/VISUAL_DIRECTION.md` | Redesign source of truth — distilled spec (palette, motion, shapes) for A-pillar UI (Rule 9) |
| `docs/design/mockup.html` | Literal in-repo copy of the visual-direction mockup — open in a browser as the visual reference |
| `docs/CONVENTIONS.md` | All conventions: commits, execution protocol, issues, SQL, handoffs |
| `docs/handoffs/HANDOFF_TEMPLATE.md` | Handoff structure template |
| `docs/sql/` | Deployed SQL snapshots (RLS policies + RPC definitions) |
| `src/types/domain.ts` | Canonical domain types (frozen) |
| `src/api/research.ts` | Research and submission API facade |
| `src/api/invitations.ts` | Invitations API facade |
| `src/api/notifications.ts` | Notifications API facade |
| `src/api/faculty.ts` | Faculty read paths + review write RPCs |
| `src/theme/` | Design tokens — always use, never hardcode values |
| `src/components/ui/` | Shared UI primitives |
| `src/components/PdfViewer.tsx` | Shared in-app PDF reader (WebView + pdf.js); used by both roles |
| `src/navigation/FacultyTabs.tsx` | Faculty tab navigator (headerless; per-screen safe-area insets) |
