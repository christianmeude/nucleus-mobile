# Tab Pager, Atomic List Paint, Hero Watermark

Status: **Implemented (phases 1–5).** Phase 6 device verification pending — the
native dev client must be rebuilt before launching. JS gates pass.
Baseline commit: `9e03b55` (`perf(browse): filter and paginate published papers server-side`).

Goal:

1. Every first list paint is **atomic** — one skeleton → one complete batch, never
   "newest row first, then the rest". Surfaces: My Papers, Review Queue, Browse
   (list + grid), Activity (Notifications + Invites), Dashboard Recent Activity
   (student + faculty).
2. True **finger-tracked horizontal paging** across all four student/faculty tabs,
   behind the existing floating frosted tab bar.
3. Dashboard hero watermark changes from the static `N` glyph to the **nucleus mark**
   in the same translucent white, bottom-right treatment.

Parts 1 and 2 are JS-only and can ship before the native rebuild. Part 3 requires a
new dev-client build.

---

## Status

| Phase | Scope | State | Commit(s) |
| --- | --- | --- | --- |
| 0 | Investigation, decisions, baselines | Done 2026-10-24 | — |
| 1 | Atomic list paint (incl. Dashboard Recent Activity) | Done — JS gates pass | `97666ff` |
| 2 | Dashboard hero watermark | Done — JS gates pass | `b5fa44d` |
| 3 | Pager dependencies + native dev build | Deps installed; native build pending | `2fa7430` |
| 4 | Navigator migration (student + faculty) | Done — JS gates pass | `bc40c00` |
| 5 | Floating tab bar → pager position + types | Done — JS gates pass | `bc40c00` |
| 6 | Device verification + doc updates | Pending on-device | — |

Phases 1 and 2 are independent of 3–5 and can be committed/released first.

### Baseline gates (measured at `9e03b55`)

- `npx tsc --noEmit` → **22 pre-existing errors**, all jest-globals in
  `src/auth/__tests__/fetchAppUserProfile.timeout.test.ts`,
  `src/lib/__tests__/supabase.blank-env.test.ts`,
  `src/utils/__tests__/withTimeout.test.ts`. Zero app-code errors.
- `npx eslint src` → **0 errors, 280 warnings**. Use this as the lint gate.
  `npm run lint` lints the whole repo (`.agents`, generated files) and reports 68
  pre-existing errors outside `src`; do not use it as a pass/fail signal.
- `npx jest` → **17 suites / 202 tests pass**.
- `git status` clean.

---

## Part 1 — Atomic list paint

### Root cause (verified)

The data layer is not the problem. Each surface fetches/sets its full first batch
in one commit:

| Surface | Data source | First commit |
| --- | --- | --- |
| My Papers | `researchApi.getMyPapers()` (SWR + disk hydration) | `setPapers(rows)` |
| Review Queue | `facultyApi.getReviewQueue(0, 20, …)` | `setPapers(rows)` |
| Browse | `researchApi.browsePapers(0, …)` / search | `setRows(page.items)` |
| Activity | `notificationsApi.getMine(100)` + `invitationsApi.getMine()` | `setNotifications(combined)` |
| Invites | `invitationsApi.getMine()` | `setInvitations(rows)` |

What the eye sees is `src/components/ListEntranceItem.tsx`:

- wraps rows with `index < 8`;
- starts each at `opacity 0`, `translateY 8`;
- `Animated.delay(index * motion.listStaggerDelay)` where the delay is **60 ms**;
- then `duration: motion.listItemDuration` = **320 ms**.

So row 0 is opaque on landing while row 7 starts **420 ms later** and finishes
**740 ms** later. It replays on every mount, which is why it "always happens".
There is no partial data arriving; the stagger is purely presentational.

`ListEntranceItem` must stay for detail/annotation lists (see "Do not touch"), but
it must come out of every first-paint list.

### The fix

1. Remove the `ListEntranceItem` wrapper from the five list renderers and both
   dashboards' Recent Activity.
2. Replace the ad-hoc fade wrappers in My Papers / Review Queue with one shared
   `AtomicListPaint` and apply it to Browse and Activity too. It fades the whole
   batch **once**, when the first non-empty data commit happens — not per row, and
   not while skeletons are on screen.

Why a data-triggered wrapper instead of leaving the current `onLayout` fade
alone: the current wrapper is inside the list container, so `onLayout` fires while
the skeleton list is laid out. By the time rows arrive the fade has already
finished, and the rows just pop. A stable wrapper also cannot replay a
`FadeInView` when `active` flips true, hence the remount key below. This is a
small correctness cleanup over the existing approach, not a new animation.

### New component

Create `src/components/ui/motion/AtomicListPaint.tsx`:

```tsx
import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { motion } from '../../../theme';
import { FadeInView } from './FadeInView';

interface AtomicListPaintProps {
  /** True once the first non-empty batch of rows is ready to paint. */
  ready: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Group entrance for a list's first data commit.
 *
 * The key flip is deliberate: FadeInView reads `active` at mount, so a stable
 * wrapper would not replay the fade when the batch lands. The flip coincides
 * with the empty↔non-empty remount LegendList already performs via
 * `listEpochKey`, so nothing extra is torn down. While `ready` is false the
 * skeleton/empty state renders at full opacity; when rows land, the whole batch
 * fades in as one motion (opacity only; no per-row stagger).
 */
export const AtomicListPaint = ({ ready, children, style }: AtomicListPaintProps) => (
  <FadeInView
    key={ready ? 'ready' : 'waiting'}
    active={ready}
    distance={0}
    duration={motion.duration.base}
    style={style}
  >
    {children}
  </FadeInView>
);
```

Export it from `src/components/ui/index.ts` next to the other motion exports
(around line 29):

```ts
export { AtomicListPaint } from './motion/AtomicListPaint';
```

`FadeInView` already sets `renderToHardwareTextureAndroid` while animating, which
avoids the Android elevation-shadow ghost when a list containing `Card`/
`PressableCard` is translucent. That is why this should use `FadeInView` rather
than another bare `Animated.View` opacity.

### Edit list (line numbers at `9e03b55`; re-anchor by symbol if shifted)

#### `src/screens/main/MyPapersScreen.tsx`

- L3: remove `Animated` from the `react-native` import.
- L28: remove `motion` from `import { motion, type Theme }` (keep `type Theme`).
- L30: remove `ListEntranceItem` import; add `AtomicListPaint` to the existing
  components import block.
- L227–242 `renderPaperItem`: drop the wrapper and the unused `index`:

```tsx
const renderPaperItem = useCallback(
  ({ item }: { item: ResearchPaper }) => (
    <StandardPaperCard
      paper={item}
      variant="papers"
      category={resolveCategoryName(item.category, categoryNameById)}
      categoryColor={resolveCategoryColor(item.category, categoryColorById)}
      onPress={() => handlePaperPress(item.id)}
      onRequestPublication={() => setPublishTarget(item)}
      onResubmit={() => handleResubmitPress(item.id)}
    />
  ),
  [categoryNameById, categoryColorById, handlePaperPress, handleResubmitPress],
);
```

- L249–261: delete `firstPaintDone`, `paintOpacity`, `handleListLayout`.
- L352–405: replace the `Animated.View` wrapper (keep the `LegendList` contents
  untouched) with:

```tsx
<AtomicListPaint ready={!loading && filtered.length > 0} style={styles.listPaint}>
  <LegendList
    // …unchanged props…
  />
</AtomicListPaint>
```

- L426–428: keep `styles.listPaint: { flex: 1 }`.

`loading` is the initial-load flag; pull-to-refresh uses `refreshing`, so the
wrapper does not remount on refresh. `filtered` is what is actually rendered.

#### `src/screens/faculty/FacultyReviewScreen.tsx`

- L2: remove `Animated` from the `react-native` import.
- L18: remove `ListEntranceItem`; add `AtomicListPaint` to the `../../components/ui`
  import.
- L23: remove `motion` from the theme import (keep `type Theme`).
- L162–174: delete `firstPaintDone`, `paintOpacity`, `handleListLayout`.
- L176–186: drop the wrapper and the unused index. The `index` prop on
  `FacultyPaperCard` is vestigial and ignored by that component; remove it too:

```tsx
const renderPaperItem = useCallback(
  ({ item: rawItem }: { item: any }) => {
    const item = rawItem as FacultyAssignedPaper;
    return (
      <FacultyPaperCard paper={item} onPress={() => handlePaperPress(item.id)} />
    );
  },
  [handlePaperPress],
);
```

- L230–290: replace the `Animated.View` with:

```tsx
<AtomicListPaint ready={papers !== null && papers.length > 0} style={styles.listPaint}>
  <LegendList
    // …unchanged props…
  />
</AtomicListPaint>
```

- Keep `styles.listPaint: { flex: 1 }` (L297–299).

`papers === null` means first load; `[]` means loaded-but-empty; both must stay at
full opacity (skeletons/empty state), so `ready` requires a non-empty array.

#### `src/screens/main/BrowseScreen.tsx`

- L19: remove `ListEntranceItem`; add `AtomicListPaint` to the components import.
- L440–457 `renderListItem`: drop the wrapper and unused `index`.
- L567–629: wrap **both** view modes once, inside `resultsWrap`:

```tsx
<View style={styles.resultsWrap}>
  <AtomicListPaint ready={!loading && listData.length > 0} style={styles.listPaint}>
    {viewMode === 'grid' ? (
      <LegendList … />
    ) : (
      <LegendList … />
    )}
  </AtomicListPaint>
</View>
```

- Add `listPaint: { flex: 1 }` to `makeStyles` (next to `resultsWrap`).
- `listData` is already `[]` while loading (`L355`), so `ready` matches what is
  actually rendered. Grid mode never staggered; wrapping it only adds the same
  one-shot group fade for consistency. Switching grid ↔ list while data is present
  does not flip `ready`, so it does not replay the fade.
- L13 imports `Animated` + `LinearTransition` but neither is used in this file.
  Leave them alone in this change (pre-existing lint warnings, unrelated churn).

#### `src/components/NotificationsList.tsx`

- L13: remove `ListEntranceItem`; add `AtomicListPaint` to the `./ui` import.
- L182–192: drop the wrapper and unused `index`:

```tsx
const renderNotificationItem = useCallback(
  ({ item: rawItem }: { item: any }) => {
    const item = rawItem as NotificationItem;
    return <NotificationCard notification={item} onPress={() => openNotification(item)} />;
  },
  [openNotification],
);
```

- L194–248: wrap the `LegendSectionList`:

```tsx
<AtomicListPaint
  ready={!loading && notifications.length > 0}
  style={styles.container}
>
  <LegendSectionList … />
</AtomicListPaint>
```

This also remounts the section list exactly at the empty→non-empty flip, which is
the same `LegendList` render-phase-write hazard `listEpochKey` exists to prevent;
no separate epoch key is needed.

#### `src/components/InvitationsList.tsx`

- L11: remove `ListEntranceItem`; add `AtomicListPaint` to `./ui`.
- L90–111: drop the wrapper and unused index param (keep the expired/canAct
  logic).
- L113–158: wrap the `LegendList` with
  `ready={!loading && invitations.length > 0} style={styles.container}`.

#### `src/screens/main/DashboardScreen.tsx`

- L24: remove `ListEntranceItem` import.
- L251–264: remove the wrapper; `notifications.map((item) => ( <NotificationCard … /> ))`
  (drop the now-unused `index`). The section already sits inside `FadeInView`
  (`assemble`), so the five cards enter together or not at all.

#### `src/screens/faculty/FacultyDashboardScreen.tsx`

- L25: remove `ListEntranceItem` import.
- L172–185: remove the wrapper and the `upNextPaper ? index + 1 : index` index math.

### What this does **not** change

- `ListEntranceItem` remains for `ResearchDetail` related lists, `AnnotationPanel`,
  and any other incidental list. Do not delete the component or its context.
- `Card` / `ResearchCard` still read `useListEntranceActive()`; outside a
  `ListEntranceItem` it is `false`, so they render at full elevation immediately,
  which is correct once rows no longer fade individually.
- Pagination appends, pull-to-refresh updates, SWR revalidation, and the
  `list:*` perf marks are untouched.
- `listEpochKey` still owns empty↔non-empty remounts.

### Adjacent pre-existing bug (recommended, one line)

`submitFab` is still in `COACHMARK_ORDER` but **nothing registers it anymore**: the
Submit FAB moved out of `FloatingTabBar` into `MyPapersScreen`, and the
`useCoachmarkTarget('submitFab')` ref was lost. The coachmark sequence therefore
stalls after the bell. Since the pager preloads My Papers (`lazyPreloadDistance: 1`),
restoring it is safe:

```tsx
// MyPapersScreen
const fabCoachmarkRef = useCoachmarkTarget('submitFab');
…
<Pressable ref={fabCoachmarkRef} style={…} …>
```

This is not caused by the pager work; ship it separately if preferred. Without it,
the device checklist can only verify the bell and Browse-tab coachmarks.

**Not shipped in this implementation.** With the pager, My Papers is preloaded as
the off-screen adjacent page, so its FAB node lays out at `x ≈ screen width`.
`measureInWindow` returns that off-screen rect, and the submitFab bubble would
anchor to the screen edge instead of the FAB. Restoring the ref needs a
focus-gated registration (and a provider re-measure when a target registers),
not just the one-line ref. The sequence therefore still stalls after the bell —
pre-existing, unchanged by this work.

---

## Part 2 — Dashboard hero watermark

File: `src/components/ui/DashboardHero.tsx`. Shared by both dashboards, so one
change covers student + faculty.

Current (L57, style L115–123): a `Text` "N" at `fontSize: 220`, `right: -24`,
`bottom: -48`, `opacity: 0.08`.

Replace with the existing `assets/images/nucleus-logo.png` rendered as a white
silhouette:

```tsx
import { Image, StyleSheet, Text, View } from 'react-native';
…
<Image
  source={require('../../../assets/images/nucleus-logo.png')}
  style={styles.heroWatermark}
  resizeMode="contain"
  accessible={false}
  pointerEvents="none"
  accessibilityIgnoresInvertColors
/>
```

Styles:

```ts
heroWatermark: {
  position: 'absolute',
  right: -36,
  bottom: -84,
  width: 320,
  height: 320,
  opacity: 0.08,
  tintColor: t.colors.text.onBrand, // white in both schemes
},
```

Why these numbers: the asset is 500×500 RGBA, but the visible mark occupies only
`x 78–414`, `y 102–369` (337×268, i.e. 67.4% × 53.6% of the box). A 320pt box
therefore yields a ~216×172pt visible mark, with `right:-36` leaving ~19pt of
inset and `bottom:-84` putting the visible bottom edge flush with the hero's
bottom crop. That matches the old glyph's footprint. It sits behind `heroContent`
and inside the existing `overflow: 'hidden'` hero. Tune 0.08 → 0.10–0.12 on
device if the silhouette reads fainter than the old bold `N` (thinner strokes).

`tintColor` flattens the navy/gold artwork to a single colour while preserving its
alpha, which is what makes it read as a watermark on the navy gradient. A
full-colour logo would lose the navy body entirely.

Implementation note: `pointerEvents` is not a valid `Image` prop in RN 0.85's
types, so it is omitted. The image is drawn before `heroContent` and has no touch
targets over it.

Docs: update `docs/design/SCREENS.md` line 50 — replace the "giant translucent 'N'
watermark" description with the nucleus mark silhouette (same placement/opacity).
The navy banner `N` called out at line 64 is a different screen; leave it.

---

## Part 3 — True pager across the four tabs

### Decisions

- **True finger-tracked pager**, not a gesture-triggered navigation. Pages must
  follow the finger 1:1, as chosen.
- **All four tabs** are in the swipe range (student Home/Papers/Browse/Profile;
  faculty Home/Review/Browse/Profile). No edge dead-zones.
- Use **React Navigation's material top tabs** (`@react-navigation/material-top-tabs`),
  configured with `tabBarPosition: 'bottom'`, and render the existing
  `FloatingTabBar` as its custom tab bar. This keeps the navigator contract
  (route names, params, `getParent()`, back behavior, deep links) unchanged while
  swapping `react-native-screens` tab transitions for the native pager.
- The pill is driven by the pager's `position` (`Animated.add(position, offset)`,
  native-driven) using **React Native `Animated`**, not Reanimated. The existing
  bar visuals/blur/shadow/coachmark refs stay.

Rejected:

- Gesture + `animation: 'shift'`: no finger tracking; explicitly not what was
  asked for.
- Raw `react-native-tab-view` without React Navigation: would require
  reimplementing navigation state, lazy loading, and back behavior.
- Reanimated indicator: `position` is an RN `Animated` node; feeding it into
  Reanimated requires JS listeners and loses the native-driven interpolation.
  RN `Animated.View` is the supported path and is what tab-view's own indicator
  uses.
- Per-tab layout measurement for the pill: tabs are equal width (`flex: 1`), so
  `barWidth / routes.length` is exact and gives a continuous interpolation. Measuring
  each tab's `x` cannot track fractional positions.

### Dependency facts (verified 2026-10-24)

| Package | Version | Notes |
| --- | --- | --- |
| `expo` | `~56.0.12` | repo |
| `react-native` | `0.85.3` | repo, New Architecture on (`app.config.ts`) |
| `react-native-pager-view` | **`8.0.1`** | Expo SDK 56 bundled native-module range (from `https://api.expo.dev/v2/sdks/56.0.0/native-modules`) |
| `@react-navigation/material-top-tabs` | **`^7.8.1`** | latest 7.x; peers: RN >= 18.2, pager-view >= 6, `@react-navigation/native ^7.5.1`, safe-area-context >= 4 |
| `react-native-tab-view` | `4.3.4` (transitive) | mtt dependency; uses `react-native-pager-view` on iOS/Android via `Pager.ios.js` / `Pager.android.js`; PanResponder on web |
| `@react-navigation/native` | `7.2.2` → **`^7.5.1`** | required by mtt 7.8.1 |
| `@react-navigation/bottom-tabs` | `7.15.9` → remove | unused after migration; its peer `native ^7.2.2` accepts 7.5.1 in the interim |

`@react-navigation/elements` will resolve to `2.9.45+` (mtt requires `^2.9.45`);
bottom-tabs/native-stack accept it. No app code imports elements directly.

### Commands (in this order)

```bash
npx expo install react-native-pager-view
npm install @react-navigation/material-top-tabs@^7.8.1 @react-navigation/native@^7.5.1
# implement phases 4–5, verify no bottom-tabs imports remain:
#   grep -r "@react-navigation/bottom-tabs" src
npm uninstall @react-navigation/bottom-tabs
# native rebuild is required BEFORE launching:
npx expo run:android
# iOS (no ios/ directory in repo): eas build --profile development --platform ios
npm run start   # Metro for the dev client
```

- JS-only reload **will crash** with a missing `RNCPagerView` TurboModule after
  the install. Rebuild the dev client first.
- pager-view 8.0.1 is New-Architecture/Fabric compatible; no config plugin, no
  `prebuild` edit.
- `package-lock.json` is the lockfile. Do not mix in yarn/pnpm.

### Phase 4 — Navigator migration

#### `src/navigation/AppNavigator.tsx`

- L1: add `Dimensions` to the RN import.
- L13: `import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';`
  (delete the bottom-tabs import).
- L39: `const Tabs = createMaterialTopTabNavigator<StudentTabsParamList>();`
- L41–53 replace `StudentTabs` with:

```tsx
const StudentTabs = () => {
  const { theme } = useTheme();
  return (
    <Tabs.Navigator
      tabBar={(props) => <StudentTabBar {...props} />}
      tabBarPosition="bottom"
      backBehavior="firstRoute"
      initialLayout={{ width: Dimensions.get('window').width }}
      screenOptions={{
        swipeEnabled: true,
        lazy: true,
        lazyPreloadDistance: 1,
        sceneStyle: { backgroundColor: theme.colors.surface.base },
      }}
    >
      <Tabs.Screen name="Dashboard" component={DashboardScreen} />
      <Tabs.Screen name="MyPapers" component={MyPapersScreen} />
      <Tabs.Screen name="Browse" component={BrowseScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
};
```

#### `src/navigation/FacultyTabs.tsx`

Same pattern:

```tsx
import { Dimensions } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { useTheme } from '../context/ThemeContext';
…
const Tabs = createMaterialTopTabNavigator<FacultyTabsParamList>();

export const FacultyTabs = () => {
  const { theme } = useTheme();
  return (
    <Tabs.Navigator
      tabBar={(props) => <FacultyTabBar {...props} />}
      tabBarPosition="bottom"
      backBehavior="firstRoute"
      initialLayout={{ width: Dimensions.get('window').width }}
      screenOptions={{
        swipeEnabled: true,
        lazy: true,
        lazyPreloadDistance: 1,
        sceneStyle: { backgroundColor: theme.colors.surface.base },
      }}
    >
      <Tabs.Screen name="FacultyDashboard" component={FacultyDashboardScreen} />
      <Tabs.Screen name="FacultyReview" component={FacultyReviewScreen} />
      <Tabs.Screen name="FacultyRepository" component={BrowseScreen} />
      <Tabs.Screen name="FacultyProfile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
};
```

Critical API details:

- `tabBarPosition` and `initialLayout` are **navigator props**.
- `swipeEnabled`, `lazy`, `lazyPreloadDistance`, `sceneStyle` are **screen
  options**, not navigator props. (mtt 7.8.1's `MaterialTopTabNavigationOptions`;
  its navigator config omits those keys.)
- There is **no `headerShown` option** for material top tabs — they have no
  header. Do not copy it over; it will fail typecheck.
- `sceneStyle` is mandatory here: `NavigationContainer` has no custom `theme`, so
  tab-view's default scene background is white. Without it, a half-swipe in dark
  mode flashes white. Screens keep their own `<Screen>` background.

### Phase 5 — Floating tab bar bridge

#### `src/navigation/types.ts`

- L2: replace the bottom-tabs import:

```ts
import type { MaterialTopTabNavigationProp } from '@react-navigation/material-top-tabs';
```

- L33–36:

```ts
export type FacultyTabNavigationProp = CompositeNavigationProp<
  MaterialTopTabNavigationProp<FacultyTabsParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;
```

No other file imports `BottomTabNavigationProp`. `FacultyTabsParamList` keeps its
unused `FacultyNotifications` key (frozen contract; costs nothing).

#### `src/navigation/StudentTabBar.tsx` / `FacultyTabBar.tsx`

Keep the files as thin meta wrappers; type the props:

```tsx
import type { MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';

export const StudentTabBar = (props: MaterialTopTabBarProps) => (
  <FloatingTabBar {...props} tabMeta={TAB_META} />
);
```

```tsx
export const FacultyTabBar = (props: MaterialTopTabBarProps) => (
  <FloatingTabBar {...props} tabMeta={TAB_META as TabMeta} />
);
```

#### `src/navigation/FloatingTabBar.tsx`

Keep every visual constant and the coachmark refs. Replace the timing machinery
with position interpolation.

- Imports: add `Animated` to the `react-native` import; remove the reanimated
  import block, `Easing`, `useEffect`, `useRef`, `useReduceMotion`, and
  `INDICATOR_TIMING`. Import `MaterialTopTabBarProps` instead of
  `BottomTabBarProps`. Keep `useMemo`, `useCallback`, `useState`, `LayoutChangeEvent`.
- L99–102:

```tsx
interface FloatingTabBarProps extends MaterialTopTabBarProps {
  /** Label + icon pair per route name. Route names come from `state.routes`. */
  tabMeta: TabMeta;
}
```

- `TabItem`: drop the `routeName` and `onLayout` props (no per-tab measurement
  anymore). Keep `useCoachmarkTarget(meta.coachmarkId)` and the ref on the
  `Pressable`.
- Component body:

```tsx
export const FloatingTabBar = ({
  state,
  navigation,
  tabMeta,
  position,
  jumpTo,
}: FloatingTabBarProps) => {
  const insets = useSafeAreaInsets();
  const { theme, scheme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [assemble] = useState(isFirstEntranceArmed);
  const [barWidth, setBarWidth] = useState(0);

  const activeColor = theme.colors.brand.primary;
  const inactiveColor = theme.colors.text.muted;

  // Tabs are flex:1 and equal width, so the pill geometry is continuous.
  const tabWidth = state.routes.length > 0 ? barWidth / state.routes.length : 0;

  const translateX = useMemo(
    () =>
      position.interpolate({
        inputRange: state.routes.map((_, index) => index),
        outputRange: state.routes.map((_, index) => index * tabWidth),
        extrapolate: 'clamp',
      }),
    [position, state.routes.length, tabWidth],
  );

  const handleBarLayout = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setBarWidth((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
  }, []);

  const onTabPress = (routeKey: string, focused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeKey,
      canPreventDefault: true,
      data: {
        behavior: { scrollToTop: focused, popToTop: focused },
      },
    });
    haptics.light();
    // jumpTo is the pager's own key→index path: it animates the page and
    // dispatches onIndexChange, exactly like tab-view's default TabBar.
    if (!event.defaultPrevented) {
      jumpTo(routeKey);
    }
  };

  return (
    <FadeInView
      active={assemble}
      distance={30}
      duration={460}
      fromScale={0.94}
      delay={250}
      style={[styles.wrap, { paddingBottom: insets.bottom || theme.spacing.sm }]}
    >
      <View style={styles.barShadow}>
        <View style={styles.bar} onLayout={handleBarLayout}>
          <BlurView
            intensity={BAR_BLUR_INTENSITY}
            tint={scheme === 'dark' ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.barTint} pointerEvents="none" />
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              {
                width: Math.max(0, tabWidth - PILL_INSET * 2),
                opacity: tabWidth > 0 ? 1 : 0,
                transform: [{ translateX }],
              },
            ]}
          />

          {state.routes.map((route, index) => {
            const focused = state.index === index;
            return (
              <TabItem
                key={route.key}
                meta={tabMeta[route.name]}
                focused={focused}
                onPress={() => onTabPress(route.key, focused)}
                styles={styles}
                activeColor={activeColor}
                inactiveColor={inactiveColor}
              />
            );
          })}
        </View>
      </View>
    </FadeInView>
  );
};
```

- `makeStyles.indicator`: keep `position: 'absolute'`, `top: 9`, `height: 48`,
  `borderRadius: 20`, `borderCurve: 'continuous'`, background; change `left: 0`
  to `left: PILL_INSET`, and remove nothing else. Width is now supplied inline.
- `makeStyles.wrap`: add `zIndex: 10` (the bar is now a sibling drawn over the
  pager; the shadow elevation already helps on Android, this is belt-and-braces).
- Keep `PILL_INSET = 8`, `BAR_BLUR_INTENSITY`, `BAR_TINT_OPACITY`,
  `INDICATOR_TIMING` deleted.
- `haptics.light()` on every tab press (existing behavior), including the focused
  tab.
- Do **not** add a Reanimated shared value for the pill. Do **not** animate
  `width` (layout props are not native-driver-safe); only `translateX` is animated,
  and width is a constant per layout.

What changed visually: the pill no longer plays the 420 ms cubic-bezier
overshoot on tap. It tracks the pager page animation and the finger. That is the
point of this migration; do not "fix" it by re-adding a timing animation.

#### Required regression fix: `FacultyReviewScreen` initial filter

Material top tabs preload the adjacent Review screen at startup
(`lazyPreloadDistance: 1`). Under bottom tabs the screen mounted on first
navigation, so `useState(route.params?.initialFilter ?? 'needs_review')` consumed
the dashboard tile's filter. With preloading it mounts with no params, and later
`navigation.navigate('FacultyReview', { initialFilter })` calls (dashboard tiles,
`FacultyDashboardScreen` L150/L193) would be ignored.

Add an effect below the `filter` state (L37–40):

```tsx
// The tab is preloaded by the pager, so it may already be mounted when a
// dashboard tile navigates with a new filter. Consume the param and clear it so
// a repeated press with the same filter still re-applies.
useEffect(() => {
  const next = route.params?.initialFilter;
  if (!next) return;
  setFilter(next);
  navigation.setParams({ initialFilter: undefined } as never);
}, [route.params?.initialFilter, navigation]);
```

`setFilter` to the current value is a no-op; the existing load effect is keyed on
`filter`, so no duplicate fetch. Clearing the param keeps repeat presses working.

Check other param-carrying tab navigations: only `FacultyReview` has one. Student
`Dashboard → MyPapers/Browse/Profile` pass no params.

### Known behavioral differences to accept

- Bottom tabs detach/freeze inactive screens via `react-native-screens`; the
  pager keeps all mounted scenes in the pager. Visited tabs stay mounted in
  React either way; the difference is native view attachment. Watch memory on
  low-end Android, but four screens is small.
- Tab press transitions use the pager's animation (no overshoot pill). Deliberate.
- `backBehavior: 'firstRoute'` keeps Android back semantics identical: back from
  a non-first tab goes to Home, back from Home exits (handled by the router).
- Web falls back to tab-view's PanResponder automatically (pager-view is not
  imported on web). Not a release target, but `npm run web` should still build.

### Do not do

- Do not remove `@react-navigation/bottom-tabs` until
  `grep -r "@react-navigation/bottom-tabs" src` returns nothing.
- Do not use `navigation.navigate(route.name)` inside the bar. `jumpTo(route.key)`
  is the pager's index path; manual navigation can double-animate or desync.
- Do not put `swipeEnabled` / `lazy` / `lazyPreloadDistance` / `sceneStyle` on
  the navigator; they are screen options.
- Do not add `headerShown` / `tabBarStyle` options from the bottom-tabs docs.
- Do not run `prettier --write` on `ResearchDetailScreen.tsx` (repo rule from
  `list-load-perf-2026-10-19.md`). Do not push unless asked.

---

## Phase 6 — Verification

### Static gates

```bash
npx tsc --noEmit        # must stay at the 22 pre-existing jest-globals errors
npx eslint src          # must stay 0 errors
npx jest                # 17 suites / 202 tests (add tests if you touch pure logic)
```

If any test imports a navigator and Jest trips on the native pager, add
`react-native-pager-view` to `transformIgnorePatterns` (the current
`react-native` alternative already matches the prefix) or a manual mock in
`__mocks__/`. No current test imports navigation, so this is not expected.

### Device checklist — lists (can be done before the rebuild)

Use a dev build with the app force-stopped, and repeat once after logout so the
disk snapshot is cold.

- [ ] My Papers: skeleton → **entire** list at once; no lone newest row; no
      cascade. Same on a warm return (cached rows fade in as a group).
- [ ] Review Queue: same, with `needs_review` and with a filter change.
- [ ] Browse: list mode and grid mode; skeleton → full page at once; search
      results and filter changes also land as one batch.
- [ ] Activity → Notifications: skeleton → all cards at once.
- [ ] Activity → Invites: same; accept/decline still works and doesn't replay
      the fade.
- [ ] Student Dashboard Recent Activity: cards appear together.
- [ ] Faculty Dashboard Action Required: up-next card + notifications appear
      together, no `index + 1` delay.
- [ ] Pull-to-refresh does **not** replay the paint fade and does not stagger
      appended pages.
- [ ] Reduce Motion on: no fade; lists still paint fully.

### Device checklist — pager (needs the new dev build)

- [ ] Cold start boots (no missing `RNCPagerView`), tabs still render.
- [ ] Drag from Home → Papers → Browse → Profile: content follows the finger 1:1,
      release settles on the nearest page; first/last pages clamp without a blank
      page.
- [ ] Pill midpoint tracks the finger while dragging, then sits under the settled
      tab. Bar blur, tint, shadow, labels, and safe-area inset unchanged.
- [ ] Tap each tab: page animates, pill tracks, light haptic; tapping the active
      tab is harmless.
- [ ] Vertical list scrolling never pages. A horizontal drag that starts on a card
      or on body text pages. A mostly-vertical diagonal scrolls instead.
- [ ] Pull-to-refresh still wins the vertical gesture.
- [ ] Browse filter sheet: horizontal drags inside the sheet do not page; backdrop
      closes it; filter changes refetch and paint atomically.
- [ ] Submit FAB (My Papers): visible above the bar, opens SubmitResearch, slides
      away with its page.
- [ ] Detail pushes from every tab land on the stack, back returns to the same tab
      with scroll position intact.
- [ ] Activity bell pushes the stack screen over the bar; back returns to the tab.
- [ ] Faculty dashboard tiles still switch to Review with the intended filter
      (`needs_review`, `revisions`, `forwarded`, `approved`, `all`).
- [ ] Dark mode: swipe halfway — the revealed scene background matches the app
      surface (no white flash). Check both roles.
- [ ] Android hardware back from Papers/Browse/Profile → Home; from Home → app
      exits/backgrounds as before.
- [ ] Coachmarks (student, first run): bell anchors correctly; Browse-tab bubble
      still anchors to the bar. If the `submitFab` registration was restored,
      verify the FAB bubble too.
- [ ] Rotation/large screen: bar width changes and the pill re-measures without
      being stuck at the first tab.

### Perf sanity

- `[perf]` marks still fire (`list:papers:paint`, `list:queue`, Browse spans).
- No extra network calls at cold start from preloaded-but-unfocused screens
  beyond the intended adjacent preload. Check the existing `[perf]`/network logs.

---

## Commit plan

1. `refactor(lists): paint the first batch atomically` — Part 1 + the shared
   `AtomicListPaint`.
2. `fix(dashboard): use the nucleus mark as the hero watermark` — Part 2 +
   `SCREENS.md`.
3. `chore(deps): add pager-view and material top tabs` — install + lockfile only.
4. `refactor(nav): drive the floating tab bar from a native pager` — navigators,
   bar, types, `FacultyReview` param sync, uninstall bottom-tabs.
5. Optional: `fix(coachmarks): restore the submit FAB target`.

Each commit must pass the static gates. 1–2 are releasable without a native build;
4 is not.

## Risk register

| Risk | Likelihood | Mitigation |
| --- | --- | --- |
| Missing native module after JS reload | High if skipped | Rebuild dev client before launching; run `npx expo run:android` |
| Pill stays at x=0 on first frame | Low | Bar `onLayout` measures; indicator hidden until `tabWidth > 0` |
| Pill desync during fast swipes | Low | Native-driven interpolation from the pager's own `position`; no JS state |
| White flash mid-swipe in dark mode | High if `sceneStyle` omitted | Set themed `sceneStyle` in both navigators |
| Preloaded Review screen ignores dashboard filter | Certain without fix | `initialFilter` effect + clear param |
| Coachmark Browse target lost | Low | `useCoachmarkTarget` stays on `TabItem`; verify on device |
| `submitFab` coachmark stall | Already broken | Optional one-line ref restore in `MyPapersScreen` |
| Bottom-tabs imports left behind | Medium | `grep -r "@react-navigation/bottom-tabs" src` before uninstall |
| Peer conflict from native bump | Low | `npm ls @react-navigation/native @react-navigation/elements`; bottom-tabs/native-stack accept ^7.2.2 |
| Gesture conflict with sheet/FAB | Low | Sheets are presented above the pager; verify on device |
| Memory pressure from all mounted pages | Low | Four screens; watch low-end Android; do not disable `lazy` |

## Rollback

- Parts 1–2: revert their commits; JS-only, no native impact.
- Part 3: revert the nav commit, `npm install @react-navigation/bottom-tabs@^7.15.9`,
  and rebuild the dev client (the pager native module can remain installed
  harmlessly, or uninstall it and rebuild again).

## File index

| File | Change |
| --- | --- |
| `src/components/ui/motion/AtomicListPaint.tsx` | **new** group-fade wrapper |
| `src/components/ui/index.ts` | export it |
| `src/screens/main/MyPapersScreen.tsx` | remove stagger + old fade; wrap list |
| `src/screens/faculty/FacultyReviewScreen.tsx` | remove stagger + old fade; wrap list; `initialFilter` sync |
| `src/screens/main/BrowseScreen.tsx` | remove list stagger; wrap both modes |
| `src/components/NotificationsList.tsx` | remove stagger; wrap section list |
| `src/components/InvitationsList.tsx` | remove stagger; wrap list |
| `src/screens/main/DashboardScreen.tsx` | remove Recent Activity stagger |
| `src/screens/faculty/FacultyDashboardScreen.tsx` | remove Recent Activity stagger |
| `src/components/ui/DashboardHero.tsx` | nucleus-mark watermark |
| `docs/design/SCREENS.md` | watermark description |
| `src/navigation/AppNavigator.tsx` | material top tabs (student) |
| `src/navigation/FacultyTabs.tsx` | material top tabs (faculty) |
| `src/navigation/FloatingTabBar.tsx` | position-driven pill, `jumpTo`, props |
| `src/navigation/StudentTabBar.tsx` | `MaterialTopTabBarProps` |
| `src/navigation/FacultyTabBar.tsx` | `MaterialTopTabBarProps` |
| `src/navigation/types.ts` | `MaterialTopTabNavigationProp` |
| `package.json` / `package-lock.json` | +pager-view, +mtt, native bump, −bottom-tabs |

## Reference (API facts checked for this plan)

- mtt 7.8.1 `MaterialTopTabBarProps` = `{ state, navigation, descriptors, layout,
  position, jumpTo }`; `position` is `Animated.AnimatedInterpolation<number>`.
- mtt's `MaterialTopTabNavigationConfig` accepts `tabBar`, `tabBarPosition`,
  `initialLayout`, `pagerStyle`, `overScrollMode`; it **omits** `swipeEnabled`,
  `lazy`, `lazyPreloadDistance`, `sceneStyle` — those live in
  `MaterialTopTabNavigationOptions` (screen options).
- `react-native-tab-view` 4.3.4: `Pager.ios.js` / `Pager.android.js` export
  `PagerViewAdapter`; `Pager.js` (web) exports `PanResponderAdapter`.
  `PagerViewAdapter` builds `position = Animated.add(position, offset)` and drives
  it through `Animated.event(..., { useNativeDriver: Platform.OS !== 'web' })`.
- `TabView` with `tabBarPosition: 'bottom'` renders the tab bar as the last child
  of the flex container, after the pager; an absolutely positioned bar overlays
  the pager.
- `sceneStyle` is read per route from `options[route.key]`, so a `screenOptions`
  value applies to every scene.
- pager-view version matrix: `https://api.expo.dev/v2/sdks/56.0.0/native-modules`
  → `react-native-pager-view 8.0.1`.
