# NUcleus Mobile — Screen Composition & Motion

These composition specs were originally documented alongside tokens. They have been extracted here for better separation of concerns, keeping the core `DESIGN.md` strictly focused on primitives (tokens, colors, typography, shapes).

## Motion

Motion is a spec, not a vibe — port the curve and duration exactly. All values below have no external dependency beyond `react-native-reanimated` (already in the app), so they ship as-is.

- **Signature: the sliding selection pill (nav bar).** A `primary-surface` rounded rect sits _behind_ the tab row (`z-index 0`) and animates its `left`/`width` to the active tab. The curve is a spring overshoot — **`cubic-bezier(.34, 1.3, .4, 1)` over 420ms**, expressed in Reanimated as `withTiming(target, { duration: 420, easing: Easing.bezier(.34, 1.3, .4, 1) })`. The moving pill carries _all_ the motion: the active icon + label just recolor to `primary`, **no icon scale**. This replaces any static active-dot.
- **Press feedback.** FAB and tab presses use a light haptic (`expo-haptics` selection/impact-light) plus a scale-down on the FAB (`:active` → `scale .9`). Every tappable element gives visual feedback within ~100ms.
- **Screen-enter.** New screens fade in with an 8px upward rise over ~320ms.
- **Sheet presentation (iOS card).** A full-screen sheet (e.g. the paper viewer behind "View Full Paper") slides up from the bottom while the presenting screen **scales down to `0.92` and rounds its corners to `14`** behind a dim scrim — the native-iOS modal card zoom-out. Implemented in `SheetPresenter` with one shared progress value: **open is a spring, `withSpring(1, { damping: 22, stiffness: 240, mass: 0.9 })`**; **close is a `260ms` timed collapse**, `withTiming(0, { duration: 260 })`. Drag the grabber down past ~28% of the sheet height (or flick, `velocityY > 900`) to dismiss. Scrim tops out at `0.45` black; the presenter also dims `0.35`. Under reduced motion the sheet snaps open/closed with no scale, slide, or scrim fade. **The zoom-out, dim, and scrim track the sheet's live top — the open/close spring _and_ any active drag — not `progress` alone.** A `reveal` (1 fully up → 0 hidden) is derived each frame from the sheet's current top and drives all three, so dragging the sheet down _pans the presenter back in and lightens the scrim smoothly in proportion to the sheet's height_, rather than holding the full zoom until release.
- **Bottom sheets (menus & pickers).** Short sheets (Browse sort/field, etc.) use `BottomSheet`, which drives **both** the slide and the backdrop dim off one shared progress (open `spring.sheet`, close `240ms` timed) so **the dim fades in lock-step with the sheet's height instead of snapping to full opacity when the modal mounts**. Same drag-to-dismiss (grabber, ~30% / `velocityY > 900`); the dim lightens as the sheet is pulled away. Reduced motion → instant, no fade.
- **Confirming pop.** A save/bookmark toggling _on_ gives a quick scale overshoot on the icon — `withSequence(withTiming(1.32, 120ms), withSpring(1, spring.pop))` (`spring.pop` = low-damping overshoot). Only on the affirmative action (not un-saving), and a no-op under reduced motion.
- **Focus ring.** `border-focus` (navy `#2E5BC9`), 2px, 2px offset.
- **Reduced motion.** Mirror `prefers-reduced-motion` via Reanimated's `useReducedMotion()` — kill every animation and transition (the pill jumps to the active tab with no slide, screens appear without the rise).

## Screens (A-pillar redesign)

Screen-composition specs ported from the redesign mockup, reconciled to the tokens. Where a surface is larger than the `shape` scale tops out at (`xl` 18), a bespoke radius is called out — floating navigation and hero banners are the only surfaces allowed past the token scale.

### Navigation bar (A1)

A floating, detached bar — four tabs evenly spaced. Labels: **Home · Papers · Browse · Profile**, laid out `[Home] [Papers] [Browse] [Profile]`.
(Note: The Submit action has been moved to the MyPapers screen to reduce global cognitive load).

- **Bar:** `position: absolute`, `left/right: 16`, `bottom: 14`, `height: 66`, radius **26** (bespoke, past `xl`), `borderCurve: 'continuous'`, `border-subtle` hairline. Shadow `0 14px 34px -14px rgba(11,27,71,.6)`.
- **Selection pill:** `primary-surface` fill, `top: 9`, `height: 48`, radius 16, behind the tabs. Animated per **Motion** above.

#### Faculty tabs

The faculty navigator uses the **same** floating bar. There is one shared `FloatingTabBar` primitive; `StudentTabBar` and `FacultyTabBar` are thin configs over it. Faculty differ only in:

- **No Submit FAB** (faculty don't submit). Four tabs fill the bar evenly — `[Home] [Review] [Browse] [Profile]`, no center gap.
- **Review** takes the student's _Papers_ slot. **Browse** is exactly the shared repository screen both roles use.

### Dashboard (A3)

Task-first Home — a focused view of papers requiring action and recent notifications.

- **Navy hero header:** `linear-gradient(158deg, primary, primary-hover)`, bottom radius 28 (bespoke). **Student Home shows only greeting + name + status line**. Faint radial gold glow; a giant translucent "N" watermark bottom-right (`rgba(255,255,255,.05)`). Right side: **profile avatar, then the bell**.
- **No Submit CTA.** Submitting is handled in the My Papers screen.
- **Up Next (Action Center):** A single standard paper card showing the highest priority submission needing revision or currently in review.
- **Recent Activity:** A section list of notifications.
- **Fallback Discovery:** When the "Up Next" queue is empty, a lightweight "Trending" or "Recommended" horizontal rail appears to prevent a dead-end empty state.

### Browse (A2)

- **Search bar is the shared field** — identical to My Papers': `surface-sunken` fill, hairline `border-subtle`, radius `md`, `borderCurve: 'continuous'`, search glyph + input + a "Clear" chip.
- **Recent searches** as `primary-surface` chips and a **Popular searches** row.
- **Filtering & sorting live in the results toolbar** — two dropdown links, `All fields ▾` and `Year ▾`, each opening a bottom sheet. Sorting behavior is implicit (newest/relevance).

### Profile (A3)

- **Navy banner** `height: 120`, bottom radius 26 (bespoke), mono "N" watermark.
- Gold avatar squircle (`82×82`, radius 24, `borderCurve: 'continuous'`) overlapping the banner.
- Name, then **program**, then **department** beneath it — centered.
- Settings rows with `primary-surface` icon tiles: **Recovery email**, **Password**, **Dark mode** (navy toggle), **Sign out**.

### First-run (A4)

Carousel built entirely from `lucide-react-native` inside token-styled tiles. Four slides, one swipeable `FlatList`, full-bleed `surface-base` background.

- **Pagination:** dot row below the copy block, `sm` gap — active dot `primary` fill `8px`, inactive `border-subtle` fill `6px`, animated width/opacity cross-fade.
- **Controls:** `Skip` as plain `label`-style text top-right. Bottom: pill `button-primary` reading "Next" on slides 1–3, becoming "Get Started" on slide 4.

#### Coachmarks (first-time nav, post-onboarding)

- **Bubble:** `primary` fill, `text-on-brand` `body-small` text, radius `md`, 6px triangle pointer aimed at the target control, `level2` shadow.
- **Targets:** Notification bell -> Submit FAB -> Browse tab.
