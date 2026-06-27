# Confluence builds

A **confluence** is a throwaway branch that temporarily fuses two (or more) active
undertakings into one buildable tree, solely to produce a single native dev-client and
QA every undertaking against it at once. It is deleted afterward; each undertaking
continues on its own branch. A confluence is **never** merged into `dev` or `main` — its
only lasting output is a record under `docs/confluences/`.

## When to use

When parallel undertakings each add **native** dependencies (e.g. UX Remodel's visuals +
Faculty Access's `react-native-webview` PDF viewer) and you want to test them together in
one dev-client without permanently merging unfinished work.

## Two-layer model (why this works)

- **Native layer** = the installed dev-client APK. Frozen at build time to the *union* of
  every fused branch's native modules. Independent of your current git checkout.
- **JS layer** = served live by Metro (`expo start --dev-client`) from whichever worktree
  you launch it in.

So one confluence build runs any fused branch's JS. To exercise **both** undertakings'
latest screens in one app, run Metro from the confluence branch — the only place both JS
trees coexist.

## Procedure

1. `git checkout -b confluence/<short-a>-<short-b> dev`
2. `git merge --no-ff feat/<a>` then `git merge --no-ff feat/<b>`
3. Resolve conflicts — usually only `package.json`, `package-lock.json`, and any screen
   both branches touched:
   - `package.json` — union the deps by hand (keep one branch's file, add the other's new
     deps).
   - shared screen — take the visually-correct version; defer cross-feature wiring.
   - `package-lock.json` — take either side, then `npm install` regenerates it.
4. `npm install` (installs native modules, syncs the lockfile).
5. `npx tsc --noEmit` — gate the integrated tree.
6. `eas build -p android --profile development` — one dev-client for all roles.
7. QA: install the APK, run `npx expo start --dev-client` **from the confluence branch**,
   exercise every role.

## Teardown

The confluence is reproducible from its record, so it is safe to delete:

1. `git tag -a confluence/<a>-<b>-<date> <merge-sha> -m "..."` — pins the exact built state
   (keeps the merge commits reachable after the branch is gone).
2. `git branch -D confluence/<a>-<b>`
3. Optionally `git merge dev` into each undertaking's worktree so the `docs/confluences/`
   record is present locally. This brings only the record commit — **never** the
   confluence's merge commits, which were never on `dev`.

## When a NEW build is required

Only when a branch changes the **native** layer (adds / removes / upgrades a native
module). Pure JS / TS / SQL changes never need a rebuild — including wiring a feature to a
native module that is *already* in the installed client (just `npm install` that package's
JS in the worktree so Metro can resolve it).

## Gotcha — `core.bare`

If main-repo work-tree git commands fail with `fatal: this operation must be run in a work
tree` while `git rev-parse` still works, the shared config has `core.bare=true`. Reset with
`git config core.bare false`. The main dir is a real worktree, never bare.

## Naming

- Branch: `confluence/<short-a>-<short-b>` using the undertaking registry short codes.
- Record: `docs/confluences/CONFLUENCE_<A>-<B>_<YYYY-MM-DD>.md`.
- Tag: `confluence/<short-a>-<short-b>-<YYYY-MM-DD>`.
