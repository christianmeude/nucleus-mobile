---
undertaking: "[name, e.g. Submit Research]"
phase: "[N or label, e.g. 3 or kickoff]"
date: YYYY-MM-DD
branch: "[current branch]"
last_commit: "[type(scope): description]"
status: in-progress | blocked | complete
---

# NUcleus Mobile — Session Handoff Context ([Undertaking] [Phase/Label])

## Project Overview

React Native Expo app (`capstone-nucleus-rn`) [current architecture state in one sentence]. [Current undertaking] is in progress on branch `[feature-branch]`, [completed phase range], [next phase state].

**Canonical docs in the repo:**
- `docs/PROJECT_CONTEXT.md` — product identity, audience, navigation, domain types, principles
- `docs/PRODUCT_ROADMAP.md` — UX and design direction reference
- `docs/CONVENTIONS.md` — all process conventions (commits, phase protocol, issues, SQL, handoffs)
- `docs/plans/SUPABASE_MIGRATION.md` — migration history and SQL/RLS policy reference
- `[active plan path]` — [active undertaking] implementation plan

**GitHub repo:** `christianmeude/capstone-nucleus-rn`

---

## [Previous Undertaking] Status

✅ Complete and stable. See `[relevant-plan-doc]`.

---

## [Active Undertaking] Status

Currently on branch `[feature-branch]`, branched off `[base-branch]`.

- ✅ Phase 1 — [Label]
- ✅ Phase 2 — [Label]
- 🔴 Phase 3 — [Label] ← blocked / in-progress
- ⏳ Phase 4 — [Label]

---

## What Changed Since [Previous Handoff Name]

> Every delta since the last handoff, including Supabase changes made outside the codebase.

### [Gap/Fix/Feature Title] ([status emoji + one word])

**Root cause:** [what caused the issue or why the change was needed]

**Fix applied:** [what was done; note if uncommitted]

**Status:** [resolved / unresolved / partial; if unresolved, state the blocker]

---

## Critical Architectural Context

> This section is for **session-specific updates only**. Stable invariants (UUID mismatch, email-based RLS, SECURITY DEFINER pattern, mobile auth model) live in `CLAUDE.md` — do not duplicate them here unless there is an update, correction, or new nuance discovered this session.

### [New pattern or correction discovered this session]

[Details]

---

## Resolved Issues

- ✅ #[N] — [problem summary] — [resolution mechanism]

## Open Issues

- 🔴 #[N] — [description] — [owner / dependency / investigation note]

**Current cap: #[N]. Do not invent issue numbers beyond #[N].**

---

## Current RLS Policy State (Supabase)

All policies use email-based resolution unless noted. See `docs/plans/SUPABASE_MIGRATION.md` for migration-era SQL and `docs/sql/` for snapshots.

**Tables with active policies:**

- `[table]` — [policies: SELECT/INSERT/UPDATE/DELETE, scope notes]

---

## Supabase RPCs

All SECURITY DEFINER. All `SET search_path = public`. All `GRANT EXECUTE TO anon, authenticated`.

- `[rpc_name(signature)]` — [purpose and language]

---

## Current State of the Codebase

### Design system

- `src/theme/` — `colors`, `typography`, `spacing`, `shadows`, `radii`, `motion`, `index`
- Fonts: [font stack]
- Token consumption via direct `import { theme } from '../theme'` — no `useTheme()` hook

### Component system

- `src/components/ui/` — [UI primitives list]
- `src/components/` — [feature components list]

### API facades

- `src/api/research.ts` — [key methods and state]
- `src/api/invitations.ts` — [key methods and state]
- `src/api/notifications.ts` — [key methods and state]

### Frozen files (do not touch without explicit plan scope)

[List per active plan and `CLAUDE.md`]

### Field-level gotchas

[Non-obvious field naming, type coercions, or data-shape surprises relevant to the active undertaking]

---

## Builder Changes (uncommitted, if any)

- `[file]` — [what changed and why]

### Dependency Changes (uncommitted, if any)

- `[file]` — [what changed and why]

### SQL Snapshot Files (untracked, if any)

- `docs/sql/[file]` — [what it records]

---

## Issues Opened / Closed Since [Previous Handoff Name]

- [No new GitHub issues filed. / List new issues.]
- [No issues closed. / List closed issues with resolution.]
- **Current cap: #[N]. Do not invent issue numbers beyond #[N].**

---

## Current Git State

Branch: `[feature-branch]` — working tree [clean / has uncommitted changes].

**Modified (uncommitted):**
- `M [file]` — [note]

**Untracked:**
- `[file]` — [note]

**Intended branch workflow:**
```
[feature-branch] → [integration-branch] → main
```

---

## Commit History (most recent first)

```
[sha] (HEAD -> [branch]) [message]
[sha] [message]
[sha] ([base-branch]) [message]
```

---

## Immediate Next Steps

1. [First action — specific and actionable]
2. [Second action]
3. [Third action]
4. [Any backend/SQL actions Christian owns]
