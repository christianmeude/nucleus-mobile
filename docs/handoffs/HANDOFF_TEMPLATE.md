---
date: YYYY-MM-DD
branch: "[current branch]"
last_commit: "[type(scope): description]"
status: in-progress | blocked | complete
---

# NUcleus Mobile — Session Handoff

> Optional. Write one only to carry mid-task state across a context break
> (CONVENTIONS §8). The open PR and GitHub issues are the durable record — keep
> this to the delta plus a current-state snapshot, and drop any section that
> doesn't apply.

## What changed this session

> Every delta since the last note, including any Supabase changes made outside
> the codebase — what was done, why, and whether it's committed.

- [change] — [why; note if uncommitted]

## Architectural context (session-specific only)

> Stable invariants (UUID mismatch, email-based RLS, SECURITY DEFINER pattern,
> mobile auth model) live in `CLAUDE.md` — record here only a new nuance,
> correction, or deployed SQL/RLS change discovered this session.

- [pattern or correction], or "None."

## Current git state

Branch: `[branch]` — working tree [clean / has uncommitted changes].

- Modified: `[file]` — [note]
- Untracked: `[file]` — [note]

## Immediate next steps

1. [First action — specific and actionable]
2. [Second action]
3. [Any backend/SQL actions Christian owns]
