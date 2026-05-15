# Commit Convention

## Message structure

Subject line:

```text
type(scope): short description
```

Body:

```text
Phase N: Label

- Bullet one
- Bullet two

Refs #issue-number
```

Allowed `type` values:
- `feat` — new feature or phase implementation
- `fix` — bug fix or corrective change mid-phase
- `docs` — documentation only changes
- `chore` — maintenance, dependency, or config changes
- `refactor` — code restructure with no behavior change

## Example

```text
feat(notifications): overhaul Notifications screen to design system

Phase 6: Notifications Overhaul

- Replaced bare loading state with Skeleton rows
- Replaced bare error text with InlineNotice
- Themed RefreshControl and removed all hex literals
- Preserved loadData, markRead, markAllRead logic exactly

Refs #6
```

## Ownership rule

Christian handles commits. Builders and agents must not embed commit messages in prompts.