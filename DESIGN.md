---
name: NUcleus
description: Design system for NUcleus Mobile, the research repository app for National University Dasmariñas students.
colors:
  primary: "#1B3A8C"
  primary-hover: "#16307A"
  primary-pressed: "#102560"
  primary-soft: "#D2DEF5"
  primary-surface: "#EAF0FB"
  accent: "#CDA434"
  accent-hover: "#AE8829"
  accent-soft: "#F4E7BD"
  accent-surface: "#FBF6E8"
  text-primary: "#0F172A"
  text-secondary: "#475569"
  text-muted: "#64748B"
  text-disabled: "#94A3B8"
  text-on-brand: "#FFFFFF"
  text-on-accent: "#0F172A"
  surface-base: "#F8FAFC"
  surface-raised: "#FFFFFF"
  surface-sunken: "#F1F5F9"
  border-subtle: "#E2E8F0"
  border-strong: "#CBD5E1"
  border-focus: "#2E5BC9"
  success: "#047857"
  warning: "#D97706"
  danger: "#B91C1C"
typography:
  display:
    fontFamily: Roboto
    fontSize: 28px
    lineHeight: 36px
    fontWeight: 600
    letterSpacing: 0.15px
  h1:
    fontFamily: Roboto
    fontSize: 24px
    lineHeight: 32px
    fontWeight: 700
  h2:
    fontFamily: Roboto
    fontSize: 20px
    lineHeight: 28px
    fontWeight: 700
  h3:
    fontFamily: Roboto
    fontSize: 17px
    lineHeight: 24px
    fontWeight: 600
  body-strong:
    fontFamily: Roboto
    fontSize: 15px
    lineHeight: 22px
    fontWeight: 600
  body:
    fontFamily: Roboto
    fontSize: 15px
    lineHeight: 22px
    fontWeight: 400
  body-small:
    fontFamily: Roboto
    fontSize: 13px
    lineHeight: 20px
    fontWeight: 400
  label:
    fontFamily: Roboto
    fontSize: 13px
    lineHeight: 18px
    fontWeight: 600
    letterSpacing: 0.1px
  metadata:
    fontFamily: Roboto
    fontSize: 12px
    lineHeight: 18px
    fontWeight: 500
    letterSpacing: 0.1px
  caption:
    fontFamily: Roboto
    fontSize: 11px
    lineHeight: 16px
    fontWeight: 400
    letterSpacing: 0.2px
  button:
    fontFamily: Roboto
    fontSize: 15px
    lineHeight: 20px
    fontWeight: 600
    letterSpacing: 0.2px
rounded:
  sm: 8px
  md: 10px
  lg: 14px
  xl: 18px
  pill: 999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 40px
components:
  card:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  card-border:
    borderColor: "{colors.border-subtle}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-on-brand}"
    rounded: "{rounded.pill}"
    padding: 12px 24px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-primary-pressed:
    backgroundColor: "{colors.primary-pressed}"
  chip:
    backgroundColor: "{colors.accent-surface}"
    textColor: "{colors.accent-hover}"
    rounded: "{rounded.sm}"
  avatar:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.text-on-brand}"
    rounded: "{rounded.pill}"
---

> **Single source of truth for the NUcleus design system — tokens, motion, and
> screen composition.** Authoritative, and matches the live tokens in
> `src/theme/`. This file absorbed the former `docs/design/VISUAL_DIRECTION.md`
> (the A-pillar redesign look + motion): the **Motion** and **Screens** sections
> below are ported from it and reconciled to the tokens here. Where the two ever
> disagreed, this file wins — every divergent hex in the old file was aspirational
> and never adopted into the tokens. `docs/design/mockup.html` remains the literal
> visual reference to eyeball against; build to the values in *this* file.

## Overview

NUcleus Mobile is a research repository for National University Dasmariñas
students — browsing, reading, and submitting papers is the whole job of the
app. The direction is **Modern Clarity**: a clean, sans-only system built for
long reading sessions on a phone screen, calibrated against Material 3's
type-scale and shape conventions rather than a bespoke scale.

**Roboto is the single app-wide typeface** — every role, from headings
(`display`, `h1`–`h3`) through body copy, chrome, labels, metadata, and
buttons. It's also Material 3's own default typeface, so the UI layer reads
as neutral and platform-native rather than stylized. Visual hierarchy comes
from size, weight, and letter-spacing per token, not from a second family:
heading sizes are pinned to Material 3 Headline/Title roles, not inflated
past them.

Brand color is navy-and-gold, drawn from the NUcleus wordmark: navy for
primary actions, navigation, and links; gold reserved for emphasis (status
chips, category eyebrows, save/bookmark state) and never used decoratively.

## Colors

- **Primary (`#1B3A8C`)** — brand navy. Primary buttons, active nav state,
  links, focus rings. `primary-hover` / `primary-pressed` step down in
  lightness for interaction states; `primary-soft` / `primary-surface` are
  tint backgrounds for badges and selected rows.
- **Accent (`#CDA434`)** — brand gold (a true metallic gold; retuned 2026-07-08
  from the prior marigold `#F5A623`, which read as a strong yellow). Reserved for
  emphasis: status chips, category eyebrows, the bookmark/save affordance, and
  the Submit FAB. Never used for large fills or decoration — gold that appears
  everywhere stops meaning anything.
- **Text** — `text-primary` (`#0F172A`) for headings and primary reading
  text, `text-secondary` (`#475569`) for supporting copy, `text-muted`
  (`#64748B`) for metadata and captions, `text-disabled` (`#94A3B8`) for
  inactive state. `text-on-brand` / `text-on-accent` are the fixed
  foregrounds for navy/gold fills.
- **Surface** — `surface-base` (`#F8FAFC`) is the screen background,
  `surface-raised` (`#FFFFFF`) is every card, `surface-sunken` (`#F1F5F9`)
  is recessed areas (search fields, skeleton loaders).
- **Border** — `border-subtle` for card and divider hairlines,
  `border-strong` for higher-contrast dividers, `border-focus` for the
  keyboard-focus ring.
- **State** — success/warning/danger map to paper workflow status (approved,
  revision required, rejected) and always pair with their `*-surface` tint
  for the pill background, never a solid fill on body text.

## Typography

Heading sizes are calibrated against **Material 3 type-scale roles**, not
sized up arbitrarily:

| Token | Family | Size / Line height | Weight | M3 role reference | Use |
| --- | --- | --- | --- | --- | --- |
| `display` | Roboto | 28 / 36 | 600 | Headline Medium | Paper detail title |
| `h1` | Roboto | 24 / 32 | 700 | Headline Small | Screen titles ("Browse"), dashboard greeting |
| `h2` | Roboto | 20 / 28 | 700 | Title Large | Section headers, stat callouts |
| `h3` | Roboto | 17 / 24 | 600 | Title Medium | Card titles (paper cards, tiles), nav bar titles |
| `body-strong` | Roboto | 15 / 22 | 600 | Body Large | Emphasized body copy |
| `body` | Roboto | 15 / 22 | 400 | Body Large | Default reading copy |
| `body-small` | Roboto | 13 / 20 | 400 | Body Medium | Secondary copy, affiliations |
| `label` | Roboto | 13 / 18 | 600 | Label Large | Filter/tab labels (uppercase, tracked) |
| `metadata` | Roboto | 12 / 18 | 500 | Label Medium | Dates, view/download counts |
| `caption` | Roboto | 11 / 16 | 400 | Label Small | Fine print, avatar initials |
| `button` | Roboto | 15 / 20 | 600 | Label Large | Button and CTA labels |

Every token is Roboto — there is no second family, so there is no chrome-vs-
heading family rule to enforce. Hierarchy is carried entirely by size,
weight, and letter-spacing.

Body/UI sizes are untouched from the previous system — only the family on
the heading roles (`display`, `h1`–`h3`) changed, from Montserrat to Roboto;
sizes stay pinned to the nearest M3 Headline/Title role as before.

## Layout

Spacing follows an 8-point grid (with a 4px half-step for tight groupings):
`4 · 8 · 12 · 16 · 24 · 32 · 40`. Card padding is `lg` (16px) — Material 3's
own card examples use the same 16px content padding, so this stays as-is
rather than being inflated for its own sake. Two rules govern how spacing is
applied:

1. **Related elements sit closer than unrelated ones.** Inside a card,
   related fields (title → author → status) use `sm`–`md` gaps.
2. Screen edge margins are `lg` (16px) on primary content screens. Tap
   targets are never smaller than 44×44pt, per platform convention,
   regardless of the visual size of the icon inside them.

## Elevation & Depth

Elevation is soft and used sparingly — cards separate from the background
mainly through a `border-subtle` hairline, with shadow reserved for cards
that need to read as "above" other content (Material 3's own guidance:
elevation is communicated primarily through surface tone, shadow is the
exception, not the default):

- `level0` — flat, no shadow. Default resting state during list-entrance
  animation.
- `level1` — `0 1px 3px rgba(0,0,0,0.06)`, elevation 1. Tiles and secondary
  cards.
- `level2` — `0 4px 12px rgba(0,0,0,0.1)`, elevation 4. Primary paper cards
  once settled (post entrance-animation).

## Shapes

Corner radius scales with the size of the element it's applied to, not used
decoratively — the scale sits close to Material 3's own shape tokens
(extra-small 4 / small 8 / medium 12 / large 16):

- `sm` (8px) — chips, small tags. (M3 extra-small/small)
- `md` (10px) — inputs, icon buttons, small placeholders. (M3 small)
- `lg` (14px) — the default for every card (paper cards, tiles, invitations,
  notifications). (M3 medium, the token M3 itself assigns to cards)
- `xl` (18px) — larger surfaces, hero banners. (M3 large)
- `pill` (999px) — avatars, buttons, badges, filter chips — anything meant
  to read as a fully-rounded control.

Every card-shaped `View`/`Pressable` sets `borderCurve: 'continuous'` for
the iOS squircle corner treatment — this was inconsistently applied before
this pass (`ResearchCard`, `ResearchTile`, and the shared `Card` primitive
were missing it while `MyPaperCard`/`InvitationCard`/`NotificationCard`
already had it) and is now uniform.

## Components

- **Card** — `surface-raised` fill, `border-subtle` hairline, `lg` radius,
  `lg` padding, continuous corner curve. The one shared primitive
  (`components/ui/Card.tsx`) behind every paper card, tile, and list row in
  the app — change it once, every screen inherits it.
- **Button (primary)** — `primary` fill, `text-on-brand` label in the
  `button` style, pill radius. Hover/pressed states step to
  `primary-hover` / `primary-pressed`. Disabled uses `border-subtle` fill
  with `text-disabled` label.
- **Chip / status pill** — tint-surface background (e.g. `accent-surface`,
  `state.success-surface`) with the matching saturated color as text,
  `sm` radius, never a solid fill behind body-length text.
- **Avatar** — initials in `caption` weight on a `primary` fill, pill
  radius. Falls back to initials before any generic icon.
- **Category eyebrow** — `label`-style, uppercase, `accent` color, always
  above a title, never used standalone.

## Do's and Don'ts

- **Do** use Roboto everywhere — headings, chrome, buttons, chips. **Don't**
  introduce a second family; hierarchy comes from size and weight, not typeface.
- **Do** check a heading size against the nearest Material 3 Headline/Title
  role before changing it. **Don't** size up a heading just because it "could
  be bigger" — if the scale needs to change, change the role mapping
  deliberately and update this doc, not one screen at a time.
- **Do** reserve gold for emphasis (status, save state, category eyebrow).
  **Don't** use gold as a fill color for large surfaces or decoration.
- **Do** set `borderCurve: 'continuous'` on every new card-shaped surface.
  **Don't** ship a rounded corner without it — the mismatch between plain
  and continuous corners is visible side by side.
- **Not yet implemented:** a dark theme. Every screen ships light-only
  today; if dark mode is scoped as a future undertaking, it should extend
  `theme/colors.ts` with a parallel token set rather than hardcoding
  per-screen overrides. (`theme/colors.ts` already carries a `dark` scheme
  behind the off `darkMode` flag; the flip is gated on a `SubmitResearch`
  dark pass.)

## Motion

Motion is a spec, not a vibe — port the curve and duration exactly. All values
below have no external dependency beyond `react-native-reanimated` (already in
the app), so they ship as-is.

- **Signature: the sliding selection pill (nav bar).** A `primary-surface`
  rounded rect sits *behind* the tab row (`z-index 0`) and animates its
  `left`/`width` to the active tab. The curve is a spring overshoot —
  **`cubic-bezier(.34, 1.3, .4, 1)` over 420ms**, expressed in Reanimated as
  `withTiming(target, { duration: 420, easing: Easing.bezier(.34, 1.3, .4, 1) })`.
  The moving pill carries *all* the motion: the active icon + label just recolor
  to `primary`, **no icon scale**. This replaces any static active-dot.
- **Press feedback.** FAB and tab presses use a light haptic
  (`expo-haptics` selection/impact-light) plus a scale-down on the FAB
  (`:active` → `scale .9`). Every tappable element gives visual feedback within
  ~100ms.
- **Screen-enter.** New screens fade in with an 8px upward rise over ~320ms.
- **Focus ring.** `border-focus` (navy `#2E5BC9`), 2px, 2px offset. *(The old
  visual-direction doc specified a gold focus ring; `border-focus` supersedes
  it, since focus is navigation state, not emphasis — gold stays reserved.)*
- **Reduced motion.** Mirror `prefers-reduced-motion` via Reanimated's
  `useReducedMotion()` — kill every animation and transition (the pill jumps to
  the active tab with no slide, screens appear without the rise).

## Screens (A-pillar redesign)

Screen-composition specs ported from the redesign mockup, reconciled to the
tokens above. Where a surface is larger than the `shape` scale tops out at
(`xl` 18), a bespoke radius is called out — floating navigation and hero banners
are the only surfaces allowed past the token scale. Likewise the floating bar
and FAB carry bespoke drop shadows heavier than `level2`, because they float
above all page content rather than resting on the background.

### Navigation bar (A1)

A floating, detached bar — four tabs split around a gold center Submit FAB (a
solid 3D button centered in the bar, not raised). Labels: **Home · Papers ·
Browse · Profile**, laid out
`[Home] [Papers] [·FAB·] [Browse] [Profile]`.

- **Bar:** `position: absolute`, `left/right: 16`, `bottom: 14`, `height: 66`,
  radius **26** (bespoke, past `xl`), `borderCurve: 'continuous'`,
  `border-subtle` hairline. Shadow `0 14px 34px -14px rgba(11,27,71,.6)`.
- **Selection pill:** `primary-surface` fill, `top: 9`, `height: 48`,
  radius 16, behind the tabs. Animated per **Motion** above.
- **Submit FAB:** gold **squircle**, `58×58`, radius 22, **vertically centered in
  the bar** (`top: 4`, no overhang — retuned 2026-07-08 from the earlier
  `top: -20` lift). `borderCurve: 'continuous'`. Reads as a **solid 3D button**:
  a vertical top-lit gold gradient (`gold.200 → gold.500`), a white specular
  gloss over the top ~55%, a `rgba(255,255,255,.5)` bevel rim, and a grounded
  deep-gold drop shadow (`shadowColor #4A3800`, `y 8`, blur 12, opacity .45,
  `elevation 12`). Glyph = a bold rounded **`add`** (plus); ink **`#3A2600`**
  (a warm ink-on-gold — the one place the FAB glyph departs from the
  `text-on-accent` token, because slate/white tested poorly for contrast on
  gold; intentional).
- **Dependency-gated fidelity (deferred to A3 Polish).** The mockup's frosted
  `blur(18px)` bar and gold-*gradient* FAB need `expo-blur` /
  `expo-linear-gradient` (a dev-client rebuild). A1 ships a faithful
  approximation: an opaque `surface-raised` bar and a solid `accent` FAB with a
  sheen overlay + lit top edge. The motion — the point — is already exact.

#### Faculty tabs

The faculty navigator uses the **same** floating bar. There is one shared
`FloatingTabBar` primitive; `StudentTabBar` and `FacultyTabBar` are thin configs
over it. Faculty differ only in:

- **No Submit FAB** (faculty don't submit). Four tabs fill the bar evenly —
  `[Home] [Review] [Browse] [Profile]`, no center gap.
- **Review** takes the student's *Papers* slot (icon: a check-review pair, so it
  reads distinctly from Browse's search glyph). **Browse** is literally the same
  shared repository screen both roles use.

Everything else — the frosted blur bar, the sliding-spring selection pill, the
`primary-surface` fill, radii, shadow, and motion — is identical by construction,
so the two bars can't drift apart. Bell parity: faculty reach notifications
through the same `TopBar` bell → `Activity` screen (notifications only; no
invites segment). Faculty Profile matches student Profile — no bell.

### Dashboard (A3)

- **Navy hero header:** `linear-gradient(158deg, primary, primary-hover)`,
  bottom radius 28 (bespoke). Greeting ("Good afternoon,") + name + sub-line;
  **bell top-right** (badge = unread notifications + pending invites) + avatar.
  Faint radial gold glow top-right; a giant translucent mono "N" watermark
  bottom-right (`rgba(255,255,255,.05)` — decorative watermark, exempt from the
  sans-only chrome rule).
- **Submit CTA card:** `primary-surface` icon tile + "Submit your research" +
  gold chevron.
- **Recent papers** and **Saved** section lists.
- Generous spacing — no cramped stat grid.

### Browse (A2)

- Big "Browse" title (`h1`); **search bar with a real clear button**
  (chip-circle × on the right), radius 15.
- **Recent searches** as `primary-surface` chips (clock icon on the first).
- A **"Swipe up & hold — release to explore"** hint card (`1.5px dashed`
  border, radius 18) with a bobbing up-chevron in a `primary-surface` tile.

### Profile (A3)

- **Navy banner** `height: 120`, bottom radius 26 (bespoke), mono "N" watermark.
- Gold avatar squircle (`82×82`, radius 24, `borderCurve: 'continuous'`)
  overlapping the banner (`margin-top: -42`, 4px `surface-base`-colored border).
- Name + handle, centered.
- Settings rows with `primary-surface` icon tiles: **Recovery email**,
  **Password**, **Dark mode** (navy toggle), **Sign out**.

### First-run (A4)

No raster illustration — the carousel is built entirely from `@expo/vector-icons`
(`Ionicons`) inside token-styled tiles, so it costs no new dependency and stays
locked to the palette rather than depending on external art generation. Four
slides, one swipeable `FlatList` (`pagingEnabled`, horizontal), full-bleed
`surface-base` background:

- **Slide layout:** icon tile centered in the top ~45% of the screen — `132×132`
  circle, `primary-surface` fill, the slide's `Ionicons` glyph at `56px` in
  `primary` (last slide's glyph in `accent` — the one emphasis exception, since
  it's the "you're ready" beat). Below: `h1` headline, `body` subcopy
  (`text-secondary`), both center-aligned with `lg` side margins.
- **Slide 1 — Discover NU Research.** Icon: `search-outline`. "Browse research
  across every department — search, filter, and read what NU is publishing."
- **Slide 2 — Submit in Minutes.** Icon: `cloud-upload-outline`. "Upload your
  paper and send it straight into faculty review, right from your phone."
- **Slide 3 — Follow Every Stage.** Illustration is a standalone stage-progress
  strip — `Submitted → Faculty → Dean → Published` with the third dot in the
  `accent` gold-ring current-stage treatment — not a generic icon. **Note:**
  Dashboard's own stage-progress card (the component this slide originally
  meant to reuse) was removed from `DashboardScreen.tsx` per issue #50 — this
  motif no longer exists anywhere in the codebase and must be built fresh for
  this slide (a small presentational component, not wired to any real
  submission data). "Track your submission from faculty review to
  publication, every step visible."
- **Slide 4 — Stay in the Loop.** Icon: `notifications-outline` with a small
  `accent`-filled badge dot top-right of the tile (glyph itself in `accent`,
  the emphasis exception noted above). "Get notified the moment your status
  changes or a co-author invites you in."
- **Pagination:** dot row below the copy block, `sm` gap — active dot
  `primary` fill `8px`, inactive `border-subtle` fill `6px`, animated width/opacity
  cross-fade on page change (reuse the **Motion** section's screen-enter timing,
  ~200ms, not the nav-pill spring — this is a content swap, not a selection).
- **Controls:** `Skip` as plain `label`-style text (`text-secondary`) top-right,
  safe-area padding. Bottom: pill `button-primary` reading "Next" on slides
  1–3, becoming "Get Started" (still `button-primary`, no gold — gold stays on
  the icon only, not a second emphasis surface) on slide 4.
- **Persistence:** a `useHasOnboarded` hook, same shape as `useHasSearchedOnce`
  (`src/hooks/useHasSearchedOnce.ts`) — one `AsyncStorage` boolean, checked
  once at the `AppNavigator` auth gate (frozen file — needs the same
  scoped-unfreeze move A1 used) between the "no user" and role branches, so a
  returning student never sees this again after their first completed or
  skipped pass.
- **Reduced motion:** the page cross-fade and dot animation both no-op under
  `useReducedMotion()` — swipe still works, just an instant cut instead of a
  fade.

#### Coachmarks (first-time nav, post-onboarding)

Contextual tooltips shown once each, the first time a returning-from-onboarding
student reaches the real UI — not part of the carousel itself.

- **Bubble:** `primary` fill, `text-on-brand` `body-small` text, radius `md`,
  a 6px triangle pointer aimed at the target control, `level2` shadow.
  Dismiss button: small `label`-style "Got it" in `accent` (the one gold
  element on an otherwise all-navy surface, same logic as the Dashboard's
  current-stage dot).
- **Targets, shown in sequence, one at a time:** the top-right notification
  bell (`TopBar`) — "Your invites and updates show up here"; the Submit FAB —
  "Tap to submit your research"; the Browse tab — "Discover papers by
  category or search". Each dismissal reveals the next; dismissing or tapping
  anywhere outside advances/ends the sequence.
- **Persistence:** a single `AsyncStorage` array of seen coachmark ids (same
  hook family as `useHasOnboarded`), so partial progress (e.g. app closed
  mid-sequence) resumes rather than restarting.
