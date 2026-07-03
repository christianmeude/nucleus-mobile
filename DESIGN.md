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
    fontFamily: Raleway
    fontSize: 32px
    lineHeight: 40px
    fontWeight: 600
    letterSpacing: 0.2px
  h1:
    fontFamily: Raleway
    fontSize: 28px
    lineHeight: 36px
    fontWeight: 700
  h2:
    fontFamily: Raleway
    fontSize: 22px
    lineHeight: 30px
    fontWeight: 700
  h3:
    fontFamily: Raleway
    fontSize: 18px
    lineHeight: 26px
    fontWeight: 600
  body-strong:
    fontFamily: Source Sans 3
    fontSize: 15px
    lineHeight: 22px
    fontWeight: 600
  body:
    fontFamily: Source Sans 3
    fontSize: 15px
    lineHeight: 22px
    fontWeight: 400
  body-small:
    fontFamily: Source Sans 3
    fontSize: 13px
    lineHeight: 20px
    fontWeight: 400
  label:
    fontFamily: Source Sans 3
    fontSize: 13px
    lineHeight: 18px
    fontWeight: 600
    letterSpacing: 0.1px
  metadata:
    fontFamily: Source Sans 3
    fontSize: 12px
    lineHeight: 18px
    fontWeight: 500
    letterSpacing: 0.1px
  caption:
    fontFamily: Source Sans 3
    fontSize: 11px
    lineHeight: 16px
    fontWeight: 400
    letterSpacing: 0.2px
  button:
    fontFamily: Source Sans 3
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
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
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
app. The direction is **Geometric & Readable**: a warm-neutral, high-contrast
sans-only system built for long reading sessions on a phone screen, with
enough headline presence that a paper title reads like a paper title, not a
list-row label.

Two families carry the entire system. **Raleway** takes every heading —
screen titles, card titles, paper titles — sized up so hierarchy reads at a
glance. **Source Sans 3** takes everything else: body copy, chrome, labels,
metadata, buttons. No serif, no script, no third family. Contrast comes from
Raleway's geometric, slightly wide letterforms against Source Sans 3's
neutral, screen-tuned body text — not from mixing type personalities.

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

| Token | Family | Size / Line height | Weight | Use |
| --- | --- | --- | --- | --- |
| `display` | Raleway | 32 / 40 | 600 | Paper detail title (the single largest heading in the app) |
| `h1` | Raleway | 28 / 36 | 700 | Screen titles ("Browse"), dashboard greeting |
| `h2` | Raleway | 22 / 30 | 700 | Section headers, stat callouts |
| `h3` | Raleway | 18 / 26 | 600 | Card titles (paper cards, tiles), nav bar titles |
| `body-strong` | Source Sans 3 | 15 / 22 | 600 | Emphasized body copy |
| `body` | Source Sans 3 | 15 / 22 | 400 | Default reading copy |
| `body-small` | Source Sans 3 | 13 / 20 | 400 | Secondary copy, affiliations |
| `label` | Source Sans 3 | 13 / 18 | 600 | Filter/tab labels (uppercase, tracked) |
| `metadata` | Source Sans 3 | 12 / 18 | 500 | Dates, view/download counts |
| `caption` | Source Sans 3 | 11 / 16 | 400 | Fine print, avatar initials |
| `button` | Source Sans 3 | 15 / 20 | 600 | Button and CTA labels |

**Rule: Raleway never appears in UI chrome.** Buttons, labels, chips, tabs,
and metadata are always Source Sans 3 — Raleway is for content the user is
meant to read as a heading, not for controls they're meant to tap. The paper
abstract on the detail screen is the one deliberate exception: it renders in
Raleway regular, because at that length it reads as continuous prose closer
to the paper title above it than to UI copy.

Headline sizes scale up faster than body text through the hierarchy — this is
intentional. A reader should be able to tell a paper title from a card title
from a section label without reading the words, purely from scale.

## Layout

Spacing follows an 8-point grid (with a 4px half-step for tight groupings):
`4 · 8 · 12 · 16 · 24 · 32 · 40`. Two rules govern how it's applied:

1. **Card padding is `xl` (24px)**, flat across every card type in the app
   (paper cards, tiles, invitations, notifications). This is the baseline
   "comfortable" density — not the tightest the grid allows, chosen
   deliberately for breathing room over information density.
2. **Related elements sit closer than unrelated ones.** Inside a card,
   related fields (title → author → status) use `sm`–`md` gaps. Between
   independent cards in a list, the gap steps up to `md`–`lg` — roughly
   double the internal gap — so the eye reads each card as one unit before
   moving to the next.

Screen edge margins are `xl` (24px) on primary content screens (Browse,
Paper Detail). Tap targets are never smaller than 44×44pt, per platform
convention, regardless of the visual size of the icon inside them.

## Elevation & Depth

Elevation is soft and used sparingly — cards separate from the background
mainly through a `border-subtle` hairline, with shadow reserved for cards
that need to read as "above" other content:

- `level0` — flat, no shadow. Default resting state during list-entrance
  animation.
- `level1` — `0 1px 3px rgba(0,0,0,0.06)`, elevation 1. Tiles and secondary
  cards.
- `level2` — `0 4px 12px rgba(0,0,0,0.1)`, elevation 4. Primary paper cards
  once settled (post entrance-animation).

No colored or tinted shadows — the palette's neutrals are light enough that
a plain black shadow at low opacity reads correctly on every surface color
in the system.

## Shapes

Corner radius scales with the size of the element it's applied to, not used
decoratively:

- `sm` (8px) — chips, small tags.
- `md` (10px) — inputs, icon buttons, small placeholders.
- `lg` (14px) — reserved for compact/legacy surfaces being migrated to `xl`.
- `xl` (18px) — the default for every card (paper cards, tiles, invitations,
  notifications). This is the current baseline, sized up from `lg` alongside
  the rest of the "comfortable" spacing pass.
- `pill` (999px) — avatars, buttons, badges, filter chips — anything meant
  to read as a fully-rounded control.

## Components

- **Card** — `surface-raised` fill, `border-subtle` hairline, `xl` radius,
  `xl` padding. The one shared primitive (`components/ui/Card.tsx`) behind
  every paper card, tile, and list row in the app — change it once, every
  screen inherits it.
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

- **Do** keep Raleway to headings and the paper abstract. **Don't** put
  Raleway on a button, tab, or chip — chrome is Source Sans 3, no exceptions.
- **Do** use the `xl` card radius/padding for any new card-shaped surface.
  **Don't** introduce a third padding scale for "just this one card."
  Match the existing card, or fix the shared `Card` primitive if the
  baseline itself needs to change.
- **Do** reserve gold for emphasis (status, save state, category eyebrow).
  **Don't** use gold as a fill color for large surfaces or decoration.
- **Do** size headings up relative to body text through the hierarchy.
  **Don't** size up body/UI text to match — `body`, `metadata`, `caption`,
  and `button` stay fixed; only `display`/`h1`–`h3` scale.
- **Not yet implemented:** a dark theme. Every screen ships light-only
  today; if dark mode is scoped as a future undertaking, it should extend
  `theme/colors.ts` with a parallel token set rather than hardcoding
  per-screen overrides.
