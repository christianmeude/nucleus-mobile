---
name: NUcleus
description: Design system for NUcleus Mobile, the research repository app for National University Dasmariñas students and faculty.
colors:
  primary: '#1B3A8C'
  primary-hover: '#16307A'
  primary-pressed: '#102560'
  primary-soft: '#D2DEF5'
  primary-surface: '#EAF0FB'
  accent: '#CDA434'
  accent-hover: '#AE8829'
  accent-soft: '#F4E7BD'
  accent-surface: '#FBF6E8'
  text-primary: '#0F172A'
  text-secondary: '#475569'
  text-muted: '#64748B'
  text-disabled: '#94A3B8'
  text-on-brand: '#FFFFFF'
  text-on-accent: '#0F172A'
  surface-base: '#F1F4FA'
  surface-raised: '#F9FBFF'
  surface-sunken: '#F1F5F9'
  border-subtle: '#E2E8F0'
  border-strong: '#CBD5E1'
  border-focus: '#2E5BC9'
  success: '#047857'
  warning: '#D97706'
  danger: '#B91C1C'
typography:
  display:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: 600
    lineHeight: 36px
    letterSpacing: '-0.3px'
  h1:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 700
    lineHeight: 32px
    letterSpacing: '-0.3px'
  h2:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: 700
    lineHeight: 28px
    letterSpacing: '-0.3px'
  h3:
    fontFamily: Inter
    fontSize: 17px
    fontWeight: 600
    lineHeight: 24px
  body:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 400
    lineHeight: 22px
  body-small:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 400
    lineHeight: 20px
  label:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: 600
    lineHeight: 18px
    letterSpacing: '0.1px'
  metadata:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 500
    lineHeight: 18px
    letterSpacing: '0.1px'
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 400
    lineHeight: 16px
    letterSpacing: '0.2px'
  button:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: '0.2px'
rounded:
  sm: '8px'
  md: '10px'
  lg: '14px'
  xl: '18px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '24px'
  2xl: '32px'
  3xl: '40px'
components:
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.text-on-brand}'
    rounded: '{rounded.pill}'
    padding: '8px 16px'
  button-primary-pressed:
    backgroundColor: '{colors.primary-pressed}'
  button-secondary:
    backgroundColor: '{colors.surface-raised}'
    textColor: '{colors.primary}'
    rounded: '{rounded.pill}'
    padding: '8px 16px'
  chip-filter-active:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.text-on-brand}'
    rounded: '{rounded.pill}'
    padding: '4px 12px'
  card:
    backgroundColor: '{colors.surface-raised}'
    rounded: '{rounded.lg}'
    padding: '12px'
  input:
    backgroundColor: '{colors.surface-base}'
    rounded: '{rounded.lg}'
    padding: '12px 12px'
  search-field:
    backgroundColor: '{colors.surface-raised}'
    rounded: '{rounded.pill}'
    padding: '0px 16px'
---

# Design System: NUcleus

## Overview

**Creative North Star: "Modern Clarity"**

NUcleus Mobile is a research repository for National University Dasmariñas students and faculty. Browsing, reading, submitting, and reviewing papers is the whole job of the app. The aesthetic philosophy is built for long reading sessions on a phone screen, calibrated against Material 3's type-scale and shape conventions rather than a bespoke scale. It feels native, legible, and academically serious without being overly corporate. Components are precise and calm: pill buttons, hairline cards, quiet inputs — the brand speaks sparingly, never shouting.

**Key Characteristics:**

- **One Typeface**: Inter is the single app-wide typeface to read as neutral and platform-native.
- **Strict Brand Alignment**: Navy for primary actions and navigation; gold reserved strictly for emphasis.
- **Soft Geometry**: Modest corner radii tied closely to platform (Material 3/iOS) defaults, always with continuous corners.
- **Reading-First**: Ample spacing and disciplined use of color ensure cognitive ease during reading.

## Colors

The palette is anchored by the university's navy and gold, with navy driving structure and gold reserved for rare emphasis. A first-class dark scheme mirrors every token (deep-navy surfaces `#0A1226`/`#111C38`/`#070E1F`, navy-tinted text, amplified navy/gold for contrast) — never a quick invert.

### Primary

- **Brand Navy** (#1B3A8C): The core action color. Primary buttons, active nav state, links, focus rings, and the canonical active-filter fill. Hover (#16307A) and pressed (#102560) step down in lightness. `primary-surface` (#EAF0FB) is the tint background for selected rows.

### Secondary

- **Brand Gold** (#CDA434): A true metallic old gold — reads as gold, not yellow — with dark text staying legible on its fills. Hover (#AE8829). Soft (#F4E7BD) and surface (#FBF6E8) tints for emphasis backgrounds.

### Neutral

- **Text Primary** (#0F172A): Headings and primary reading text.
- **Text Secondary** (#475569): Supporting copy.
- **Text Muted** (#64748B): Metadata, captions, placeholders, and the canonical result-count color.
- **Text Disabled** (#94A3B8): Disabled labels only — never result counts.
- **Surface Base** (#F1F4FA): The main screen background.
- **Surface Raised** (#F9FBFF): Every card and elevated element, including the search field.
- **Surface Sunken** (#F1F5F9): Recessed areas such as segmented tracks and skeleton loaders.
- **Border Subtle** (#E2E8F0): Hairlines for cards and dividers.
- **Border Strong** (#CBD5E1): Input and search-field borders that must read as controls.
- **Border Focus** (#2E5BC9): The navy focus ring.

### Named Rules

**The Emphasis Rule.** Gold is never used for large fills or decoration. Gold that appears everywhere stops meaning anything. The Submit FAB's accent fill is the deliberate exception, not the precedent.

**The Active-Fill Rule.** The canonical interactive-active treatment is a navy fill with white text — filter pills, primary buttons, selected segments. Tonal tint-surface chips are reserved for read-only status display, never for something the user can tap to change state.

## Typography

**Display Font:** Inter (with system sans-serif fallback)
**Body Font:** Inter (with system sans-serif fallback)

**Character:** Utilitarian, highly legible, and native. Visual hierarchy is achieved entirely through size, weight, and letter-spacing per token, rather than introducing a second family. Type scales with the OS setting up to 1.3x.

### Hierarchy

- **Display** (600, 28px, 36px, -0.3px): Paper detail titles.
- **Headline (h1)** (700, 24px, 32px): Screen titles ("Browse"), dashboard greeting.
- **Title (h2)** (700, 20px, 28px): Section headers, stat callouts.
- **Title Small (h3)** (600, 17px, 24px): Card titles, nav bar titles.
- **Body Strong** (600, 15px, 22px): Emphasized body copy.
- **Body** (400, 15px, 22px): Default reading copy.
- **Body Small** (400, 13px, 20px): Secondary copy, affiliations.
- **Label** (600, 13px, 18px): Filter/tab labels, chip text — always single-line inside pills.
- **Metadata** (500, 12px, 18px): Dates, view/download counts, uppercase result counts.
- **Caption** (400, 11px, 16px): Fine print, avatar initials.
- **Button** (600, 15px, 20px): Button and CTA labels.

### Named Rules

**The Single Font Rule.** Do not introduce a second font family. Hierarchy comes from size and weight.

## Layout

Spacing follows a seven-step scale (4/8/12/16/24/32/40) on an 8-point grid with a 4px half-step. Card padding defaults to `12px`. Screen edge margins are `16px` on primary content screens. Headers share one stack — title, search, filter row, count subbar — with `md` gaps between related elements and `lg`+ between groups. Tap targets are never smaller than 44×44pt. Status filters use a wrapping content-sized pill flow (never equal-width segments that wrap mid-label, never a scroll-row that hides options); at most two rows, every option visible.

**The Spacing Rule.** Related elements sit closer than unrelated ones. Inside a card, related fields (title → author → status) use `sm`–`md` gaps.

## Elevation & Depth

Hairlines separate; shadows lift. Cards read as distinct from the background through a `border-subtle` hairline at rest, with soft navy-tinted shadows reserved for content that floats above — sheets, FABs, nav bars, pressed cards.

### Shadow Vocabulary

- **Level 0 (Flat)** (`shadowOpacity: 0, elevation: 0`): Resting cards and list rows.
- **Level 1 (Subtle Lift)** (`0 1px 3px rgba(11,27,71,0.08), elevation: 1`): Tiles, secondary cards, scroll-hint buttons.
- **Level 2 (Raised)** (`0 4px 12px rgba(11,27,71,0.13), elevation: 4`): Primary paper cards once settled, floating bars.
- **Tinted Primary** (`0 14px 34px -14px rgba(11,27,71,0.6)`): Floating nav elements.
- **Tinted Accent** (`0 8px 12px rgba(74,56,0,0.45)`): The Submit FAB.

### Named Rules

**The Hairline Rule.** Cards separate from the background mainly through a `border-subtle` hairline. Shadow is reserved for content that floats.

## Shapes

Corner radius scales with the size of the element, Material 3-aligned, never decorative: small tags `8px` (sm), inputs `14px` (lg), cards `14px` (lg), heroes `18px` (xl), buttons/badges/pills/chips `999px` (pill).

### Named Rules

**The Continuous Corner Rule.** Every card-shaped `View` or `Pressable` must set `borderCurve: 'continuous'` for the native iOS squircle treatment.

## Components

### Buttons

Precise and calm: pill-shaped, 44pt minimum height, `button`-weight labels, navy fill for primary.

- **Shape:** Pill (999px) with continuous curve.
- **Primary:** Navy fill (#1B3A8C) with white text; padding `8px 16px`; pressed steps to `primary-pressed` with a 0.98 scale.
- **Hover / Focus:** Hover steps to #16307A; focus carries the navy ring.
- **Secondary / Soft / Subtle:** Raised-surface or tint fills with navy text and navy or subtle borders. State variants (warning/danger/success) stay tonal in both modes — never solid bright fills side by side.

### Chips

Two jobs, two treatments — never mixed.

- **Filter (interactive):** Pill, 44pt minimum, `label`-weight single-line text. Inactive is raised-surface with a strong border and secondary text; active is the navy fill with white text per the Active-Fill Rule.
- **Status (read-only):** Tint-surface background with matching saturated text and border per tone (info navy, success green, warning amber, danger red).

### Cards / Containers

- **Corner Style:** Large (14px) with continuous curve.
- **Background:** `surface-raised` with no mandatory border in code (hairline applied at the surface level per the Hairline Rule).
- **Shadow Strategy:** Level 0 at rest and during list entrance; level 1–2 only once settled or floating.
- **Internal Padding:** `12px` default.

### Inputs / Fields

- **Style:** 1.5px `border-strong` stroke, `surface-base` fill at rest, large (14px) radius with continuous curve, `body`-size text.
- **Focus:** Border crossfades to the gold accent with the fill lifting to raised; error crossfades to danger with a danger-surface fill and an error haptic.
- **Search Field:** The distinct search variant — raised fill, 1px `border-strong`, pill radius, 44pt height, muted placeholder and icon, plain X clear button.

### Navigation

Tab bars for 2–5 top-level sections per role (student vs faculty), stacks for hierarchy, bottom sheets for self-contained filter and form tasks. The signature animated selection pill uses the nav spring (`cubic-bezier(0.34, 1.3, 0.4, 1)`).

## Do's and Don'ts

### Do:

- **Do** check a heading size against the nearest Material 3 Headline/Title role before changing it.
- **Do** set `borderCurve: 'continuous'` on every new card-shaped surface.
- **Do** reserve gold exclusively for emphasis.
- **Do** use navy fill + white text for anything tappable-active; tonal chips for read-only status.
- **Do** keep filter-pill labels single-line and let the row wrap rather than scroll.

### Don't:

- **Don't** size up a heading just because it "could be bigger".
- **Don't** use gold as a fill color for large surfaces or decoration.
- **Don't** introduce a second font family; rely on Inter's weights.
- **Don't** ship a rounded corner without `borderCurve: 'continuous'` on iOS.
- **Don't** use `text-disabled` for result counts or metadata — it is a disabled-label token, not a quiet-text token.
