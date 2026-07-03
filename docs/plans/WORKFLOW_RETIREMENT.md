# Workflow Retirement — ✅ COMPLETE (2026-07-03)

A one-time cleanup, **not** a registered undertaking with its own ceremony —
that would just add more of the process we're removing. Retired the old heavy
workflow so the project now runs on **one** path: short-lived `feat/*` / `chore/*`
branches → PR → `main`. Removed the vocabulary that made the process feel "all
over the place" — `dev`, `predev`, `confluence`, `integrating`.

> **Rule (honored):** delete the *things* before the *words*. The legacy sections
> in `CONVENTIONS.md` / `CLAUDE.md` stayed until the branches they described were
> actually gone, so the docs never described a state that wasn't real. Doc
> deletion was the **last** step.

> **STATUS — DONE (2026-07-03).** Single trunk = `main`; only `origin/main`
> remains on the remote. All completed undertakings + tooling + cleaned docs are
> on `main` (`d46a207`, CI + tsc green). This file is now a historical record.

---

## End state — achieved

- ✅ `main` is the only long-lived branch and the single trunk. Every merge is a
  CI-gated PR into `main`.
- ✅ `dev`, `predev/uxr-fac`, `feat/ux-remodel`, `feat/faculty-access` no longer
  exist (local or origin). `docs/predev/` and `docs/confluences/` kept as
  historical archives.
- ✅ `feat/hybrid-search` (and any future work) targets `main` directly.
- ✅ `CONVENTIONS.md` §1 "Legacy" block, the `integrating` status vocabulary, and
  the `predev`/`grandfathered` language in `CLAUDE.md` are deleted. Registry shows
  only live undertakings + `complete`.
- ✅ `origin/main` is current and the default branch.

## ⛔ Irreversible / hard-pause points — how they were handled

Both mutated shared remote state and required Christian's explicit go — which was
given. Note the **actual** mechanism differed from the original plan: the
auto-mode classifier **blocks direct `git push origin main` and blocks an agent
self-merging its own PR to `main`**, so every `main` mutation went through a
CI-gated PR that Christian authorized (via `permissions.allow` rules
`Bash(gh pr merge:*)` + `Bash(git push:*)`).

- **P4** — publishing `main`: done as **PR #18** (trunk-reconcile), not a direct push.
- **P5** — deleting branches: done after Christian said "all legacy things gone."

---

## Phases — all complete

### Phase 1 — Finish the in-flight integration ✅ DONE
Landed in a **parallel session** before this one: UX Remodel + Faculty Access
fused on `predev/uxr-fac` and merged to `dev` (`250bec6`). By the time this
session ran, `predev/uxr-fac` + the two feature branches were already retired.

### Phase 2 — Tooling + docs ✅ DONE (rerouted to `main`, not `dev`)
`dev` was bypassed entirely — tooling and docs landed straight on the new trunk:
- ✅ **PR #16** (`chore/dev-tooling`) — ESLint + Prettier + Jest + CI lint/test/typecheck → `main`
- ✅ **PR #17** (`docs/simplify-workflow`) — plain-language `HOW_WE_WORK.md` + vocab cleanup → `main` (merged last)

### Phase 3 — Reconcile `dev` → `main` ✅ DONE
- ✅ Merged `dev` (89 commits) into `main` locally — result tree **byte-identical to `dev`**, `tsc` green (`2d7a19b`)
- ✅ Published via **PR #18** (couldn't be a direct push — see P4)

### Phase 4 — Publish `main` ✅ DONE
- ✅ `origin/main` advanced from ~89 behind to the true trunk via PR #18 merge
- ✅ `origin/main` confirmed current + default

### Phase 5 — Delete the branches ✅ DONE
- ✅ Deleted `dev` (local + origin) — content 100% contained in `main` (verified ancestor)
- ✅ `predev/uxr-fac`, `feat/ux-remodel`, `feat/faculty-access` already gone (Phase 1 era)
- ✅ Also deleted merged `chore/dev-tooling`, `docs/simplify-workflow`, and stray `feat/ui-overhaul` + `feat/supabase-migration` (all merge-verified into `main`)
- ✅ Temp reconcile worktree removed; main-dir worktree moved to `main`
- ✅ `feat/hybrid-search` needed **no** retarget — its base was already an ancestor of `main`

### Phase 6 — Delete the words (docs) ✅ DONE
- ✅ `CONVENTIONS.md`: deleted §1 "Legacy" block; retargeted §10 propagation framing `dev` → `main`
- ✅ `CLAUDE.md`: removed `integrating`/`grandfathered`/`predev` language; registry lists only live + `complete`
- ✅ `HOW_WE_WORK.md`: "Words you can ignore" now past-tense (ghosts retired)
- ✅ `docs/predev/` + `docs/confluences/` left as historical archives (legitimately contain the old vocab)

---

## Completion record

Executed 2026-07-03 across a parallel session (Phase 1) and this session
(Phases 2–6). Key learning captured for future work: **`main` advances only via
CI-gated PRs** — the classifier enforces it, and Christian either grants
`gh pr merge` permission or merges in the GitHub UI (HOW_WE_WORK step 5).
`feat/hybrid-search` should `git merge main` to pick up the tooling before its
first PR.
