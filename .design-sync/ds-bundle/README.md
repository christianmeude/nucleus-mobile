# NUcleus Mobile — Design Agent Conventions

NUcleus is a research-reading app for enrolled students at National University Dasmariñas, Philippines. Students browse, read, and submit research papers on mobile. Audience: warm, student-friendly, not corporate-cold. Purpose: reading-first — typography legibility is non-negotiable.

## Fixed — do not change

### Color palette (locked)

Primary: navy `var(--color-brand-primary)` (#1B3A8C) — nav, buttons, links.  
Accent: gold `var(--color-brand-accent)` (#F5A623) — one emphasis element per screen only.  
Ink: `var(--color-text-primary)` (#0F172A).

Warm paper surfaces:

- Page: `var(--color-surface-paper)` (#F7F3EA)
- Card: `var(--color-surface-paper-raised)` (#FFFDF8)
- Sunken: `var(--color-surface-paper-sunken)` (#FCFAF4)
- Divider: `var(--color-border-warm)` (#E9E2D3)

Never introduce new colors. Never use Anthropic orange, blue, or green. Full palette in `tokens/colors.css`.

### Spacing & radii

Scale: xs 4px · sm 8px · md 12px · lg 16px · xl 24px · 2xl 32px · 3xl 40px.  
Radii: sm 8px · md 10px · lg 14px · xl 18px · pill 9999px.

### Elevation

`var(--shadow-1)` for cards · `var(--shadow-2)` for modals · `var(--shadow-0)` for flat.

### Platform & logo

React Native mobile canvas (iOS + Android). No CSS Grid, no sticky, no hover-primary interactions.  
The small "N" monogram is permitted in headers/nav. No decorative motifs behind content.

---

## Open — explore freely

### Typography

Up to **two typeface families** per direction. Current baseline: Lora (serif) + Outfit (sans). This pairing is not locked — propose alternatives with rationale. Must be Google Fonts-available. The current type scale is in `tokens/typography.css` — treat as reference, not constraint.

### Layout & component treatments

The current "catalog card" pattern (eyebrow pill → title → hairline rule → metadata) is one candidate direction, not the mandate. Explore different layout rhythms, hierarchy approaches, and component personalities — whatever fits a reading-first student product best.

---

## In-scope screens

1. **Browse** — search bar, category chips, research card list
2. **ResearchDetail** — title, authors, metadata, abstract, PDF access
3. **Dashboard** — personal stats, recent papers, quick actions

---

## Token files

`styles.css` imports: `tokens/colors.css` · `tokens/typography.css` · `tokens/spacing.css` · `tokens/shadows.css` · `fonts/fonts.css`
