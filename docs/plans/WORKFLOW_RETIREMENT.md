# Workflow Retirement — checklist (kill the ghosts)

A one-time cleanup, **not** a registered undertaking with its own ceremony —
that would just add more of the process we're removing. Retire the old heavy
workflow so the project runs on **one** path: short-lived `feat/*` / `chore/*`
branches → PR → `main`. Removes the vocabulary that makes the process feel "all
over the place" — `dev`, `predev`, `confluence`, `integrating`.

> **Rule:** delete the *things* before the *words*. The legacy sections in
> `CONVENTIONS.md` / `CLAUDE.md` stay until the branches they describe are actually
> gone, so the docs never describe a state that isn't real. Doc deletion is the
> **last** phase, not the first.

> **STATUS — 2026-07-03:** Phase 1 (uxr-fac integration) landed on `dev` in a
> parallel session (250bec6). This session: merged `dev` → `main` locally (tree
> identical to `dev`, `tsc` green — commit `2d7a19b`) and cut the legacy vocab
> from `CLAUDE.md` / `CONVENTIONS.md` / `HOW_WE_WORK.md`. **Remaining:** push
> `main` to origin, land tooling PR #16, delete `dev` + stale legacy remotes, then
> merge this doc-cleanup PR (#17) last.

---

## End state (definition of done)

- `main` is the only long-lived branch and the single trunk. Every merge is a
  CI-gated PR into `main`.
- `dev`, `predev/uxr-fac`, `feat/ux-remodel`, `feat/faculty-access` no longer
  exist (local or origin). `docs/predev/` and `docs/confluences/` are archived.
- `feat/hybrid-search` (and any other live work) targets `main` directly.
- `CONVENTIONS.md` §1 "Legacy" block, the `integrating` status vocabulary, and the
  `predev`/`grandfathered` language in `CLAUDE.md` are deleted. Registry shows only
  live undertakings + `complete`.
- `origin/main` is current (today it is ~69 commits behind — see Phase 4).

## ⛔ Irreversible / hard-pause points

Claude pauses for Christian's explicit go at each of these — they mutate shared
remote state or destroy branches:

- **P4** — publishing `main` to origin (fast-forwards the remote trunk by ~69 commits).
- **P5** — deleting `dev`, `predev/uxr-fac`, `feat/ux-remodel`, `feat/faculty-access` on origin.

Everything else runs autonomously between pauses.

---

## Phases

### Phase 1 — Finish the in-flight integration ⏳ NOT STARTED
The UX Remodel + Faculty Access fuse on `predev/uxr-fac` must land first (its
grandfathered `predev/uxr-fac → dev → main` path). Resume via *"resume the pre-dev
integration"* — routes to the `capstone-nucleus-rn-predev` worktree, plan
`docs/plans/PREDEV_UXR-FAC.md`, latest handoff `HANDOFF_P-D_PHASE-8`.
- ⏳ Complete remaining predev phases (from Phase 8 handoff)
- ⏳ Merge `predev/uxr-fac` → `dev` via PR
- **Exit:** UX-R + FAC fully integrated on `dev`; both feature branches obsolete.

### Phase 2 — Land the pending tooling + docs PRs ⏳ NOT STARTED
- ⏳ Merge PR #16 (`chore/dev-tooling`) → `dev`
- ⏳ Merge PR #17 (`docs/simplify-workflow`) → `dev`
- **Exit:** `dev` carries lint/test/CI + the plain-language front door.

### Phase 3 — Reconcile `dev` → `main` ⏳ NOT STARTED
- ⏳ Merge `dev` into `main`, resolving the small `main`-only divergence (1 commit)
- ⏳ Confirm `main` now contains everything: all merged undertakings, tooling, docs
- **Exit:** local `main` is the true, complete trunk. `tsc` + CI green on `main`.

### Phase 4 — Publish `main` ⛔ HARD PAUSE ⏳ NOT STARTED
- ⏳ Push `main` to origin (verify fast-forward; ~69 commits) — **await Christian's go**
- ⏳ Confirm `origin/main` is the default branch and current
- **Exit:** remote trunk matches local truth.

### Phase 5 — Delete the branches ⛔ HARD PAUSE ⏳ NOT STARTED
- ⏳ Delete `dev` (local + origin) once `main` supersedes it — **await Christian's go**
- ⏳ Delete `predev/uxr-fac`, `feat/ux-remodel`, `feat/faculty-access` (local + origin)
- ⏳ Remove their worktrees (`git worktree remove`)
- ⏳ Retarget `feat/hybrid-search` onto `main` (rebase or re-base its PR)
- **Exit:** only `main` + live `feat/*` remain.

### Phase 6 — Delete the words (docs) ⏳ NOT STARTED
Only after Phases 4–5. Now the docs can describe the real (single-path) world.
- ⏳ `CONVENTIONS.md`: delete §1 "Legacy" block + `integrating` from the status vocab; simplify §10 (drop the `dev`-propagation framing → `main`)
- ⏳ `CLAUDE.md`: delete `integrating`/`grandfathered`/`predev` language in the registry + worktree sections; registry lists only live + `complete`
- ⏳ Archive `docs/predev/` and `docs/confluences/`
- ⏳ Reconcile `HOW_WE_WORK.md` "Words you can ignore" note (the ghosts are gone, not "being deleted")
- **Exit:** one workflow, one trunk, described once. Ghosts gone.

---

## If it spans sittings
Best done in one or two sittings — it's a cleanup, not ongoing work. If paused,
the phase markers above show where it stopped; point Claude at this file to pick
back up. Phase 1's actual work (the UX Remodel + Faculty Access merge) lives on
`predev/uxr-fac` and stays resumable on its own.
