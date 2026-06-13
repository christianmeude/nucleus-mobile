# NUcleus Mobile — Project Conventions

Canonical reference for all process conventions. Every commit, phase, issue, SQL change, and handoff must follow these formats without exception.

---

## 1. Branch Workflow

```
main
 └── dev
      └── feat/[undertaking]
      └── chore/[topic]
```

- **`main`** — Stable. Merged from `dev` only when an undertaking is complete and verified.
- **`dev`** — Integration branch. Feature branches merge here when individually stable.
- **`feat/[undertaking]`** — One per major undertaking, kebab-case. Examples: `feat/submit-research`, `feat/ui-overhaul`.
- **`chore/[topic]`** — Cross-cutting maintenance (workflow, config, docs-only changes). Cut from `dev` or current working branch.

Merge direction: `feat/* → dev → main`. Never skip levels. Use `git merge --no-ff` to preserve branch history.

---

## 2. Commit Format

Subject line:
```
type(scope): short description
```

Body:
```
Phase N: Label

- Bullet one
- Bullet two

Refs #issue-number
```

**Allowed types:**

| Type | When |
|---|---|
| `feat` | New feature or phase implementation |
| `fix` | Bug fix or corrective change |
| `docs` | Documentation-only changes |
| `chore` | Maintenance, dependency, or config changes |
| `refactor` | Code restructure with no behavior change |

**Rules:**
- Subject line: max 72 characters, imperative mood ("add", "fix", "update"), no trailing period
- Body required when a commit spans multiple files or logical areas
- `Refs #N` when the commit relates to a known GitHub issue
- Christian authors all commits. Claude Code stages specific files (never `git add .`) and drafts the message — user approves and executes.

**Example:**
```
feat(notifications): overhaul Notifications screen to design system

Phase 6: Notifications Overhaul

- Replaced bare loading state with Skeleton rows
- Replaced bare error text with InlineNotice
- Themed RefreshControl and removed all hex literals
- Preserved loadData, markRead, markAllRead logic exactly

Refs #6
```

---

## 3. Phase Protocol

One phase per session turn. Claude Code follows this sequence for every phase.

### Before implementing

1. Read the source files relevant to the phase (components, API facades, types, frozen file list)
2. Report findings: current screen/component structure, data flow, prop interfaces
3. Wait for confirmation before writing any code

Do not use client-side workarounds to simulate server-side behavior. If a change requires a frozen file, stop and report it — do not attempt the change.

### When SQL is needed

Write the SQL text and specify the target snapshot file path. Christian reviews and deploys via the Supabase SQL editor. Never deploy SQL directly. See §7 for the snapshot file format.

### After implementing

1. Run `npx tsc --noEmit` — green typecheck is required before reporting done
2. Update the active plan doc (phase status markers below)
3. Stage specific files — present the diff and commit message draft for review
4. Report: what changed, decisions made, anything deferred
5. Stop and wait for review before moving to the next phase

### Plan doc phase status markers

Use these markers exactly when updating plan docs:

| Marker | Usage |
|---|---|
| `✅ **COMPLETED (stable)**` | Phase header when complete |
| `⏳ **NOT STARTED**` | Phase header when not yet begun |
| `🔴 **BLOCKED**` | Phase header when blocked |
| `- ✅` | Completed task bullet |
| `- ⏳` | Pending task bullet |
| `**Implementation summary**` | Section under a completed phase header |
| `**Exit criteria met:**` | Final line of a completed phase block |

---

## 4. GitHub Issues

### Issue number discipline

Issue numbers are canonical and fixed. Do not invent numbers beyond the current cap. New issues are created by Christian only; update the table below when new ones are opened.

### Canonical issues (latest first)

| # | Title | Status |
|---|---|---|
| 8 | `ResearchDetail: Download button always visible — no allow_download column` | 🔴 Open |
| 7 | `ResearchDetail / Browse: author name shows "Unknown" for non-uploaders` | 🔴 Open |
| 6 | `Browse: add toggleable list and tile view` | 🔴 Open |
| 5 | `Browse: category filter shows unresolved UUIDs — categories not loading` | 🔴 Open |
| 4 | `ResearchCard: published papers do not show view and download counts` | ✅ Closed |
| 3 | `co_author_invitations: PostgREST joins fail silently for research title and inviter name` | ✅ Closed |
| 2 | `Mobile auth: UUID mismatch between auth.users and public.users breaks RLS` | ✅ Closed |
| 1 | `ResearchDetail: view and download counts not persisting after navigation` | ✅ Closed |

**Current cap: #8. Do not invent issue numbers beyond #8.**

### Issue title format

`<scope>: <problem or capability statement>`

- Present tense, no trailing period
- At most one em-dash for a clarifying tail on bugs
- Use `/` when two scopes apply equally
- No redundant `Screen` suffixes (`ResearchDetail`, not `ResearchDetailScreen`)

### Bug issue body

```markdown
## Summary
<Short problem statement and impact.>

## What's working
<What still behaves correctly.>

## What's not working
<Exact broken behavior and where it appears.>

## Suspected cause
<Likely technical cause or hypothesis.>

## Workaround
<Temporary workaround, or "None known".>

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Status / Resolution
<Open / in progress / fixed details.>

## References
<Related PRs, commits, screenshots, logs, docs.>
```

### Enhancement issue body

```markdown
## Summary
<Capability request and user value.>

## Proposed behavior
<What should happen after implementation.>

## Current state
<How it works today and constraints.>

## Acceptance criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Status / Resolution
<Open / in progress / delivered details.>

## References
<Related issues, docs, mockups, links.>
```

### Labels

- `bug` — incorrect behavior, regressions, broken outcomes
- `enhancement` — new capability or meaningful improvement
- `mobile` — React Native / client runtime scope
- `backend` — API, schema, RPC, policy, or server-side dependencies
- Additional labels only when they improve triage clarity (e.g., `auth`, `ui`, `docs`)

---

## 5. GitHub Milestones

### Description format

One paragraph: scope summary in one sentence, total phase count, which issues were resolved or mitigated, notable technical outcomes (architecture decisions, validation results, preserved constraints).

**Example:**
> 10-phase UI overhaul completed across design tokens, shared components, main screens, accessibility polish, and validation; Issue #4 was resolved and Issue #8 was mitigated in UI pending backend `allow_download` support. Notable outcomes include a frozen-layer clean diff against `origin/dev`, Android-safe `ResearchDetail` header handling under edge-to-edge, and a fully passing smoke-test checklist before merge.

### Milestone policy

Milestones are for grouped, closed delivery work. Deferred or open items remain un-milestoned until active execution starts, or are assigned to a clearly scoped future milestone.

---

## 6. Git Tags

Tags are named pointers to commits on `main`. They are not the same as GitHub milestones: milestones group issues; tags freeze a point in repository history.

**When to tag:** Optional but recommended for major integration points merged to `main` (e.g., undertaking complete). Skip for routine feature commits.

**Naming:** Semantic prefix pattern — `v1.0-ui-overhaul`, `v0.9-submit-research`. Pick one scheme and stay consistent.

**Workflow:**
```
git checkout main
git pull
git tag -a <tag-name> -m "<short description>"
git push origin <tag-name>
```

Tags must be created and pushed explicitly — GitHub merges do not create them automatically.

**Relationship to milestones:** Close a GitHub milestone when issues are done. Create a git tag when you want a reproducible snapshot at a shipped milestone on `main`. You may do both, one, or neither.

---

## 7. SQL Snapshot Format

SQL snapshots in `docs/sql/` record deployed Supabase definitions exactly as they exist in the live database. They are **not migration scripts** — they are snapshots of what is currently deployed.

### File naming

`docs/sql/[table-or-feature]_[type].sql`

Examples:
- `docs/sql/submit_research_rls_policies.sql`
- `docs/sql/submit_research_rpcs.sql`
- `docs/sql/research_authors_rls_policies.sql`
- `docs/sql/co_author_invitations_rls_policies.sql`

### File header format

Every snapshot file opens with this exact block comment structure:

```sql
-- ============================================================
-- RECORD: [brief description of what's in this file]
-- [Deployment context — which feature/phase introduced this]
-- [Identity resolution note if applicable, e.g. "Email-resolved user_id matches public.users to auth.email() (project convention)"]
-- This file is a snapshot of deployed definitions, not a migration script.
-- ============================================================
```

Sections within the file are separated by:

```sql
-- ----------------------------------------------------------------
-- [table or function name] — [description]
-- ----------------------------------------------------------------
```

### SQL ownership

Claude Code has Supabase MCP access and may execute SQL directly — but must brief Christian in plain terms before running any query, and must wait for explicit approval. Test/read-only queries (SELECT, EXPLAIN) should also be shown to Christian first. Destructive operations (DROP, DELETE, ALTER, policy drops) require extra explanation of consequences. After any deployed change, Claude Code writes or updates the snapshot file in `docs/sql/`.

---

## 8. Handoff Format

Handoffs are the canonical session-state artifact — the single source of truth for "what's true right now." They live in `docs/handoffs/` and follow the template in `docs/handoffs/HANDOFF_TEMPLATE.md`.

### Naming convention

`HANDOFF_[UNDERTAKING-SHORT]_[PHASE-LABEL].md`

Examples:
- `HANDOFF_S-R_PHASE-3.md` (Submit Research, Phase 3)
- `HANDOFF_U-O_PHASE-10.md` (UI Overhaul, Phase 10)
- `HANDOFF_S-R_KICKOFF.md` (Submit Research, Kickoff)

### Frontmatter

Every handoff opens with YAML frontmatter:

```yaml
---
undertaking: "[name, e.g. Submit Research]"
phase: "[N or label, e.g. 3 or kickoff]"
date: YYYY-MM-DD
branch: "[current branch]"
last_commit: "[type(scope): description]"
status: in-progress | blocked | complete
---
```

### Required sections (in order)

1. **Project Overview** — one-sentence architecture state, current undertaking, branch
2. **What Changed Since Last Handoff** — every delta since the previous handoff, including Supabase changes made outside the codebase
3. **Critical Architectural Context** — session-specific updates to stable patterns only; stable invariants live in `CLAUDE.md`
4. **Open Issues** — current open issues with status and owner
5. **Current RLS Policy State (Supabase)** — per-table policy summary
6. **Supabase RPCs** — all SECURITY DEFINER RPCs with purpose
7. **Current State of the Codebase** — design system, component system, API facades, frozen files, gotchas
8. **Current Git State** — branch, uncommitted changes, untracked files
9. **Commit History** — most recent first
10. **Immediate Next Steps** — ordered action list for the next session

See `docs/handoffs/HANDOFF_TEMPLATE.md` for the full section template.

---

## 9. Session Closing

### When to close

- After a clean phase exit — phase implemented, tsc passes, commit ready or just landed
- Before context grows too long to maintain quality
- Before a significantly different area of work

### Closing procedure

1. Confirm with Christian that a close point has been reached
2. Draft the handoff using `docs/handoffs/HANDOFF_TEMPLATE.md`
3. Present the draft for review — do not commit before approval
4. Once approved: stage the handoff file, draft the commit message (`docs(handoff): add HANDOFF_[NAME]`), present for confirmation
5. After commit: confirm the next session opening state matches the handoff's "Immediate Next Steps"

### What makes a good handoff

A handoff is the **delta** since the last handoff plus the **current-state snapshot**. A future session reading only CLAUDE.md and the latest handoff should be able to fully resume work without needing any other context from this conversation.

Stable invariants (UUID mismatch, email-based RLS, SECURITY DEFINER pattern) live in `CLAUDE.md`. Include in the handoff only if there are session-specific updates or corrections to those patterns — do not copy them verbatim every time.
