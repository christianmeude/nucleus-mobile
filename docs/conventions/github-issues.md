# GitHub Issues Convention

## Issue titles

Format: `<scope>: <problem or capability statement>`

Rules:
- Use present tense.
- Do not end titles with a trailing period.
- Use at most one em-dash for an optional clarifying tail on bugs.
- Do not add redundant `Screen` suffixes (use `ResearchDetail`, not `ResearchDetailScreen`).
- Use `/` when two scopes apply equally.

### Canonical issue titles (latest first)

| # | Title |
|---|---|
| 8 | `ResearchDetail: Download button always visible — no allow_download column` |
| 7 | `ResearchDetail / Browse: author name shows "Unknown" for non-uploaders` |
| 6 | `Browse: add toggleable list and tile view` |
| 5 | `Browse: category filter shows unresolved UUIDs — categories not loading` |
| 4 | `ResearchCard: published papers do not show view and download counts` |
| 3 | `co_author_invitations: PostgREST joins fail silently for research title and inviter name` |
| 2 | `Mobile auth: UUID mismatch between auth.users and public.users breaks RLS` |
| 1 | `ResearchDetail: view and download counts not persisting after navigation` |

## Issue number discipline

Do not invent GitHub issue numbers beyond #8 unless Christian creates new issues first and updates the canonical issue titles table above.

## Bug issue body template

Use these sections in this exact order:

```md
## Summary
<Short problem statement and impact.>

## What's working
<What still behaves correctly.>

## What's not working
<Exact broken behavior and where it appears.>

## Suspected cause
<Likely technical cause or hypothesis.>

## Workaround
<Temporary user/dev workaround, or "None known".>

## Acceptance criteria
- [ ] <Criterion 1>
- [ ] <Criterion 2>

## Status / Resolution
<Open / in progress / fixed details.>

## References
<Related PRs, commits, screenshots, logs, docs.>
```

## Enhancement issue body template

```md
## Summary
<Capability request and user value.>

## Proposed behavior
<What should happen after implementation.>

## Current state
<How it works today and constraints.>

## Acceptance criteria
- [ ] <Criterion 1>
- [ ] <Criterion 2>

## Status / Resolution
<Open / in progress / delivered details.>

## References
<Related issues, docs, mockups, links.>
```

## Labels

- `bug` — incorrect behavior, regressions, or broken outcomes.
- `enhancement` — new UX/product capability or meaningful improvement.
- `mobile` — React Native app surface or client runtime scope.
- `backend` — API, schema, RPC, policy, or server-side dependencies.
- Add additional labels only when they improve triage clarity (e.g., `auth`, `docs`, `ui`).