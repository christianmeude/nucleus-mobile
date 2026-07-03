# NUcleus Mobile — Design Agent Conventions

NUcleus is a research-reading app for enrolled students at National University Dasmariñas, Philippines. Students browse, read, and submit research papers on mobile. The audience is young, warm, student-friendly — not corporate-cold. The app is reading-first: typography legibility is non-negotiable.

---

## What is fixed — do not change these

### Color palette (university brand identity, locked)

| Role | Semantic token | Value |
|---|---|---|
| Primary — nav, buttons, links | `var(--color-brand-primary)` | `#1B3A8C` navy |
| Accent — one emphasis element per screen | `var(--color-brand-accent)` | `#F5A623` gold |
| Page background | `var(--color-surface-paper)` | `#F7F3EA` warm paper |
| Card surface | `var(--color-surface-paper-raised)` | `#FFFDF8` |
| Sunken / inset | `var(--color-surface-paper-sunken)` | `#FCFAF4` |
| Warm rule / divider | `var(--color-border-warm)` | `#E9E2D3` |
| Primary text | `var(--color-text-primary)` | `#0F172A` ink |

Never introduce new colors. Never use Anthropic orange, Anthropic blue, or Anthropic green. The full palette vocabulary (including cool-slate surfaces for reference) is in `tokens/colors.css`.

### Spacing scale

| Token | Value | CSS variable |
|---|---|---|
| xs | 4px | `var(--space-xs)` |
| sm | 8px | `var(--space-sm)` |
| md | 12px | `var(--space-md)` |
| lg | 16px | `var(--space-lg)` |
| xl | 24px | `var(--space-xl)` |
| 2xl | 32px | `var(--space-2xl)` |
| 3xl | 40px | `var(--space-3xl)` |

### Corner radii

`var(--radius-sm)` 8px · `var(--radius-md)` 10px · `var(--radius-lg)` 14px · `var(--radius-xl)` 18px · `var(--radius-pill)` 9999px.

### Elevation

Cards use `var(--shadow-1)` (subtle lift). Modals/sheets use `var(--shadow-2)`. Flat surfaces use `var(--shadow-0)`. No heavy skeuomorphism.

### Mobile platform

React Native (iOS + Android). No web-only layout tricks — no CSS Grid, no `position: sticky`, no `:hover` as a primary interaction model. All mockups should reflect a vertical mobile canvas.

### Logo mark

The small "N" monogram is permitted in screen headers and nav elements. No orbital, atom, or other decorative motifs behind content.

---

## What is open — explore freely

The following dimensions are **not locked**. These are the axes for design exploration.

### Typography

Up to **two typeface families** per direction. The current baseline is Lora (serif, display) + Outfit (sans, UI) — this pairing is a starting point, not a constraint. Propose alternatives with clear rationale. Any typeface must be available via Google Fonts for use in rendered HTML mockups.

The current type scale (sizes, weights, line heights) is in `tokens/typography.css` — treat it as a reference baseline, not a requirement.

### Layout rhythm and component treatments

The current "catalog card" pattern (category eyebrow pill → serif title → hairline rule → metadata row) is one proven direction, not the mandated one. Explore meaningfully different structural patterns — asymmetric headers, magazine rhythm, stat-forward dashboard grids, minimal list density — whatever serves the reading-first, student-friendly purpose best.

### Signature character

Each design direction should have a distinct personality: a clear character statement, a layout signature, and consistent component treatments across the three screens. The only invariants are the fixed palette and the legibility requirement.

---

## In-scope screens (three hero screens)

1. **Browse** — search bar, category filter chips, research card list
2. **ResearchDetail** — paper title, authors, metadata, abstract, PDF access button
3. **Dashboard** — personal stat summary, recent papers, quick actions

---

## Token file index

`styles.css` is the entry point. It imports:
- `tokens/colors.css` — full color vocabulary
- `tokens/typography.css` — current type scale baseline (Lora + Outfit)
- `tokens/spacing.css` — spacing scale and radii
- `tokens/shadows.css` — elevation shadows
- `fonts/fonts.css` — Google Fonts import (current baseline: Lora + Outfit)
