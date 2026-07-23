# How We Work

The whole workflow, in plain language. If the other docs feel like a lot, read
this one and ignore the rest — everything below is what _you_ actually do; the
detailed docs (`CLAUDE.md`, `CONVENTIONS.md`) are reference for Claude.

> **The one idea:** You describe the work. Claude builds it on its own copy and
> opens it for you to check. You try it and say _merge_. That is the whole loop —
> everything else is Claude's bookkeeping, not yours.

---

## The loop

Five steps. Three of them are just you talking.

1. **You name a job** — one sentence. _"Fix the category filter."_
2. **Claude shows a short plan** — you read it and say _"go."_ This is the one approval before work starts.
3. **Claude builds it** — on a separate copy, running its own checks the whole way. You do nothing here.
4. **Claude opens a PR** — a finished proposal you can open, read, and run.
5. **You review and merge** — open the app, confirm it works, say _"merge"_ — or ask for changes.

Then back to step 1 for the next job.

---

## The only things you do

- **Say what you want** — one sentence is enough.
- **Approve the plan** — the single go / no-go.
- **Review the result** — try it, then merge.

## What Claude handles (you can ignore all of it)

- Branches, copies, commits
- Typecheck, linting, tests
- Opening and merging PRs
- Remembering where each job stands

---

## Starting and resuming

**Start something new** — just describe it:

> _"Let's add faculty annotations."_

Claude sets up the branch, the plan, everything.

**Pick up where you left off** — just name it:

> _"Resume the faculty work."_

Claude checks the open branch and PR itself. You never track branches or sessions.

---

## When Claude stops and waits for you

Two moments, and only two:

- **Database changes.** Claude explains the change in plain words and waits for
  your yes before touching anything in the database.
- **Locked files.** A few files run the login and security core. They are
  off-limits — if a job needs one, Claude stops and tells you instead of guessing.

Everything else runs start to finish without pausing you.

---

## Words you can ignore

If you ever see `dev`, `predev`, `confluence`, or `integrating` mentioned in old
PRs or commit history, they're leftovers from a heavier process retired on
2026-07-03. They mean nothing in how we work today — one trunk (`main`), short
branches, PRs.
