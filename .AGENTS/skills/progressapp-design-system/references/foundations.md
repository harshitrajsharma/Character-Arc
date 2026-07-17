# Foundations

## Source Analysis

Reviewed July 16, 2026:

- [Luma product](https://luma.com/)
- [Luma Discover](https://luma.com/discover)
- [Luma style guide](https://luma.com/style-guide)
- Component sections for `input`, `button`, `text`, `color`, `tint`, and `events`

Observed principles:

- Luma uses a neutral shell and lets images, category icons, tints, and selected controls provide personality.
- Its style guide exposes gray plus cranberry, pink-purple, red, green, blue, purple, yellow, and orange families with roughly ten steps each.
- Default buttons are compact, medium weight, and pill-shaped: commonly 28px or 36px high with about 15-16px radius. Larger calls to action reach 42px.
- Inputs are commonly 36px high with 8px radius; larger variants reach 42px. Error, filled, disabled, accessory, and segmented states retain the same geometry.
- Product typography is a system/Inter-style sans. A characterful display face is loaded selectively for marketing, not globally.
- The tint system derives readable light and dark surfaces, text, borders, and controls from one chosen color.
- Discover pages use compact category tiles, one colored icon, modest borders, muted counts, and clear section rhythm.
- The marketing homepage uses dramatic artwork and gradient headline color. Treat that as campaign expression, not a template for Character Arc's operational UI.

## Character Arc Character

Character Arc should feel like a friendly control room for a person's growth: capable, optimistic, evidence-led, and understandable without technical knowledge.

| Axis | Target |
| --- | --- |
| Playful to formal | 60% playful |
| Quiet to expressive | 55% expressive |
| Editorial to operational | 75% operational |

## Color System

Treat these as design targets. Express them as semantic Tailwind CSS variables in `app/globals.css`; prefer OKLCH when implementing.

The canonical implementation and agent usage contract is
[`css-color-context.md`](../../../project-context/css-color-context.md). It
defines the current shadcn roles, brand derivatives, immersive canvas palette,
status rules, recipes, and change process. Read it before modifying color
tokens.

### Neutral Roles

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `canvas` | `#F7F7FA` | `#111114` | App background |
| `surface` | `#FFFFFF` | `#1A1A1F` | Primary panels |
| `surface-subtle` | `#F0F0F5` | `#222229` | Hover, secondary rows |
| `ink` | `#19191D` | `#FAFAFC` | Primary text and neutral action |
| `ink-muted` | `#6B6973` | `#AAA7B2` | Secondary text |
| `line` | `#E3E2EA` | `#303039` | Borders and dividers |

### Accent Families

| Family | Anchor | Suggested domain |
| --- | --- | --- |
| Neon | `#2323FF` | Character Arc brand, focus, and selected states |
| Berry | `#E93D82` | Quizzes and memorable moments |
| Violet | `#7658E8` | Exams and structured learning |
| Sky | `#3988E8` | Career paths and opportunities |
| Green | `#2FAE72` | Skills and verified progress |
| Amber | `#E7A526` | Connectors, reminders, attention |
| Coral | `#F06459` | Deadlines, destructive and recovery states |
| Cyan | `#25A7B8` | Knowledge, sync, and LLM-wiki context |

Generate at least four useful roles from an accent rather than using arbitrary opacity everywhere:

- `tint-solid`: icon or selected control with accessible foreground.
- `tint-soft`: low-emphasis background.
- `tint-line`: border, divider, or progress track.
- `tint-ink`: readable tinted text on neutral or soft surface.

Use Neon sparingly as the product identity accent: logo details, focus rings,
primary selected states, and low-opacity background light. Keep large surfaces
neutral so the electric blue retains its energy.

### Shadcn Semantic Mapping

- `background` is the off-white app canvas in light mode and the near-black
  canvas in dark mode; `card` and `popover` remain distinct surfaces.
- `primary` is neutral ink, not a brand color. Use it for routine submit and
  save actions; reserve Neon for focus, identity, and selected states.
- `secondary` and `muted` are quiet neutral surfaces. `accent` is one step
  stronger so hover and selected states remain visible.
- `ring` maps to the mode-aware Neon line role.
- Chart colors use the mode-aware Neon, Cyan, Violet, and Amber ink roles plus
  a green fifth series. Do not use a monochrome chart scale for comparison.
- Every brand family exposes base, `soft`, `line`, `ink`, and `foreground`
  roles. Prefer these semantic roles over opacity modifiers or numbered shades.

Keep semantic status independent from feature tint. Success is green, warning is amber, danger is coral-red, and information is sky blue. Always pair status color with text or an icon.

## Typography

- UI and body: Inter, 400-600.
- Display and headings: DM Sans, 500-700. Use only for page titles, section titles, and large progress values.
- Monospace: Geist Mono for IDs, code, CLI commands, percentages in technical summaries, and timestamps where alignment matters.

| Role | Size / line | Weight |
| --- | --- | --- |
| Display | 44 / 48 | 600 |
| Page title | 32 / 38 | 600 |
| Section title | 24 / 30 | 600 |
| Panel title | 18 / 24 | 600 |
| Body | 16 / 24 | 400 |
| UI label | 14 / 20 | 500 |
| Caption | 12 / 16 | 500 |

Do not use hero-scale typography inside cards or compact product panels. Do not use negative letter spacing.

## Geometry

- Spacing grid: 4px.
- Core spacing: 4, 8, 12, 16, 24, 32, 48, 64px.
- Card, field, and tool panel radius: 8px.
- Small tile and inline surface radius: 6px.
- Overlay radius: 12px.
- Buttons, chips, avatars, and segmented controls: pill radius.
- Default control heights: 28px compact, 36px standard, 44px prominent or mobile.
- Icon tiles: 32px compact, 40px standard, 48px expressive.

## Elevation

Use borders and surface contrast before shadows.

- Card: 1px semantic border, no shadow by default.
- Interactive hover: subtle surface shift and border emphasis.
- Popover: `0 8px 28px rgb(0 0 0 / 0.14)` plus border.
- Modal: `0 20px 60px rgb(0 0 0 / 0.22)` plus backdrop.

## Motion

- Control feedback: 120-150ms.
- Rows, tabs, and progress changes: 180-220ms.
- Overlays: 180-240ms.
- Use ease-out on entry and ease-in on exit.
- Respect `prefers-reduced-motion`.
- Never change element dimensions on hover.
