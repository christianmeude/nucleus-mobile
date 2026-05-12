# Git tags convention

## What tags are for

Git tags are named pointers to a specific commit (usually on `main`). They are **not** the same as GitHub milestones: milestones group issues for a release; tags freeze a point in repository history for checkout, comparison, or capstone deliverables.

## When to tag

Optional but recommended for **major integration points** merged to `main` (for example UI overhaul complete, reading experience complete). Skip tagging for routine feature commits on feature branches.

## Naming

Use a clear prefix or semantic pattern, for example `v1.0-ui-overhaul` or `v0.9-ui-overhaul`. Pick one scheme and stay consistent across the project.

## Workflow

After the merge commit exists on `main` locally (and you have pushed `main` if you use a remote):

```text
git checkout main
git pull
git tag -a <tag-name> -m "<short description>"
git push origin <tag-name>
```

Tags are not created automatically by GitHub merges; they must be created and pushed explicitly.

## Relationship to milestones

Close a milestone in GitHub when its issues are done. Create a git tag when you want a reproducible snapshot of the tree at a shipped milestone on `main`. You may do both, one, or neither.
