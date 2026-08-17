---
name: NUcleus
description: Design system for NUcleus Mobile, the research repository app for National University Dasmariñas students.
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
  surface-base: '#F8FAFC'
  surface-raised: '#FFFFFF'
  surface-sunken: '#F1F5F9'
  border-subtle: '#E2E8F0'
  border-strong: '#CBD5E1'
  border-focus: '#2E5BC9'
  success: '#047857'
  warning: '#D97706'
  danger: '#B91C1C'
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
    backgroundColor: '{colors.surface-raised}'
    rounded: '{rounded.lg}'
    padding: '{spacing.lg}'
  card-border:
    borderColor: '{colors.border-subtle}'
  button-primary:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.text-on-brand}'
    rounded: '{rounded.pill}'
    padding: 12px 24px
  button-primary-hover:
    backgroundColor: '{colors.primary-hover}'
  button-primary-pressed:
    backgroundColor: '{colors.primary-pressed}'
  chip:
    backgroundColor: '{colors.accent-surface}'
    textColor: '{colors.accent-hover}'
    rounded: '{rounded.sm}'
  avatar:
    backgroundColor: '{colors.primary}'
    textColor: '{colors.text-on-brand}'
    rounded: '{rounded.pill}'
---

# Design System: NUcleus

## Overview

**Creative North Star: "Modern Clarity"**

NUcleus Mobile is a research repository for National University Dasmariñas students. Browsing, reading, and submitting papers is the whole job of the app. The aesthetic philosophy is built for long reading sessions on a phone screen, calibrated against Material 3's type-scale and shape conventions rather than a bespoke scale. It feels native, legible, and academically serious without being overly corporate.

**Key Characteristics:**
- **One Typeface**: Roboto is the single app-wide typeface to read as neutral and platform-native.
- **Strict Brand Alignment**: Navy for primary actions and navigation; gold reserved strictly for emphasis.
- **Soft Geometry**: Modest corner radii tied closely to platform (Material 3/iOS) defaults.
- **Reading-First**: Ample spacing and disciplined use of color ensure cognitive ease during reading.

## Colors

The palette is anchored by the university's navy and gold, with navy driving structure and gold reserved for rare emphasis.

### Primary
- **Brand Navy** (#1B3A8C): The core action color. Used for primary buttons, active nav state, links, and focus rings. Hover and pressed states step down in lightness. `primary-surface` (#EAF0FB) is the tint background for selected rows.

### Secondary
- **Brand Gold** (#CDA434): A true metallic gold. Reserved strictly for emphasis: status chips, category eyebrows, the bookmark/save affordance, and the Submit FAB.

### Neutral
- **Text Primary** (#0F172A): Headings and primary reading text.
- **Text Secondary** (#475569): Supporting copy.
- **Text Muted** (#64748B): Metadata and captions.
- **Surface Base** (#F8FAFC): The main screen background.
- **Surface Raised** (#FFFFFF): Every card and elevated element.
- **Surface Sunken** (#F1F5F9): Recessed areas like search fields and skeleton loaders.
- **Border Subtle** (#E2E8F0): Hairlines for cards and dividers.

### Named Rules
**The Emphasis Rule.** Gold is never used for large fills or decoration. Gold that appears everywhere stops meaning anything.

## Typography

**Display Font:** Roboto (with system sans-serif fallback)
**Body Font:** Roboto (with system sans-serif fallback)

**Character:** Utilitarian, highly legible, and native. Visual hierarchy is achieved entirely through size, weight, and letter-spacing per token, rather than introducing a second family.

### Hierarchy
- **Display** (600, 28px, 36px): Paper detail titles.
- **Headline (h1)** (700, 24px, 32px): Screen titles ("Browse"), dashboard greeting.
- **Title (h2)** (700, 20px, 28px): Section headers, stat callouts.
- **Title Small (h3)** (600, 17px, 24px): Card titles, nav bar titles.
- **Body Strong** (600, 15px, 22px): Emphasized body copy.
- **Body** (400, 15px, 22px): Default reading copy.
- **Body Small** (400, 13px, 20px): Secondary copy, affiliations.
- **Label** (600, 13px, 18px, uppercase): Filter/tab labels.
- **Metadata** (500, 12px, 18px): Dates, view/download counts.
- **Caption** (400, 11px, 16px): Fine print, avatar initials.
- **Button** (600, 15px, 20px): Button and CTA labels.

### Named Rules
**The Single Font Rule.** Do not introduce a second font family. Hierarchy comes from size and weight.

## Layout

Spacing follows an 8-point grid (with a 4px half-step for tight groupings). Card padding defaults to `16px` (Material 3 standard). Screen edge margins are `16px` on primary content screens. Tap targets are never smaller than 44×44pt, per platform convention.

**The Spacing Rule.** Related elements sit closer than unrelated ones. Inside a card, related fields (title → author → status) use `sm`–`md` gaps.

## Elevation & Depth

Elevation is soft and used sparingly. The system relies primarily on surface tone and subtle borders rather than heavy skeuomorphism.

### Shadow Vocabulary
- **Level 0 (Flat):** Resting state, no shadow.
- **Level 1 (Subtle Lift):** `0 1px 3px rgba(0,0,0,0.06)`. Used for tiles and secondary cards.
- **Level 2 (Raised):** `0 4px 12px rgba(0,0,0,0.1)`. Used for primary paper cards once settled.

### Named Rules
**The Hairline Rule.** Cards separate from the background mainly through a `border-subtle` hairline. Shadow is reserved for cards that need to read as "above" other content.

## Shapes

Corner radius scales with the size of the element it's applied to and is never used decoratively. The scale aligns with Material 3.

- **8px (sm):** Chips, small tags.
- **10px (md):** Inputs, icon buttons.
- **14px (lg):** The default for every card.
- **18px (xl):** Larger surfaces, hero banners.
- **999px (pill):** Avatars, buttons, badges.

### Named Rules
**The Continuous Corner Rule.** Every card-shaped `View` or `Pressable` must set `borderCurve: 'continuous'` for the native iOS squircle treatment.

## Components

### Card
- **Shape:** 14px radius (lg) with continuous curve.
- **Background:** `surface-raised` (#FFFFFF) with a `border-subtle` hairline.
- **Padding:** 16px (lg).

### Primary Button
- **Shape:** 999px radius (pill).
- **Background:** `primary` (#1B3A8C) with `text-on-brand` (#FFFFFF).
- **Padding:** 12px 24px.
- **Hover/Focus:** Steps to `primary-hover` (#16307A) / `primary-pressed` (#102560).
- **Disabled:** `border-subtle` fill with `text-disabled` label.

### Chip / Status Pill
- **Style:** Tint-surface background (e.g. `accent-surface`, `success-surface`) with matching saturated color text.
- **Shape:** 8px radius (sm).
- **State:** Never a solid fill behind body-length text.

### Avatar
- **Style:** Initials in `caption` weight on a `primary` fill.
- **Shape:** 999px radius (pill).

### Inputs / Search Field
- **Style:** `surface-sunken` (#F1F5F9) fill, `border-subtle` hairline, 10px radius (md) with continuous curve.
- **Focus:** `border-focus` (#2E5BC9) 2px ring.

## Do's and Don'ts

### Do:
- **Do** check a heading size against the nearest Material 3 Headline/Title role before changing it.
- **Do** set `borderCurve: 'continuous'` on every new card-shaped surface.
- **Do** reserve gold exclusively for emphasis.

### Don't:
- **Don't** size up a heading just because it "could be bigger".
- **Don't** use gold as a fill color for large surfaces or decoration.
- **Don't** introduce a second font family; rely on Roboto's weights.
- **Don't** ship a rounded corner without `borderCurve: 'continuous'` on iOS.
