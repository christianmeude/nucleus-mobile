# Pre-dev integration

A **pre-dev integration** is a persistent branch that fuses two (or more) mature
undertakings into one tree, hosts the revision and uniformity work the union
demands, and finally **merges into `dev`**. Unlike a confluence (its throwaway
ancestor — see `docs/confluences/`, archived), a pre-dev branch is a real
undertaking: it has a registry row, a plan, a handoff lineage, and a short code,
and it is the path by which its participant undertakings reach `dev`.

## When to use

Use a pre-dev integration when parallel undertakings **interlock** — they share
screens, or must converge on one design language — and the union needs *actual
work*, not just a combined QA build: reconciling conflicts, wiring cross-branch
features, and bringing every surface to one standard.

Use a **confluence** (throwaway, QA-only, never merged — the archived workflow)
only when nothing needs changing and you merely want one dev-client to test two
branches at once.

## Semantics vs the confluence ancestor

| | Confluence (archived) | Pre-dev integration |
|---|---|---|
| Lifetime | Throwaway, deleted after QA | Persistent until it clears to `dev` |
| Purpose | One combined dev-client for QA | Fuse + revise + unify, then ship |
| Merges to `dev`? | **Never** | **Yes** — it is the merge |
| Lasting artifact | A record under `docs/confluences/` | Full undertaking: registry row, plan, handoffs, instance record |
| Feature branches | Continue independently | **Retired** at final merge |

## Naming

- Branch: `predev/<short-a>-<short-b>` (lowercase registry short codes).
- Worktree: `capstone-nucleus-rn-predev`.
- Plan: `docs/plans/PREDEV_<A>-<B>.md` (branch-scoped — lives only on the predev branch).
- Handoffs: `HANDOFF_P-D_<PHASE>.md` (short code `P-D`).
- Instance record: `docs/predev/PREDEV_<A>-<B>_<YYYY-MM-DD>.md` (authored on `dev` at retirement).
- Participant registry rows flip to the **`integrating`** status while the pre-dev branch is active; the registry legend must route their resume requests to the pre-dev undertaking.

## Procedure

1. **Land loose work** on each participant feature branch so its tip is clean.
2. **Author dev-side docs on `dev`** (canonical-doc rule, CONVENTIONS §10): this
   workflow doc if new, the CLAUDE.md registry row, and the `integrating` status
   flips. Never author project-wide docs only on a feature branch.
3. **Create the branch + worktree from the `dev` tip:**
   ```
   git worktree add C:/Users/Christian/Projects/capstone-nucleus-rn-predev -b predev/<a>-<b> dev
   ```
4. **Merge the participants in order**, `--no-ff`, **larger / design-truth branch
   first** — so most conflicts resolve as "keep ours" (the design source of
   truth) and the on-disk `.claude/settings.json` becomes the full unfreeze
   union after the first merge. Use structured merge bodies (CONVENTIONS §1).
5. **Conflict policy:**
   - Keep the design-truth side **wholesale** on rebuilt shared screens; re-apply
     the other branch's cross-feature wiring as a later phase, not from conflict
     markers.
   - `package.json` — union by hand; keep any dead deps until a dedicated cleanup
     phase (config plugins in `app.json` may still reference them).
   - `package-lock.json` — take either side, then `npm install` regenerates it.
   - `.claude/settings.json` — take the side that is the unfreeze union (git-level
     `checkout --ours/--theirs`; the Edit tool is blocked on this file, so
     resolution is a git write that Christian audits).
6. **Gate:** `npm install`, then `npx tsc --noEmit` green before reporting the
   merge done.
7. **Phased uniformity work**, one phase per session turn (house Phase Protocol):
   cross-feature wiring, dependency cleanup, per-screen re-skin, a queued-revisions
   pass, a docs-sync + guardrail re-freeze phase, and an exit-QA + build phase.

## Exit gate — "clear for dev"

The pre-dev branch merges to `dev` only when **all** of these hold:

- All queued revisions applied.
- Full both-role (all-role) QA on a **fresh** dev-client built from the final
  integrated `package.json` — not the day-to-day superset APK.
- `npx tsc --noEmit` green.
- Docs synced (registry, statuses, handoffs, snapshots).
- Christian's explicit go.

## Final-merge format

The predev→dev merge carries **two undertakings**, so it extends the
per-undertaking body in CONVENTIONS §1:

```
Merge branch 'predev/<a>-<b>' into dev

Pre-Dev Integration — <one-line outcome across both undertakings>

Undertakings integrated:
- <Undertaking A> (feat/<a> @ <tip>) — <phase summary>
- <Undertaking B> (feat/<b> @ <tip>) — <phase summary>

Integration phases (docs/plans/PREDEV_<A>-<B>.md):
- Phase 1: label
- Phase N: label
```

## Retirement

After the final merge (from the main dir on `dev`):

1. Tag each participant's final tip — feature branches lose their names on delete:
   ```
   git tag -a retired/<undertaking>-<date> feat/<undertaking> -m "..."
   ```
2. Remove worktrees and delete branches (`-d`, never `-D` — it verifies merged):
   ```
   git worktree remove <path>          # one per participant + the predev worktree
   git branch -d feat/<a> feat/<b> predev/<a>-<b>
   git worktree prune
   ```
3. Registry flips: participants and the pre-dev row → `complete`; participant
   branch columns → "merged → dev".
4. Write the instance record on `dev` (`docs/predev/PREDEV_<A>-<B>_<date>.md`) —
   now the merge SHA and build link exist.
5. Sibling active branches then sync: `git merge dev` in each worktree.
6. Any deferred scope from a retired undertaking becomes a fresh undertaking cut
   from the new `dev`.

## Gotchas

- **`core.bare`** — if main-dir worktree/status commands fail with
  `fatal: this operation must be run in a work tree`, the shared config has
  `core.bare=true`. Reset with `git config core.bare false`. The `git worktree
  add` step is where this bites.
- **`.claude/settings.json` harness** — deny rules are snapshotted at session
  start and the Edit tool is blocked on this file. So: (a) restart Claude between
  the two merges so the second session starts with the unfreeze union armed;
  (b) resolve its conflict with `git checkout --ours/--theirs` (a git write,
  Christian-audited); (c) **re-freeze** the nav / locked files before the final
  merge, or the merge silently carries the unfrozen settings onto `dev`.
- **Metro cache** — first `expo start` in the predev worktree (and in any worktree
  after retirement) must use `-c`; a stale cache can 404 removed font/native
  modules after a swap.
- **Superset-APK QA** — day-to-day QA runs fine on an older dev-client whose
  native layer is a superset of the integrated tree; rebuild only when the native
  layer actually changes (add/remove/upgrade a native module).
