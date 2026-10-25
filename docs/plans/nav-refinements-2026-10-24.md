# Navigation & Chrome Refinements

Date: 2026-10-24
Baseline: `main` @ `88f0982` (tab pager + atomic paint shipped, nothing pushed).
Status: **Shipped** (2026-10-25). Supersedes the "Next session: refinements" list
in `nucleus-handoff-tab-pager-2026-10-24.md`.

Goal: the app should read as one fluid surface — one notification bell, no
first-run coachmark layer, a static Activity header, a first list paint that
does not rebuild the list, and iPhone-style pushed screens that slide in from
the right and can be dragged back.

---

## Decisions (settled with the user, 2026-10-24)

1. **Bell = Dashboard only**, both roles. No bell on My Papers, Browse, Faculty
   Review, or Activity.
2. **Coachmarks are deleted entirely**, not hidden. The sequence already stalls
   after the bell (the submit FAB moved out of the bar and the pager preloads My
   Papers off-screen). A dead measuring layer is worse than none.
3. **Activity header is static**: no large-title shrink on scroll.
4. **`AtomicListPaint` must stop remounting its list.** The key flip was the
   second of two remounts at the first data commit. `listEpochKey` stays — it is
   the remount `LegendList` genuinely needs.
5. **Root stack becomes `@react-navigation/stack`** (JS stack) so pushed screens
   get `forHorizontalIOS` (right-side overlap + parallax + dim) and an
   interactive horizontal dismiss on **both** Android and iOS. Android
   native-stack ignores `gestureEnabled`, and edge-only dismissal collides with
   Android's system back gesture — hence a full-screen horizontal drag.
6. **Card treatment applies to every pushed screen** (`ResearchDetail`,
   `Activity`, `SubmitResearch`, `FacultyReviewDetail`, `FacultyPaperDetail`).
7. **Docs describe what ships.** The `SCREENS.md` pill spec (420ms overshoot) and
   screen-enter spec (fade + 8px rise) are already false for pushed screens.

Deliberately not doing: the `submitFab` coachmark repair (the feature is gone),
pill/bar geometry tuning (no defect was reported once the pill was explained),
`ListEntranceItem` removal (still correct for detail/annotation lists).

---

## Commit plan

The original seven-commit shape collapsed to four. Reason: `TopBar.tsx` is
touched by the bell, coachmark, and Activity-header changes, and `MyPapers` /
`Browse` / `FacultyReview` are touched by both the bell and the `variant` prop
removal. Git stages files, not hunks, so three separate commits would each have
to carry the others' hunks. Parallel execution makes this unavoidable; the
grouping below is the honest boundary.

| # | Commit | Scope |
| --- | --- | --- |
| 1 | `refactor(chrome): dashboard-only bell, static activity header, drop coachmarks` | commits 1–3 below |
| 2 | `fix(lists): fade the first batch without remounting the list` | commit 4 |
| 3 | `refactor(nav): ios-style card stack with swipe-back` | commit 5 |
| 4 | `docs: record the shipped chrome and navigation` | commit 6 |

Each commit passes `npx eslint src`; the final tree passes
`npx tsc --noEmit` (22 pre-existing jest-globals errors only) and `npx jest`
(17 suites / 202 tests). Nothing is pushed. No EAS rebuild: the stack dependency
is JS-only and `react-native-gesture-handler` is already native.

---

## 1 — Chrome (bell, coachmarks, Activity header)

### 1a. Bell on Dashboard only

`TopBar` already has `hideBell`; no API change. Add it at the three tab roots:

- `src/screens/main/MyPapersScreen.tsx` — `<TopBar variant="compact">` → `hideBell`.
- `src/screens/main/BrowseScreen.tsx` — same (shared by students and faculty).
- `src/screens/faculty/FacultyReviewScreen.tsx` — same.
- `ActivityScreen` already passes `hideBell`; the Dashboard hero is the only
  remaining bell.

### 1b. Delete the coachmark feature

Delete:

- `src/components/coachmarks/CoachmarkProvider.tsx`
- `src/components/coachmarks/sequence.ts`
- `src/components/coachmarks/__tests__/sequence.test.ts`
- `src/hooks/useSeenCoachmarks.ts`
- `docs/design/SCREENS.md` § "Coachmarks (first-time nav, post-onboarding)"

Edit:

- `App.tsx` — drop the `CoachmarkProvider` import and wrapper.
- `src/components/ui/TopBar.tsx` — drop `useCoachmarkTarget`, `bellCoachmarkRef`,
  the `ref` prop on the bell `Pressable`.
- `src/navigation/FloatingTabBar.tsx` — drop the coachmark imports,
  `coachmarkId` from `TabMeta`, `coachmarkRef`/`ref` from `TabItem`.
- `src/navigation/StudentTabBar.tsx` — drop `coachmarkId: 'browseTab'` and its
  comment.
- `src/components/dev/DevResetModal.tsx` — drop `COACHMARKS_KEY`,
  `COACHMARK_IDS`, `requireCoachmarks`, the storage branch, and the
  "Require Coachmarks" checkbox.

Keep `src/lib/firstEntrance.ts` and the `assemble` entrances in
`DashboardScreen` / `FloatingTabBar` — separate feature (post-onboarding
hand-off), not a coachmark.

### 1c. Static Activity header

- `src/screens/main/ActivityScreen.tsx` — no `useSharedValue`, no
  `scrollHandler`; `TopBar` gets `title="Activity"` only; the two lists lose
  `onScroll`.
- `src/components/ui/TopBar.tsx` — delete `variant`, `scrollOffset`, `isLarge`,
  `titleAnimatedStyle`, `rowLarge`, `titleLarge`, and the whole
  `react-native-reanimated` import. Title renders as a plain `Text`.
- `src/components/ui/DashboardHero.tsx`, `MyPapersScreen`, `BrowseScreen`,
  `FacultyReviewScreen` — remove the now-invalid `variant="compact"` props.
- `src/components/NotificationsList.tsx`, `src/components/InvitationsList.tsx` —
  remove the `onScroll` prop and its pass-through.

Result: `TopBar` is a static header (title or children + optional leading /
trailing / bell). No screen can inherit a collapsing title by accident.

---

## 2 — Atomic list paint without a remount

`src/components/ui/motion/AtomicListPaint.tsx` currently keys `FadeInView` on
`ready`, which remounts `FadeInView` **and** its `LegendList` child at the first
data commit — while the list's own `listEpochKey` remount lands in the same
commit. Two full list reconstructions at the most expensive instant; My Papers is
where the eye catches it (its content is still loading when the tab transition
lands).

Replace with a stable wrapper that animates its own opacity:

- one `useSharedValue`, initialised to `1` (skeleton/empty stays fully visible);
- `useEffect` on `ready`: when it flips true, set 0 then `withTiming(1)`; when it
  is false, set `1` — no key, no remount;
- keep `renderToHardwareTextureAndroid` while animating (the Android elevation
  ghost workaround);
- honour `useReduceMotion` (jump to 1);
- duration `motion.duration.listPaint = 200` (new token; the old
  `motion.duration.base` 240ms read as lag over a just-swapped skeleton).

Do **not** touch any `listEpochKey` call site. Pagination, pull-to-refresh, and
SWR revalidation still do not replay the fade (the effect deps are `[ready]`,
and `ready` stays true across those).

---

## 3 — iOS-style card stack

Install `@react-navigation/stack@^7`; uninstall `@react-navigation/native-stack`
after the last import is gone.

`src/navigation/AppNavigator.tsx`:

- `createStackNavigator<RootStackParamList>()` instead of the native stack.
- Navigator `screenOptions` gain the iOS card behavior:
  `cardStyleInterpolator: forHorizontalIOS`, `gestureEnabled: true`,
  `gestureDirection: 'horizontal'`, `cardOverlayEnabled: true`, and a
  `gestureResponseDistance` wide enough that the drag can start anywhere on the
  card (verified against the installed types — see "Open items").
- `headerShadowVisible` is a native-stack option; on the JS stack the equivalent
  is `headerStyle` with `elevation: 0` / `shadowOpacity: 0` (or
  `headerBackground`). Keep the existing header colors, title style, and
  `headerTitleAlign: 'left'`.
- Screen tree, `headerShown: false` flags, and `ResearchDetailHeader` wiring stay
  as they are.

`src/navigation/ResearchDetailHeader.tsx`:

- retype `NativeStackHeaderProps` → `StackHeaderProps` (the component only reads
  `navigation` and `options`; both exist on the JS stack's header props).
- The screens keep `<Screen edges={{ top: false }}>` because the header still
  owns the top inset. Do **not** move the header in-screen: three detail screens
  render their loading / error / loaded branches from separate `<Screen>` roots.

Direction of the gesture: a pushed card enters from the right, so it is dragged
**right** to dismiss (the iOS convention). The card follows the finger, the
underlying screen parallaxes, and release past the distance/velocity threshold
pops the screen.

Reduced motion: the JS stack's `transitionSpec` stays default; the OS animation
scale setting is honoured by React Native's `Animated` on both platforms.

---

## 4 — Docs

`docs/design/SCREENS.md`:

- Motion → signature pill: replace the 420ms cubic-bezier overshoot with the
  pager-driven behavior shipped in `bc40c00` (the pill interpolates the pager's
  `position`; no timing animation, no overshoot).
- Motion → screen-enter: replace "fade + 8px rise over 320ms" for pushed screens
  with the horizontal card slide + interactive dismiss. Keep the fade/rise for
  in-screen content entrances.
- Delete the coachmark section (done in commit 1; verify).
- Navigation bar: record **bell on Dashboard only** (student and faculty), and
  that Activity is reached from there.
- Dashboard: the bell is now the only header affordance besides the avatar.

---

## Verification

Static:

```bash
npx tsc --noEmit     # 22 pre-existing jest-globals errors, no app-code errors ✅
npx eslint src       # 0 errors, 269 warnings ✅
npx jest             # 16 suites / 197 tests ✅
npx expo export --platform android   # Android bundle exported ✅
```

The test count dropped from 202 to 197 because the five coachmark-sequence tests
were deleted with the feature (the plan's 17/202 figure was the pre-deletion
baseline). Device items below were not exercised in this session (no device).

On device (dev client already installed — JS only, no rebuild):

- [ ] Bell appears on the Dashboard only; Dashboard → Activity still works; no
      bell on Papers / Browse / Review.
- [ ] No first-run bubble appears on a fresh install path (`DevResetModal` has no
      coachmark toggle left).
- [ ] Activity header stays one size while the list scrolls; Notifications and
      Invites both still scroll.
- [ ] Papers: tap the tab from Home and from Browse — the page slide is the pager
      animation; no second "pop" after it settles. Repeat for a warm return.
- [ ] Every first list paint still lands as one batch; pull-to-refresh does not
      replay the fade; Reduce Motion skips it.
- [ ] Push ResearchDetail / Activity / SubmitResearch from each tab: the new
      screen enters from the right over the tab screen.
- [ ] Drag right anywhere on a pushed screen: the card follows the finger; past
      the threshold it pops; a vertical scroll is not stolen; a tap does not
      trigger it.
- [ ] Dark mode: mid-drag, the revealed surface matches the app background (no
      white flash).
- [ ] Faculty detail + review detail behave the same; dashboard tiles still apply
      their `initialFilter`.
- [ ] Android hardware back from a pushed screen pops it; from Home it exits.

---

## Parallelization analysis

Units with disjoint file sets:

| Unit | Files | Depends on |
| --- | --- | --- |
| A — chrome (bell + coachmarks + Activity header) | `TopBar`, `FloatingTabBar`, `StudentTabBar`, `DevResetModal`, `App.tsx`, `ActivityScreen`, `NotificationsList`, `InvitationsList`, `DashboardHero`, `MyPapersScreen`, `BrowseScreen`, `FacultyReviewScreen`, coachmark files | — |
| B — atomic paint | `AtomicListPaint`, `theme/motion.ts` | — |
| C — card stack | `AppNavigator`, `ResearchDetailHeader`, `package.json` | `@react-navigation/stack` installed |

A ∩ B = ∅, A ∩ C = ∅, B ∩ C = ∅. All three can run concurrently in one working
tree.

Deliberately **not** used:

- **git worktrees** — a worktree does not share `node_modules`; unit C needs the
  new package resolvable for typechecking. Installing per worktree costs more
  than it saves, and merging lockfiles back is pure risk.
- **per-unit `npx tsc` / `npx jest`** — concurrent edits make repo-wide gates
  lie. Each unit runs `npx eslint` on its own files only; the orchestrator runs
  the full gates once the tree is quiet.
- **agent-side commits** — a single `git add` in a shared tree would sweep
  another unit's work. The orchestrator stages by path after all units report.

Execution: install the stack dependency first (package manager is the one
non-parallel resource), dispatch A and C to subagents, run B inline, then gate,
commit by path, and update docs last.

---

## Open items

- **Resolved in unit C.** `gestureResponseDistance?: number` is the touch-start
  distance from the edge in v7 (default 50). It was set to the window width to
  arm the whole card; activation still requires `minOffsetX 5` / `maxDeltaY 20`,
  so taps and vertical scrolls do not trigger it.
- **Resolved in unit C.** The custom `header` receives its props verbatim and
  keeps its own `useSafeAreaInsets`; no double top inset. Header stays in the
  navigator.
- If "Papers pops" survives the atomic-paint fix, instrument next session
  (`[nav]` timing logs around `jumpTo`, focus effect, and list mount) instead of
  guessing.

## Execution notes (2026-10-25)

Two deviations from the written plan, both necessary:

1. **`native-stack` type imports lived in more files than `AppNavigator`.**
   `src/navigation/types.ts`, `SubmitResearchScreen`, `FacultyReviewDetailScreen`,
   and two unused imports in `FacultyReviewScreen` / `FacultyDashboardScreen`
   also imported from `@react-navigation/native-stack`. They were migrated to
   `StackNavigationProp` before the package was uninstalled. Without this the
   dependency could not be removed.
2. **The stack dismiss gesture is disabled on the root routes** (`Login`,
   `StudentTabs`, `FacultyTabs`, `UnsupportedRole`). The JS stack mounts its
   `PanGestureHandler` on every card, including the root; with the activation
   zone widened to the whole card it would compete with the material-top-tabs
   pager swipe. Pushed screens keep `gestureEnabled: true` from `screenOptions`.

Implementation detail worth keeping: `AtomicListPaint` uses a render-phase
derived state (not `setState` in an effect) to turn on the Android hardware
texture in the same commit that starts the fade, so the first animated frame is
already composited.

`SCREENS.md` was edited in the docs commit (commit 4) rather than alongside the
coachmark deletion in commit 1, because git stages whole files and all of the
file's edits belong to the docs commit.
