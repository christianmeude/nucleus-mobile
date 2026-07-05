# NUcleus Mobile — Visual Direction (redesign source of truth)

> **This is the source of truth for the A-pillar redesign look AND motion.**
> Build to the exact values here — never to a plan's prose summary of them.
> The literal reference is `docs/design/mockup.html` (open it in a browser).
> Canonical artifact: <https://claude.ai/code/artifact/07a26a8c-7395-412f-8b80-4d915dc33d6a>

Locked before A0 built the tokens. Every redesign screen (A1 nav, A2 Browse, A3
Dashboard/Profile/polish) is measured against this file and the mockup, not
against how a plan described it. When motion is called out below, the easing
curve + duration are a **spec**, not a vibe.

---

## Why this file exists

On A1 (2026-07-05) the floating tab bar first shipped as a generic icon-lift
because it was built from the plan's prose ("floating navbar + animated select")
and the mockup was never opened. It was functionally correct, visually wrong —
the exact disappointment the redesign exists to avoid. Root cause: the source of
truth lived outside the repo (an artifact URL) and got lost across a context
reset. Fix: the spec + the mockup now live **in the repo, on the branch**, wired
into the session-open protocol (CLAUDE.md), so no context loss can drop the
thread again.

---

## Palette (official NU navy + gold)

| Token | Light | Dark |
|---|---|---|
| App background | `#F4F7FC` | `#070F26` |
| Card / surface | `#FFFFFF` | `#101F45` |
| Ink (text) | `#0B1B47` | `#EAF0FB` |
| Muted text | `#647393` | `#8CA0C4` |
| Line / border | `#E7EDF7` | `#22315B` |
| Navy (brand primary) | `#1B3A8C` | `#2E5BC9` |
| Navy 2 (hero gradient end) | `#16307A` | `#1B3A8C` |
| Navy-soft (pill / chip fill) | `#EAF0FB` | `#14224A` |
| Gold (accent) | `#F5A623` | `#F8C156` |
| Gold gradient | `#F8C156 → #F5A623` | same |
| Ink-on-gold (glyph on FAB/badge) | `#3A2600` | `#3A2600` |
| Good / done (stage dot) | `#059669` | `#059669` |

**Gold, used once.** Gold marks the primary action (Submit FAB) and the current
review stage — never decoration. Everything else is navy/ink/muted.

---

## Navbar (A1) — the signature motion

Floating detached bar, four tabs split around a raised gold center FAB.

- **Bar:** `position:absolute; left/right 16px; bottom 14px; height 66; radius 26`.
  Frosted `backdrop-filter: blur(18px)` over `#FFFFFFEE` (dark `#0D1938F0`),
  1px line border, shadow `0 14px 34px -14px rgba(11,27,71,.6)`.
- **Sliding pill (`.navind`) — THE most important motion:** navy-soft rounded
  rect, `top 9; height 48; radius 16`, `z-index 0` (behind the tabs). It animates
  its `left`/`width` to the active tab via
  **`transition: left .42s cubic-bezier(.34, 1.3, .4, 1)`** — a spring overshoot.
  Replaces the old gold `activeDot` (gone). Active tab icon + label turn navy,
  **no icon scale** — the moving pill carries all the motion.
- **Layout:** `[Home] [Papers] [spacer] [Browse] [Profile]`, spacer `flex:0 0 58px`.
  Labels: **Home · Papers · Browse · Profile**.
- **FAB (Submit):** gold **squircle**, `width/height 58; radius 20; top -20`
  overhang, gold gradient `linear-gradient(145deg,#F8C156,#F5A623)`,
  shadow `0 10px 22px -6px rgba(245,166,35,.7), 0 2px 4px rgba(0,0,0,.2)`,
  `:active scale .9`. Glyph ink `#3A2600`.
- **Reduced motion:** kill all animation/transition (pill jumps, no slide).

### Shipped in A1 vs deferred (dep-gated)

The mockup's exact frosted glass and gold gradient need Expo modules not yet
installed (a dev-client rebuild). A1 shipped a faithful **approximation**;
exact fidelity is deferred to **A3 Polish**.

| Mockup | A1 shipped | Deferred to A3 (needs dep) |
|---|---|---|
| Frosted `blur(18px)` bar | Opaque `surface.raised` bar | `expo-blur` |
| Gold-gradient FAB | Solid gold + sheen overlay + lit top edge | `expo-linear-gradient` |
| Pill spring `cubic-bezier(.34,1.3,.4,1)`/420ms | **Exact** (Reanimated `Easing.bezier`) | — (no dep needed) |
| Pill radius 16 | Bumped to 20 (QA) | — |
| FAB radius 20 | Bumped to 24 (QA) | — |
| FAB `+` glyph | `create-outline` (write/compose read, QA) | — |

Reanimated 4.3.1 covers the sliding-pill motion with no new dep — so the motion,
which is the point, is exact. Only surface texture is approximated.

---

## Dashboard (A3) — build to this

- **Navy hero** header: `linear-gradient(158deg, navy, navy2)`, radius bottom 28,
  greeting ("Good afternoon,") + name + sub-line, **bell top-right** (badge =
  notifs + invites) + avatar. Faint radial gold glow top-right, giant translucent
  mono "N" watermark bottom-right (`rgba(255,255,255,.05)`).
- **Submit CTA card:** navy-soft icon tile + "Submit your research" + gold chevron.
- **In-progress submission card with stage-progress:** `Submitted → Faculty →
  Dean → Published`; done stages = green dot + green connector, **current = gold
  dot** with `0 0 0 4px rgba(245,166,35,.25)` ring, future = line-gray.
- **Explore:** horizontal category chips (active = navy fill), a "MOST READ"
  featured card (navy band + gold tag).
- Generous spacing — no cramped stat grid.

## Browse (A2) — build to this

- Big "Browse" title, **search bar with a real clear button** (chip-circle × on
  the right), `radius 15`.
- **Recent searches** as navy-soft chips (clock icon on first).
- **"Swipe up & hold — release to explore"** dashed hint card (`1.5px dashed`,
  radius 18), bobbing up-chevron in a navy-soft tile.

## Profile (A3) — build to this

- **Navy banner** `height 120`, radius bottom 26, mono "N" watermark.
- Gold-gradient avatar squircle (`radius 24`, `82×82`) overlapping the banner
  (`margin-top -42`, 4px bg-colored border).
- Name + handle centered.
- Settings rows (navy-soft icon tiles): **Recovery email**, **Password**,
  **Dark mode** (navy toggle switch), **Sign out**.

---

## Global rules

- **Reduced motion:** `@media (prefers-reduced-motion:reduce)` kills every
  animation + transition. Mirror in RN via `useReduceMotion()`.
- **Focus:** `2px solid gold` outline, `offset 2px`.
- **Screen-enter:** subtle fade + 8px rise, ~320ms.
- Dual-theme: every surface has a light and dark value (table above). The app's
  `darkMode` flag stays **off** until a frozen `SubmitResearch` dark pass lands.
