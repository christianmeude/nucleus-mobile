# Navigation & Interaction Polish Plan

> **Status**: Approved — ready for implementation  
> **Created**: 2025-10-25  
> **Conversation**: `e48f79ef-cca9-40ff-b3d4-92c5d7b520ff`

---

## Parallelization Guide

This plan has **four independent streams**. Streams 1, 2, 3, and 4 touch different files and can run as **parallel subagents** with one exception: Streams 1, 3B, and 3C all modify `AppNavigator.tsx`, so they should be handled by the **same subagent** or merged into a single edit pass.

### Recommended subagent split

| Subagent | Streams | Files touched | Depends on |
|----------|---------|---------------|------------|
| **Agent A** — Quick fixes + gesture config | 1, 2, 3B, 3C | `AppNavigator.tsx`, `ProfileHeader.tsx` | None |
| **Agent B** — Tab bar refactor | 3A | `FloatingTabBar.tsx` | None |
| **Agent C** — Dark mode reveal | 4 | `ThemeTransitionOverlay.tsx` (new), `ThemeContext.tsx`, `SettingsRow.tsx`, `ProfileScreen.tsx`, `App.tsx`, `package.json` | Package install first (`react-native-view-shot`, `@react-native-masked-view/masked-view`) |

Agents A, B, and C can run **simultaneously**. Agent C should install packages before editing files.

---

## Stream 1 — Fix ResearchDetail scroll vs swipe-to-dismiss

**Problem**: `gestureResponseDistance` is set to full screen width in `src/navigation/AppNavigator.tsx` L190, making the swipe-to-go-back gesture fight with `ScrollView` content.

**Fix** (single line):

| File | Change |
|------|--------|
| `src/navigation/AppNavigator.tsx` L190 | Change `gestureResponseDistance: Dimensions.get('window').width` → `gestureResponseDistance: 35` |

This restores standard iOS-like edge-swipe (35pt from left) across **all** stack screens.

---

## Stream 2 — Remove static "N" watermark from Profile banner

**Problem**: `src/components/ui/ProfileHeader.tsx` L31 renders `<Text style={styles.watermark}>N</Text>` inside the navy banner.

**Fix**:

| File | Change |
|------|--------|
| `src/components/ui/ProfileHeader.tsx` | Delete `<Text style={styles.watermark}>N</Text>` (L31) and the `watermark` style definition (L55–L66) |

---

## Stream 3 — Tab bar pill tracking & swipe tuning

### 3A — Native-threaded pill + color tracking (Agent B)

**Problem**: The pill uses RN `Animated.View` + `position.interpolate()` (native-threaded), but tab icon/label color snaps discretely on JS-thread `state.index` change, causing lag and frame drops during swipe.

**Strategy**: Dual-layer tab rendering. Each tab renders both its active and inactive state overlaid, with opacity driven by `position.interpolate()` on the native thread.

| File | Change |
|------|--------|
| `src/navigation/FloatingTabBar.tsx` | Major refactor of `TabItem` and color system |

**Implementation detail**:

```
TabItem receives:
  - meta (icon + label) — static
  - position (Animated.Value from pager) — native-driven  
  - index (this tab's index) — static
  - routeCount — static

Each TabItem renders TWO overlaid icon+label pairs:
  - Inactive layer: opacity = 1 - interpolatedActivity
  - Active layer:   opacity = interpolatedActivity

Where interpolatedActivity = position.interpolate({
  inputRange:  [index - 1, index, index + 1],
  outputRange: [0,         1,     0],
  extrapolate: 'clamp',
})

For index === 0, clamp inputRange start to 0:
  inputRange:  [0, 0, 1]
  outputRange: [1, 1, 0]  (active when at index 0, inactive when swiped to 1)

Result: icon and label colors smoothly crossfade during swipe,
driven entirely on native thread. No JS re-renders during gesture.
```

Additional optimizations:
- Wrap `TabItem` in `React.memo` — props are now all stable (no `focused` boolean changing)
- Remove `state.index` dependency from tab rendering loop for visual updates
- Keep `state.index` only for `accessibilityState.selected`
- Stabilize `onTabPress` with `useCallback`

### 3B — Tab pager swipe tuning (Agent A)

| File | Change |
|------|--------|
| `src/navigation/AppNavigator.tsx` L44–L61 | Add pager tuning to `Tabs.Navigator` screenOptions |

Add tuning props to make page swipes feel lighter and more responsive. Adjust velocity thresholds if `material-top-tabs` v7.8 supports it via `screenOptions`.

### 3C — Stack back-gesture tuning (Agent A)

| File | Change |
|------|--------|
| `src/navigation/AppNavigator.tsx` L169–L193 | Tune stack navigator gesture config |

```tsx
screenOptions={{
  // ... existing options ...
  gestureResponseDistance: 35,        // Stream 1
  // Smoother back-gesture spring
  transitionSpec: {
    open: {
      animation: 'spring',
      config: {
        stiffness: 1000,
        damping: 500,
        mass: 3,
        overshootClamping: true,
        restDisplacementThreshold: 10,
        restSpeedThreshold: 10,
      },
    },
    close: {
      animation: 'spring',
      config: {
        stiffness: 1000,
        damping: 500,
        mass: 3,
        overshootClamping: true,
        restDisplacementThreshold: 10,
        restSpeedThreshold: 10,
      },
    },
  },
  // How much velocity factors into gesture completion. Default 0.3.
  // Higher = more velocity-responsive (lighter feel).
  gestureVelocityImpact: 0.5,
}}
```

Values should be tuned to feel iOS-native: responsive on flick, weighted on slow drag.

---

## Stream 4 — Smooth ease crossfade dark mode toggle

**Pivot / Decision**: The circular reveal / anime.js wave was dropped per user feedback in favor of a clean, silky smooth ease crossfade using native Reanimated, avoiding uncompiled native dependencies and artificial DOM hacks.

### Architecture

1. **ThemeTransitionOverlay**: Positioned fullscreen (`StyleSheet.absoluteFillObject`, `pointerEvents="none"`).
2. When the theme preference is toggled:
   - React updates the theme colors underneath.
   - `ThemeTransitionOverlay` detects the scheme change and renders the previous scheme's surface color (`#F1F4FA` for light, `#0A1226` for dark).
   - In `useLayoutEffect`, the overlay eases its opacity from `0.85` down to `0` over `350ms` using `Easing.bezier(0.25, 0.1, 0.25, 1)`.
   - The user experiences a silky smooth ease dissolve between light and dark modes with zero jank or flash.
3. **SettingsRow toggle tuning**:
   - `ReanimatedToggle` animates both its thumb offset (`16pt`) and its track background color via `interpolateColor` with `Easing.bezier(0.25, 0.1, 0.25, 1)` over `250ms`.
   - The full row is tappable to toggle dark mode, triggering `Haptics.selectionAsync()`.
4. **Reduced-motion users**: Instant swap, no animation (`useReduceMotion()`).

### Files

| File | Change |
|------|--------|
| `src/components/ui/ThemeTransitionOverlay.tsx` | Full-screen smooth ease dissolve overlay |
| `src/components/ui/SettingsRow.tsx` | Reanimated toggle with interpolated track color + full-row tap affordance |
| `App.tsx` | Mount `ThemeTransitionOverlay` at the root sibling |
| `src/components/ui/index.ts` | Export `ThemeTransitionOverlay` |

---

## Files touched — full map

| File | Agent | Streams |
|------|-------|---------|
| `src/navigation/AppNavigator.tsx` | A | 1, 3B, 3C |
| `src/components/ui/ProfileHeader.tsx` | A | 2 |
| `src/navigation/FloatingTabBar.tsx` | B | 3A |
| `src/components/ui/ThemeTransitionOverlay.tsx` (new) | C | 4 |
| `src/context/ThemeContext.tsx` | C | 4 |
| `src/components/ui/SettingsRow.tsx` | C | 4 |
| `src/screens/main/ProfileScreen.tsx` | C | 4 |
| `App.tsx` | C | 4 |
| `package.json` | C | 4 |
