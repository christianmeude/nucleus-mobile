# Builder Prompt Convention

## Reading order (required before every session)

Read these in order before touching any code:

1. `docs/PROJECT_CONTEXT.md` — product/domain baseline
2. Active plan (`docs/plans/*.md`) — scope, phase structure, and frozen file list
3. Latest handoff (`docs/handoffs/*.md`) — current codebase state, component contracts, open issues
4. Relevant convention files under `docs/conventions/*`

Do not skip this step. The handoff is the single source of truth for what exists. Reading it first prevents re-investigation of already-resolved problems.

## Pre-implementation discipline (required)

- **Investigate before implementing.** Read the relevant source files, confirm component prop interfaces, check frozen file lists, and report findings before writing a single line of code.
- **Report findings first.** Every phase prompt will ask for a findings report. Produce it. Confirm the current screen structure, data flow, and component contracts before proceeding.
- **Do not use client-side workarounds to fake server-side behavior.** If a feature requires backend work, flag it and escalate to Christian. Do not simulate it locally.
- **Respect the frozen file list.** The active plan and the handoff both list frozen files. Do not touch them under any circumstances. If a change seems to require a frozen file, stop and report it.

## Phase prompt structure

One prompt per phase. Each prompt must include:

1. **Reading list** — explicit list of files to read before starting, in order
2. **Findings report request** — explicit instruction to report findings before implementing
3. **Scope** — what changes and why, referencing the active plan section
4. **Explicitly not changing** — what must be preserved exactly
5. **Important notes** — cross-phase gotchas, field naming surprises, component constraints
6. **Testing checklist** — split into visual changes to expect and behavioral smoke test
7. **Constraints** — frozen files listed explicitly every time, not assumed
8. **Completion protocol** — update plan doc, run `tsc --noEmit`, report decisions, stop and wait

## Example prompt structure

```text
Before doing anything, read these files in full:
- docs/plans/[ACTIVE_PLAN].md
- docs/PRODUCT_ROADMAP.md
- src/screens/main/[TargetScreen].tsx
- src/components/[RelevantComponent].tsx
- src/components/ui/index.ts
- src/theme/index.ts

Report your findings before writing a single line of code. Confirm
the current screen structure, data flow, and component prop interfaces.
Then proceed.

---

Phase N scope: [description of visual/behavioral changes]

Explicitly NOT changing:
- [data call 1]
- [data call 2]
- [navigation behavior]

Important notes:
- [cross-phase gotcha, e.g. EmptyState icon must be rendered <Ionicons />]
- [field naming note, e.g. is_read not read]
- [no hex literals]

What to check when testing:
Visual changes to expect:
- [change 1]
- [change 2]

What should not change:
- [behavior 1]
- [behavior 2]

Behavioral smoke test:
1. [step 1]
2. [step 2]

Constraints:
- Do not touch src/api/*, src/context/AuthContext.tsx, src/lib/supabase.ts,
  src/auth/*, src/storage/authStorage.ts, src/types/domain.ts
- Do not touch any other screen or component outside phase scope
- Run npx tsc --noEmit after all changes
- Follow documentation conventions in [active-plan-doc]

When done:
- Update [active-plan-doc] to mark phase complete
- Run npx tsc --noEmit and confirm green
- Report what changed, decisions made, anything deferred
- Stop and wait for review before the next phase
```

## Post-implementation requirements

- Run `npx tsc --noEmit` after every code change. Green typecheck is non-negotiable before reporting done.
- Update the active plan document using that plan's documentation conventions (`✅ **COMPLETED (stable)**` for finished phases, `- ✅` bullets for completed tasks).
- Provide a summary covering: what changed, what decisions were made, and anything deferred.
- Stop and wait for Christian's review before starting the next phase.

## Out of scope for builders

The following are handled by Christian directly and must never be done by a builder or agent:

- Supabase SQL — schema changes, table creation, column additions
- RLS policies — creation, modification, or deletion
- RPC definitions — creation or modification of SECURITY DEFINER functions
- GitHub issue or milestone creation
- Commit authoring — commit messages are produced by Christian after review
- Handoff generation — handoffs are produced separately, not by the builder