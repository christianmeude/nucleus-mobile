# Builder Prompt Convention

- Read canonical docs before starting: `docs/PROJECT_CONTEXT.md`, the active plan, latest handoff, and relevant `docs/conventions/*`.
- Investigate the codebase and report findings before implementing changes.
- Do not use local client workarounds to fake server-side behavior.
- Respect the active plan's frozen file list and scope boundaries.
- Run `npx tsc --noEmit` after code changes.
- Update the active plan document on phase completion using that plan's documentation conventions.
- Include expected behavior and unchanged behavior in phase prompts.
- Do not include commit messages inside builder prompts.
- Supabase/RLS/SQL work is handled by christian, not the builder.
