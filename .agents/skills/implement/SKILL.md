---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

When this skill is invoked, automatically invoke `/tdd` where possible and appropriate for the ticket, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once the ticket is implemented, automatically invoke `/code-review` to review the work if it would be appropriate for the ticket.

Commit your work to the current branch. When committing, DO NOT use `git add .`. Only stage files strictly relevant to the ticket's changes, because using `git add .` will overwrite or commit other files changed by other tickets.
