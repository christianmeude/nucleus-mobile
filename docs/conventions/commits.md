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
- `feat`
- `fix`
- `docs`
- `chore`
- `refactor`

## Ownership rule

christian handles commits. Builders/agents must not embed commit messages in prompts.