# NUcleus Mobile — Project Conventions

Canonical reference for all process conventions. Every commit, phase, issue, SQL change, and handoff must follow these formats without exception.

> **Feeling lost? Start with `docs/HOW_WE_WORK.md`** — the entire workflow in
> plain language. This document is the detailed reference behind that summary;
> you don't need to hold all of it in your head to work.

---

## 1. Branch Workflow

**Trunk-based.** `main` is the trunk and is always releasable. Work lands via short-lived branches merged directly to `main` through a CI-gated PR — target days, not weeks, per branch.

```
main
 └── feat/[task]     (short-lived, one per task)
 └── chore/[topic]   (cross-cutting maintenance, same lifecycle)
```

- **`main`** — trunk. Every merge is CI-gated (`.github/workflows/ci.yml` — typecheck today, more checks as they're added) and reviewed via PR before it lands.
- **`feat/[task]`** — one per task, kebab-case. Cut from `main`, merged back to `main` as soon as it's individually stable. Incomplete or risky work ships behind a **feature flag** (below) rather than staying unmerged for weeks.
- **`chore/[topic]`** — cross-cutting maintenance (workflow, config, docs-only changes). Same short-lived lifecycle, cut from `main`.

Small, frequent merges to `main` surface conflicts early instead of letting them accumulate for weeks. Independent tasks can run as parallel short-lived branches (optionally in separate worktrees); keep each one short enough to merge on its own.

### Feature flags — how incomplete work stays on trunk

When a branch's work isn't fully done but shouldn't block merging to `main`, gate it behind a feature flag instead of holding the branch open:

- A flag is a named boolean, checked at the point the feature would render or execute — default **off** until Christian flips it on.
- Land the flagged-off code on `main` as soon as it typechecks and doesn't regress anything else; this is what lets the branch stay short-lived even if the feature itself isn't done.
- Remove the flag once the feature is fully live everywhere it should be — a flag that outlives its rollout is tech debt, not a permanent branching primitive.

### Merge mechanics (every merge to `main`)

Every merge to `main` happens via a **GitHub PR**, not a direct local `git merge`: Claude Code opens the PR with a structured description (format below), CI runs automatically, a review pass checks the diff against the plan, Christian runs manual QA and gives the go-ahead, then Claude Code merges the PR itself (`gh pr merge`) — preserving the same merge-commit history a local `--no-ff` would. Commits within a branch are not PR'd; only the merge to `main` is (§3).

### Where conventions and docs live

Project-wide rules and docs (`CONVENTIONS.md`, `CLAUDE.md`, `PROJECT_CONTEXT.md`) are **canonical on `main`** and propagate to branches via `git merge main` — pull them in at branch start. Author project-wide changes on `main` (or a `chore/*` branch → `main`), never only on a feature branch, or they drift apart. **Branch-scoped** files stay on their branch: work-in-progress code and any `.claude/settings.json` frozen-file exceptions that reflect what *that* branch may touch.

### PR body format

Use a structured body for every `feat/* → main` PR. Chore and hotfix PRs do not require a body.

```
[Task name] — [one-line outcome statement]

- what changed (bullet)
- what changed (bullet)
```

**Rules:**
- Outcome statement: past-tense summary of what the branch delivered
- Bullets: the meaningful changes, not a file list

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
- Claude Code stages specific files (never `git add .`) and drafts the message. Christian approves the message; Claude Code then executes the commit itself.

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

## 3. Execution Protocol

Once Christian approves a plan, work runs **autonomously end to end** — not one step per turn waiting on confirmation each time. Two points gate on Christian: the plan approval itself, and the PR review/merge gate at the end. Between them, Claude Code follows this loop.

### Before implementing (no pause)

1. Read the source files the change touches (components, API facades, types, frozen file list)
2. Confirm current structure, data flow, and prop interfaces before writing code

Do not use client-side workarounds to simulate server-side behavior. If a change requires a frozen file, stop and escalate (below) — do not attempt the change.

### When SQL is needed (hard stop)

Break the SQL down in plain, simple language (what it does, what it touches, whether it is destructive/reversible, and the data-security impact) and wait for Christian's explicit per-change approval. **Once approved, Claude deploys it via the Supabase MCP** (`apply_migration` for DDL, `execute_sql` for data/reads), then writes/updates the snapshot (§7). Read-only checks (SELECT/EXPLAIN) may be run freely but shown first. This is one of the two hard stops during an otherwise-unattended run.

### After implementing (no pause)

1. Run `npx tsc --noEmit` — a red `tsc` is a blocker (see Escalation), not something to smooth over
2. Run `npm test` — Jest is wired via CI (`.github/workflows/ci.yml`); a red test run is a blocker, same as `tsc`
3. Stage specific files, draft the commit message (§2), and commit
4. Continue directly to the next unit of work — no stop-and-wait

### Parallelizing independent work

When separate units touch non-overlapping files with no shared dependency, run them as parallel sub-agents instead of serially — each proposes its diff, applied and committed in order so history stays linear. Units with a real dependency chain stay serial.

### Escalation — when work gets stuck

A blocker (ambiguous requirement, red `tsc`, a frozen-file conflict, an unexpected merge conflict) does not halt the run:

1. Report the blocker and what's needed to clear it.
2. Continue any independent work that doesn't depend on it.
3. When nothing independent remains, report once: blockers first (with what's needed), completed work after.

### Review & merge (PR gate)

At the branch's merge boundary (§1), Claude Code opens a PR instead of merging locally:

1. Open the PR with a structured description (the PR body format, §1).
2. Run a review pass against the diff — plan conformance, frozen files untouched, `tsc` green.
3. Christian runs manual device/emulator QA and gives the go-ahead, alongside the automated `tsc` + `npm test` (Jest via CI) gates.
4. Claude Code merges the PR (`gh pr merge`) and deletes the branch.

---

## 4. GitHub Issues

### Issue number discipline

Issue numbers are canonical and fixed. **Claude Code is authorized to create and update issues directly** (since 2026-06-24), as long as they follow the formats in this section; it may open issues beyond the current cap. **Whenever a feature is deferred, file an issue for it.** Keep the table below and the cap line in sync whenever an issue is opened or its status changes.

### Canonical issues (latest first)

| # | Title | Status |
|---|---|---|
| 38 | `browse: results list uses ScrollView+map instead of FlatList` | 🔴 Open |
| 37 | `browse: idle search landing feels bare — needs richer layout` | 🔴 Open |
| 36 | `browse: redesign swipe-up explore gesture to pull-to-refresh style` | 🔴 Open |
| 32 | `A0 follow-up: adopt Screen wrapper + motion primitives (deferred from #31)` | 🔴 Open |
| 29 | `search: complete hybrid semantic search (Edge Functions, mobile facade, Browse wiring)` | 🔴 Open |
| 21 | `test: unit coverage for API facades (research, invitations, notifications, faculty, collections)` | 🔴 Open |
| 15 | `faculty: verify annotation overlays on papers returned from dean or program chair` | 🔴 Open |
| 14 | `faculty: annotation creation — write path for review comments` | 🔴 Open |
| 13 | `research detail: related papers via semantic search (replace client-side heuristic)` | 🔴 Open |
| 12 | `faculty: additional tabs (Notifications, Repository, Profile)` | 🔴 Open |
| 11 | `faculty review: annotation threads on papers` | 🔴 Open |
| 10 | `research detail: in-app embedded PDF viewer (student + faculty)` | ✅ Closed |
| 9 | `faculty review actions: email and push notifications not sent on mobile` | 🔴 Open |
| 8 | `ResearchDetail: Download button always visible — no allow_download column` | 🔴 Open |
| 7 | `ResearchDetail / Browse: author name shows "Unknown" for non-uploaders` | ✅ Closed |
| 6 | `Browse: add toggleable list and tile view` | 🔴 Open |
| 5 | `Browse: category filter shows unresolved UUIDs — categories not loading` | 🔴 Open |
| 4 | `ResearchCard: published papers do not show view and download counts` | ✅ Closed |
| 3 | `co_author_invitations: PostgREST joins fail silently for research title and inviter name` | ✅ Closed |
| 2 | `Mobile auth: UUID mismatch between auth.users and public.users breaks RLS` | ✅ Closed |
| 1 | `ResearchDetail: view and download counts not persisting after navigation` | ✅ Closed |

**Current cap: #38.**

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

**When to tag:** Optional but recommended for major integration points merged to `main` (e.g., a shipped milestone). Skip for routine feature commits.

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

Claude Code has Supabase MCP access and **deploys SQL itself after approval** — but must first **break every change down in plain, simple language** (what it does, what it touches, whether it is destructive and reversible, and the data-security impact) and wait for Christian's explicit per-change approval (2026-06-25). The MCP connection is privileged (runs DDL; not constrained by RLS) and the DB is shared with web, so changes must be additive-only where possible, with RLS + least-privilege on anything new. Read-only queries (SELECT, EXPLAIN) may be run freely but shown first. Destructive operations (DROP, DELETE, ALTER, policy drops) require extra explanation of consequences. Deploy DDL via `apply_migration`, data/reads via `execute_sql`. After any deployed change, Claude Code writes or updates the snapshot file in `docs/sql/` — the canonical record of what is live.

---

## 8. Handoffs (optional)

Handoffs are **optional** — the PR description and GitHub issues are the durable record of what's true. Write one only to carry mid-task state across a context break; it is not a required per-session artifact.

When you do write one, use `docs/handoffs/HANDOFF_TEMPLATE.md`: a short frontmatter block (date, branch, last commit, status) plus, in order — what changed since the last note, any session-specific architectural context (stable invariants live in `CLAUDE.md`), current git state, and immediate next steps. Keep it to the delta plus a current-state snapshot; drop sections that don't apply.

---

## 9. Session Closing

A session closes when a PR opens at the merge gate (or merges), when an escalation needs Christian's input, or before context grows too long to maintain quality. There is no registry to update and no plan/handoff lineage to prune — the open PR and GitHub issues carry the state.

If mid-task state needs to survive a context break, write an optional handoff (§8), present it for review, and bundle it into the session's final commit — or a standalone `docs(handoff): …` commit if there's nothing else to attach it to. Otherwise just leave the branch and its open PR as the record.

---

## 10. Project-Wide Standards

Some changes establish a standard the **entire app** must follow — not just the branch that introduced them. These belong in canonical docs (this file / `CLAUDE.md`, canonical on `main`) so they propagate to every feature branch on `git merge main`. When you introduce or change such a standard, document it here in the same change — a standard that lives only in a feature branch's plan or code will drift and the rest of the app won't follow it.

### Shared utilities (reuse over duplication)

Cross-cutting helpers live in `src/utils/` and are the single source of truth — never re-implement them per screen. When a helper is copied a second time, extract it. Canonical examples:

- `src/utils/category.ts` — `resolveCategoryName` / `buildCategoryNameById` / `UUID_PATTERN`: the only sanctioned way to turn a paper's `category` into a display name (UUID-guarded, Issue #5). Every papers-facing surface (Browse, ResearchDetail, My Papers, and any faculty equivalent) must use it.
- `src/utils/format.ts` — dates, relative time, status labels, author-name resolution.

### Design system (single visual standard)

The cool-slate + navy/gold system with **Montserrat (display) + Roboto (UI)** — the MD3-calibrated "Modern Clarity" pass merged 2026-07-04 (#24) — realized in `src/theme/`, is the current visual standard for the whole app. **Typography is provisional pending the UI/UX redesign**, which will revisit it. Always consume theme tokens from `src/theme` — never hardcode colors, fonts, spacing, or radii. New screens and features on **any** branch (student or faculty) must adopt it.

### Applies to every surface

Every branch inherits these standards when it merges `main` — student and faculty alike. The faculty workflow — its screens, cards, and utilities — follows the same shared utilities and design system; no surface gets a parallel set of conventions.
