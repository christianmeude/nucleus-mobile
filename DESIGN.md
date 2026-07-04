---
name: NUcleus
description: Design system for NUcleus Mobile, the research repository app for National University Dasmariñas students.
colors:
  primary: "#1B3A8C"
  primary-hover: "#16307A"
  primary-pressed: "#102560"
  primary-soft: "#D2DEF5"
  primary-surface: "#EAF0FB"
  accent: "#F5A623"
  accent-hover: "#D9921F"
  accent-soft: "#FCE7BD"
  accent-surface: "#FEF6E7"
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
    fontFamily: Montserrat
    fontSize: 28px
    lineHeight: 36px
    fontWeight: 600
    letterSpacing: 0.15px
  h1:
    fontFamily: Montserrat
    fontSize: 24px
    lineHeight: 32px
    fontWeight: 700
  h2:
    fontFamily: Montserrat
    fontSize: 20px
    lineHeight: 28px
    fontWeight: 700
  h3:
    fontFamily: Montserrat
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

## Overview

NUcleus Mobile is a research repository for National University Dasmariñas
students — browsing, reading, and submitting papers is the whole job of the
app. The direction is **Modern Clarity**: a clean, sans-only system built for
long reading sessions on a phone screen, calibrated against Material 3's
type-scale and shape conventions rather than a bespoke scale.

Two families carry the system. **Montserrat** takes heading roles —
`display`, `h1`–`h3` — for screen titles, card titles, and paper titles.
**Roboto** takes everything else: body copy, chrome, labels, metadata,
buttons — it's also Material 3's own default typeface, so the UI layer reads
as neutral and platform-native rather than stylized. Contrast comes from
Montserrat's geometric, uppercase-friendly letterforms against Roboto's
screen-tuned body text, not from size alone: heading sizes are pinned to
Material 3 Headline/Title roles, not inflated past them.

Brand color is navy-and-gold, drawn from the NUcleus wordmark: navy for
primary actions, navigation, and links; gold reserved for emphasis (status
chips, category eyebrows, save/bookmark state) and never used decoratively.

## Colors

- **Primary (`#1B3A8C`)** — brand navy. Primary buttons, active nav state,
  links, focus rings. `primary-hover` / `primary-pressed` step down in
  lightness for interaction states; `primary-soft` / `primary-surface` are
  tint backgrounds for badges and selected rows.
- **Accent (`#F5A623`)** — brand gold. Reserved for emphasis: status chips,
  category eyebrows, the bookmark/save affordance. Never used for large
  fills or decoration — gold that appears everywhere stops meaning anything.
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
| `display` | Montserrat | 28 / 36 | 600 | Headline Medium | Paper detail title |
| `h1` | Montserrat | 24 / 32 | 700 | Headline Small | Screen titles ("Browse"), dashboard greeting |
| `h2` | Montserrat | 20 / 28 | 700 | Title Large | Section headers, stat callouts |
| `h3` | Montserrat | 17 / 24 | 600 | Title Medium | Card titles (paper cards, tiles), nav bar titles |
| `body-strong` | Roboto | 15 / 22 | 600 | Body Large | Emphasized body copy |
| `body` | Roboto | 15 / 22 | 400 | Body Large | Default reading copy |
| `body-small` | Roboto | 13 / 20 | 400 | Body Medium | Secondary copy, affiliations |
| `label` | Roboto | 13 / 18 | 600 | Label Large | Filter/tab labels (uppercase, tracked) |
| `metadata` | Roboto | 12 / 18 | 500 | Label Medium | Dates, view/download counts |
| `caption` | Roboto | 11 / 16 | 400 | Label Small | Fine print, avatar initials |
| `button` | Roboto | 15 / 20 | 600 | Label Large | Button and CTA labels |

**Rule: Montserrat never appears in UI chrome.** Buttons, labels, chips,
tabs, and metadata are always Roboto — Montserrat is for content the user is
meant to read as a heading, not for controls they're meant to tap.

Body/UI sizes are untouched from the previous system — only the heading
roles (`display`, `h1`–`h3`) changed family and stepped to the nearest M3
Headline/Title size, which in two cases (`display`, `h1`) is actually
*smaller* than an earlier, unreleased draft of this pass that oversized
headings past what the type scale called for.

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

- **Do** keep Montserrat to heading roles only. **Don't** put Montserrat on
  a button, tab, or chip — chrome is Roboto, no exceptions.
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
  per-screen overrides.
