# NUcleus Mobile — Screen Composition & Motion

These composition specs were originally documented alongside tokens. They have been extracted here for better separation of concerns, keeping the core `DESIGN.md` strictly focused on primitives (tokens, colors, typography, shapes).

## Motion

Motion is a spec, not a vibe — port the curve and duration exactly. In-screen values below are built on `react-native-reanimated`; the pushed-screen card transition is provided by the navigation stack. Both are already in the app.

- **Signature: the pager-driven selection pill (nav bar).** A `primary-surface` rounded rect sits _behind_ the tab row (`z-index 0`). It has no timing animation and no overshoot: its `translateX` interpolates the pager's own `position` node across the tab indexes, so it tracks the finger 1:1 during a swipe and settles with the page animation on tap. The moving pill carries _all_ the motion: the active icon + label just recolor to `primary`, **no icon scale**. This replaces any static active-dot.
- **Press feedback.** FAB and tab presses use a light haptic (`expo-haptics` selection/impact-light) plus a scale-down on the FAB (`:active` → `scale .9`). Every tappable element gives visual feedback within ~100ms.
- **Pushed-screen enter.** Stack screens (`ResearchDetail`, `Activity`, `SubmitResearch`, `FacultyReviewDetail`, `FacultyPaperDetail`) use the iOS card transition: the new card slides in from the right over the tab screen, the underlying screen parallaxes and dims, and the card can be dragged right anywhere on its surface to dismiss interactively. Android and iOS share the behavior (JS `@react-navigation/stack` with `forHorizontalIOS`).
- **In-screen content enter.** Content that mounts inside a screen still fades in with an 8px upward rise over ~320ms (`FadeInView` / `ListEntranceItem`).
- **Sheet presentation.** A sheet (the paper viewer behind "View Full Paper", or a short form such as Formal publication) slides up from the bottom over a dim scrim. **The presenting screen does not move or zoom out** — a `0.92` scaled presenter was tried and dropped (2026-10-21): it exposed the root's black background around the scaled card and clipped the bottom of the tab bar mid-animation. Implemented in `SheetPresenter` with one shared progress value: **open is a spring, `withSpring(1, { damping: 22, stiffness: 240, mass: 0.9 })`**; **close is a `260ms` timed collapse**, `withTiming(0, { duration: 260 })`. Drag the grabber down past ~28% of the sheet height (or flick, `velocityY > 900`) to dismiss. Scrim tops out at `0.45` black over the whole screen. Under reduced motion the sheet snaps open/closed with no slide or scrim fade. **The scrim tracks the sheet's live top — the open/close spring _and_ any active drag — not `progress` alone.** A `reveal` (1 fully up → 0 hidden) is derived each frame from the sheet's current top and drives it, so dragging the sheet down _lightens the scrim smoothly in proportion to the sheet's height_, rather than holding the full dim until release. Two sizes: `size="full"` (default) fills the screen from the safe-area top — the paper viewer; `size="content"` hugs its content, bottom-anchored and capped at the screen height — short forms such as Formal publication. The scrim and sheet live in a React Native `Modal`, so they paint **above the tab bar** (an in-tree overlay sits under it) and block tab taps while open.
- **Bottom sheets (menus & pickers).** Short sheets (Browse sort/field, etc.) use `BottomSheet`, which drives **both** the slide and the backdrop dim off one shared progress (open `spring.sheet`, close `240ms` timed) so **the dim fades in lock-step with the sheet's height instead of snapping to full opacity when the modal mounts**. Same drag-to-dismiss (grabber, ~30% / `velocityY > 900`); the dim lightens as the sheet is pulled away. Reduced motion → instant, no fade.
- **Confirming pop.** A save/bookmark toggling _on_ gives a quick scale overshoot on the icon — `withSequence(withTiming(1.32, 120ms), withSpring(1, spring.pop))` (`spring.pop` = low-damping overshoot). Only on the affirmative action (not un-saving), and a no-op under reduced motion.
- **Focus ring.** `border-focus` (navy `#2E5BC9`), 2px, 2px offset.
- **Reduced motion.** Mirror `prefers-reduced-motion` via Reanimated's `useReducedMotion()` — kill entrance, sheet, press, and list-paint motion (the pill still tracks the pager because it is direct manipulation; list batches appear without the fade).

## Screens (A-pillar redesign)

Screen-composition specs ported from the redesign mockup, reconciled to the tokens. Where a surface is larger than the `shape` scale tops out at (`xl` 18), a bespoke radius is called out — floating navigation and hero banners are the only surfaces allowed past the token scale.

### Navigation bar (A1)

A floating, detached bar — four tabs evenly spaced. Labels: **Home · Papers · Browse · Profile**, laid out `[Home] [Papers] [Browse] [Profile]`.
(Note: The Submit action has been moved to the MyPapers screen to reduce global cognitive load).

- **Bar:** `position: absolute`, `left/right: 16`, `bottom: 14`, `height: 66`, radius **26** (bespoke, past `xl`), `borderCurve: 'continuous'`, `border-subtle` hairline. Shadow `0 14px 34px -14px rgba(11,27,71,.6)`.
- **Selection pill:** `primary-surface` fill, `top: 9`, `height: 48`, radius 16, behind the tabs. Driven by the pager per **Motion** above.
- **Activity bell:** the Dashboard hero is the **only** header with the bell, for both roles. Papers, Browse, Review, and Activity do not show one. The bell opens the pushed Activity screen; Activity also has a back affordance and a **static** header (its title does not collapse on scroll).

#### Faculty tabs

The faculty navigator uses the **same** floating bar. There is one shared `FloatingTabBar` primitive; `StudentTabBar` and `FacultyTabBar` are thin configs over it. Faculty differ only in:

- **No Submit FAB** (faculty don't submit). Four tabs fill the bar evenly — `[Home] [Review] [Browse] [Profile]`, no center gap.
- **Review** takes the student's _Papers_ slot. **Browse** is exactly the shared repository screen both roles use.

### Floating action bar (shared)

The one treatment for a screen's single primary action when it must stay reachable while content scrolls — the reader's **View Full Paper**, and (later) the submit flow's step controls. Built as the `FloatingActionBar` primitive.

- **Bar:** `position: absolute`, `left/right: 16`, `bottom: safe-area + 12` — no background, no hairline. A bare positioning wrapper.
- **Action:** one `lg` button (56pt) carrying the `tinted primary` shadow — the same shadow as the nav bar, so a lifted CTA belongs to the nav's elevation family rather than reading as a one-off. A two-action bar (the submit steps) uses `row`: forward action `flex: 2`, secondary `flex: 1`, and only the forward action is lifted.
- **Mount:** a sibling of the scrolling content, never inside it, so the offset is measured against the screen.
- **Never:** a full-width footer slab (`border-top` hairline + raised fill) with a flat pill inside. That is the pattern this primitive exists to replace.

### Dashboard (A3)

Task-first Home — a focused view of papers requiring action and recent notifications.

- **Navy hero header:** `linear-gradient(158deg, primary, primary-hover)`, bottom radius 28 (bespoke). **Student Home shows only greeting + name + status line**. Faint radial gold glow; the nucleus mark silhouette bottom-right (`rgba(255,255,255,.08)`, `tintColor` white). Right side: **profile avatar, then the bell** — the bell is the only header affordance besides the avatar and the only bell in the app (both roles).
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
