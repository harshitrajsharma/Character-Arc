# Character Arc CSS Color Context

This document is the color contract for humans and AI agents working on the
Character Arc frontend. The implemented source of truth is
[`app/globals.css`](../../app/globals.css). Use this guide to decide which
semantic token belongs in a component and when a new token is justified.

## Core Rule

Choose color by **meaning and UI role**, never by which swatch looks attractive
in isolation.

Use this order:

1. Use a shadcn semantic token for ordinary application structure.
2. Use one brand family for feature identity, focus, or a selected state.
3. Use a status color only when communicating status.
4. Use a canvas color only for an intentionally immersive page or editor.
5. Add a token only when none of the existing semantic roles is correct.

Do not hardcode hex, RGB, HSL, or OKLCH values in JSX. Do not rebuild a color
with arbitrary opacity when an existing semantic token already expresses the
role.

## Token Architecture

The color system has four layers.

### 1. Application Neutrals

These are the default for most product UI. They automatically adapt to light
and dark mode.

| Tailwind utility                         | CSS variable                            | Use                                         |
| ---------------------------------------- | --------------------------------------- | ------------------------------------------- |
| `bg-background text-foreground`          | `--background`, `--foreground`          | Page shell and primary text                 |
| `bg-card text-card-foreground`           | `--card`, `--card-foreground`           | Repeated cards and contained tools          |
| `bg-popover text-popover-foreground`     | `--popover`, `--popover-foreground`     | Menus, popovers, and floating panels        |
| `bg-primary text-primary-foreground`     | `--primary`, `--primary-foreground`     | Routine primary commands                    |
| `bg-secondary text-secondary-foreground` | `--secondary`, `--secondary-foreground` | Secondary buttons and quiet controls        |
| `bg-muted text-muted-foreground`         | `--muted`, `--muted-foreground`         | Subdued rows, metadata, and inactive UI     |
| `bg-accent text-accent-foreground`       | `--accent`, `--accent-foreground`       | Hover and locally emphasized neutral states |
| `border-border`                          | `--border`                              | Default dividers and component boundaries   |
| `border-input`                           | `--input`                               | Input boundaries                            |
| `ring-ring`                              | `--ring`                                | Keyboard focus                              |

Use neutral tokens for navigation, dashboards, settings, tables, normal forms,
tool catalogs, and other repeated operational surfaces. Most screens should be
mostly neutral.

### 2. Brand Families

Character Arc has four accent families. Each family exposes a base plus
semantic derivatives generated with `color-mix(in oklch, ...)`.

| Family | Intent                                             | Typical domains                                    |
| ------ | -------------------------------------------------- | -------------------------------------------------- |
| Neon   | Product identity, active focus, decisive selection | Logo detail, focus ring, current tab, AI/work mode |
| Cyan   | Knowledge, context, synchronization, clarity       | LLM-wiki, imports, evidence, information structure |
| Violet | Structured learning, interpretation, exploration   | Exams, quizzes, skill analysis, generated insight  |
| Amber  | Time, attention, momentum, milestones              | Deadlines, connectors, reminders, day progress     |

> **Legacy alias:** the mock-tests tool UI predates this contract and uses a
> `brand-berry` family (`bg-brand-berry-soft`, `text-brand-berry-ink`, ...).
> `--brand-berry-*` is defined in `app/globals.css` as an alias of the violet
> family (the designated exams/structured-learning family), not as a new hue.
> Prefer `brand-violet-*` in new code.

Every family has these roles:

| Suffix          | Example                       | Use                                                         |
| --------------- | ----------------------------- | ----------------------------------------------------------- |
| Base            | `bg-brand-cyan`               | Small solid icon tiles, progress marks, selected indicators |
| `soft`          | `bg-brand-cyan-soft`          | Low-emphasis tinted background                              |
| `surface`       | `bg-brand-cyan-surface`       | Tinted repeated cards or rows inside a neutral tool panel   |
| `surface-hover` | `bg-brand-cyan-surface-hover` | Hover or keyboard-focus surface for a tinted repeated item  |
| `line`          | `border-brand-cyan-line`      | Tinted border, track, divider, or focus-adjacent line       |
| `ink`           | `text-brand-cyan-ink`         | Readable tinted text on neutral or soft backgrounds         |
| `foreground`    | `text-brand-cyan-foreground`  | Text or icons placed directly on the base color             |

Correct composition:

```tsx
<div className="border border-brand-cyan-line bg-brand-cyan-soft text-brand-cyan-ink">
  Synced context
</div>

<span className="bg-brand-cyan text-brand-cyan-foreground">
  <BookOpenIcon aria-hidden="true" />
</span>
```

Do not use the base accent as body text. Use its `ink` role. Do not assume white
is readable over every accent; use the matching `foreground` role.

### 3. Immersive Canvas Colors

Canvas colors are mode-aware page backgrounds for focused creation or
customization workflows. They are not general-purpose card colors.

The dark variants share approximately `OKLCH L=0.30`. This is a deliberate
invariant: themes should feel different through hue and chroma without some
themes collapsing into black or becoming much louder than others.

| Tailwind utility      | Foundation token    | Meaning and recommended use                        |
| --------------------- | ------------------- | -------------------------------------------------- |
| `bg-canvas-minimal`   | `--canvas-graphite` | Neutral, serious, content-first creation           |
| `bg-canvas-electric`  | `--canvas-electric` | High-focus work, technical or AI-assisted creation |
| `bg-canvas-signal`    | `--canvas-emerald`  | Momentum, direction, active progress               |
| `bg-canvas-afterglow` | `--canvas-wine`     | Reflection, personal meaning, memorable moments    |
| `bg-canvas-golden`    | `--canvas-golden`   | Milestones, time horizons, important plans         |

The foundation utilities `bg-canvas-graphite`, `bg-canvas-wine`, and
`bg-canvas-emerald` are also available when the visual color is needed without
the Arc-theme naming.

Use a canvas color when all of these are true:

- The workflow is focused and finite, such as creating an Arc or customizing a
  visual artifact.
- The color can cover the complete page behind the navbar.
- Inner controls remain legible in both modes.
- The theme is user-selected or strongly connected to the workflow.

Do not use canvas colors for ordinary dashboards, settings pages, tool lists,
or as backgrounds for many cards. Do not place one canvas color inside another.

On an immersive canvas, use subtle glass surfaces instead of darkening panels
with the global background:

```tsx
<div className="border border-foreground/10 bg-foreground/[0.045] backdrop-blur-xl focus-within:bg-foreground/[0.07]">
  ...
</div>
```

The shared Create Arc implementation lives in
[`components/tools/create-arc/arc-form-styles.ts`](../../components/tools/create-arc/arc-form-styles.ts).

### 4. Status And Data Colors

Status meaning must remain independent from feature branding.

| Meaning                              | Color direction           | Rule                                     |
| ------------------------------------ | ------------------------- | ---------------------------------------- |
| Success or verified progress         | Green                     | Pair with success text or icon           |
| Warning or attention                 | Amber                     | Explain what needs attention             |
| Error, danger, or destructive action | `destructive` / coral-red | Use only for a real error or risk        |
| Information                          | Blue or cyan              | Use for neutral information, not success |

Success utilities follow the same role pattern as brand families:
`bg-success`, `bg-success-soft`, `border-success-line`, `text-success-ink`,
and `text-success-foreground`. Use them only for verified completion or saved
positive outcomes.

Never communicate status through color alone. Include text, an icon, shape, or
explicit label. A cyan Exam Prep feature does not make every positive result
cyan; verified success remains green.

Use `chart-1` through `chart-5` for comparative data. Keep chart series stable
within one visualization and provide labels or legends. Do not invent a new
monochrome scale for each chart.

## Common Recipes

### Default Application Page

```tsx
<main className="bg-background text-foreground">
  <section className="border-border">
    <p className="text-muted-foreground">Supporting context</p>
  </section>
</main>
```

### Feature Identity Tile

Choose one family for the feature and keep surrounding surfaces neutral.

```tsx
<span className="flex size-10 items-center justify-center rounded-md bg-brand-violet-soft text-brand-violet-ink">
  <BrainIcon aria-hidden="true" />
</span>
```

### Selected Or Focused State

Use Neon sparingly so it retains meaning.

```tsx
<button className="border-brand-neon-line bg-brand-neon-soft text-brand-neon-ink focus-visible:ring-ring">
  Current tool
</button>
```

### Primary Command

Routine actions use neutral primary styling. Neon is not the default submit
button color.

```tsx
<Button>Save changes</Button>
```

### Privacy Or Permission State

Use neutral UI with explicit copy and an icon. Privacy is not a decorative
accent category.

```tsx
<Badge variant="outline">
  <LockKeyholeIcon aria-hidden="true" />
  Private
</Badge>
```

### Destructive State

```tsx
<Alert variant="destructive">
  <CircleAlertIcon aria-hidden="true" />
  <AlertTitle>Arc not created</AlertTitle>
</Alert>
```

## Choosing A Feature Color

Use one primary accent family per tool or domain. The family helps recognition;
it does not repaint the entire interface.

1. Identify the domain meaning.
2. Choose the closest brand family from the table above.
3. Use `soft` for backgrounds, `line` for boundaries, `ink` for readable tinted
   text, and the base only for small strong marks.
   Use `surface` and `surface-hover` only for repeated interactive entities that
   need stronger category recognition than a quiet section tint.
4. Keep routine controls and text neutral.
5. Keep status colors semantically correct even when they differ from the
   feature family.

When multiple tools appear together, their assigned families may differ. When
one tool is open, avoid using several accent families at equal visual weight.

## Light And Dark Mode

- Always use semantic utilities instead of `dark:` color pairs when a token
  already handles both modes.
- Canvas tokens have intentional light and dark values. Do not add opacity to
  compensate for one mode without checking the other.
- Test text, borders, muted content, hover, focus, disabled, and glass surfaces
  in both modes.
- A color that is accessible in dark mode may fail in light mode. Validate both.
- Preserve the dark-canvas `L=0.30` invariant unless the design system itself is
  being intentionally revised.

## Anti-Patterns

Agents must not:

- Hardcode visual colors in JSX or component-specific CSS.
- Use `bg-brand-neon` for large page backgrounds.
- Use `text-brand-*` base colors for paragraphs.
- Apply a feature tint to every card, heading, and button.
- Use canvas colors on ordinary operational pages.
- Stack cards inside tinted cards to manufacture hierarchy.
- Create decorative gradients, color blobs, or glows without a product purpose.
- Treat warning amber as a generic warm decoration.
- Treat green as a generic feature color when the UI also uses green for
  success.
- Add a new hue because an existing token is slightly different from a mockup.
- Change a raw OKLCH value without checking all utilities that reference it.

## Adding Or Changing A Color

Color-system changes have broad impact. Follow this sequence:

1. Confirm that an existing semantic role cannot express the need.
2. Define mode-aware raw tokens in `:root` and `.dark` in `app/globals.css`.
3. For a brand family, derive `soft`, `line`, and `ink` roles with
   `color-mix(in oklch, ...)` instead of scattered opacity values.
4. Export the token through `@theme inline` so Tailwind utilities are generated.
5. Assign a documented semantic purpose; do not add an unnamed swatch.
6. Update this document and the design-system foundations if the intent changes.
7. Run formatting, lint, and typecheck.
8. Verify compiled CSS contains the token and utility.
9. Visually test light and dark mode at mobile and desktop widths.
10. Check contrast and verify that status is not color-only.

## Agent Completion Checklist

Before finishing UI work involving color, verify:

- The page is primarily neutral unless it is an approved immersive canvas.
- One feature family carries most contextual color.
- Base, soft, line, ink, and foreground roles are paired correctly.
- Status colors retain their universal meanings.
- Canvas color covers the full page behind the fixed navbar.
- Glass surfaces lift from the canvas rather than becoming darker blocks.
- Focus rings remain visible.
- Text passes WCAG AA for its size and weight.
- Light and dark modes both work.
- No visual color is hardcoded outside the token source of truth.



### 5. Overlay Surfaces (Dialogs, Sheets & Drawers)

All modal overlays, settings dialogs, and slide-over sheets follow the unified glass layer hierarchy:

| Surface Layer | Tailwind Utility | Role |
| ------------- | ---------------- | ---- |
| **Modal / Sheet Shell** | `bg-popover/60 backdrop-blur-2xl ring-1 ring-foreground/5 dark:ring-foreground/10` | Translucent glass container with soft outer ring |
| **Header Bar** | `bg-muted/20 border-b border-border/60 px-6 py-3.5` | Compact header bar containing domain icon tile and title |
| **Inset Sections & Rows** | `bg-card` or `bg-muted/20 border border-border/60 rounded-2xl` | Inset grouped settings and detail cards |
| **Sticky Footer** | `bg-muted/10 border-t border-border/60 px-6 py-3` | Action bar with thumb-reachable controls |

Rules:
- Do not wash full dialog containers with brand colors. Keep container backgrounds neutral (`bg-popover/60`).
- Use domain accents (`brand-violet`, `brand-cyan`, `brand-amber`, `brand-neon`) strictly for small icon tiles (`size-8 rounded-xl bg-brand-*-soft text-brand-*-ink`) and progress indicators.
- Settings dialogs follow the two-column split layout: sidebar navigation on the left, grouped form sections on the right, and a unified action footer at the bottom.


## Recessed content surfaces (2026-10-19)

- `bg-surface-inset` is the neutral surface for revealed content inside a containing card, such as question previews. It aliases muted in light mode and background in dark mode, keeping it visually below bg-card in both themes. Plain bg-muted cannot provide this role because it becomes lighter than the card in dark mode.
- Pair it with `inset-shadow-recessed` for a subtle inward top edge. This shared shadow derives its color from brand-contrast; components do not hardcode shadow colors.
- Keep the summary on bg-card. Nested answer choices may use bg-card to sit above the recessed well; correct answers retain the existing success tokens.
