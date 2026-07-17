---
name: Character Arc-design-system
description: Design and implement Character Arc product interfaces with its playful, trustworthy, Luma-inspired visual system. Use for any Character Arc frontend task involving Next.js pages, React components, shadcn/ui styling, Tailwind tokens, dashboards, authentication, tools, quizzes, exam preparation, progress views, responsive behavior, interaction states, or visual QA.
---

# Character Arc Design System

Build interfaces that make serious progress work feel inviting. Borrow Luma's clarity, compact controls, contextual color, and warmth without copying its brand, layouts, logo, or signature marketing treatments.

## Read The References

- Read [foundations.md](references/foundations.md) before changing tokens, typography, color, spacing, radius, elevation, or motion.
- Read [components.md](references/components.md) before creating or restyling components.
- Read [patterns.md](references/patterns.md) before designing a page or workflow.
- Read [qa-checklist.md](references/qa-checklist.md) before declaring UI work complete.

## Workflow

1. Inspect the existing route, neighboring components, `app/globals.css`, `components.json`, and available shadcn components. Read the relevant local Next.js guide before using a framework API.
2. Identify the user's job, the primary action, the outcome being viewed, and the minimum information needed on the screen.
3. Choose one contextual tint for the feature. Keep navigation, layout, typography, and most surfaces neutral.
4. Compose the page as a real working product surface. Prefer full-width sections, lists, tables, timelines, and focused tool panels. Use cards only for repeated items or genuinely contained tools.
5. Implement with existing shadcn primitives and Lucide icons. Extend semantic variants instead of scattering one-off classes.
6. Complete loading, empty, error, disabled, success, focus, and long-content states. Preserve the same layout hierarchy on mobile.
7. Run typecheck and lint, then verify the page visually at mobile, tablet, and desktop sizes using the checklist.

## Identity Rules

- Make the experience **clear first, fun second**. Personality should improve recognition and momentum, never compete with the task.
- Use a calm neutral canvas plus several accent families across the product. Never let the whole app collapse into one purple, blue, beige, or dark-slate theme.
- Assign one tint to a tool or domain and use it for icons, small fills, progress marks, selected states, and illustrations. Do not wash the whole page in that tint.
- Use progress trails, evidence stamps, color swatches, compact icon tiles, and purposeful imagery as signature motifs. Do not add decorative blobs, gradient orbs, or fake analytics.
- Keep operational screens dense but breathable. Do not turn dashboards into landing pages or put page sections inside floating cards.
- Use pill geometry for buttons, chips, filters, and segmented controls. Use 8px geometry for cards, fields, rows, and tool panels.
- Use icons for familiar actions and icon plus text for important commands. Add tooltips to unfamiliar icon-only controls.
- Use display typography selectively for page titles and meaningful numbers. Keep forms, navigation, data, and controls in the UI typeface.
- Animate state changes, progress, and overlays. Avoid continuous ambient motion, bounce-heavy effects, and layout-shifting hover states.

## Product Principles

- Show outcomes, not AI theatre. State what changed, what evidence supports it, and what the user can do next.
- Give every tool a visible contract: purpose, inputs, generated content, user action, saved outcome, and analysis.
- Keep personal context boundaries legible. Label local-only, synced, agent-accessible, and private states with text plus an icon.
- Reveal complexity progressively. The default surface should support normal users; advanced block, MCP, API, CLI, and LLM-wiki details belong behind deliberate controls.
- Prefer one strong next step over a grid of equally loud actions.

## Implementation Guardrails

- Reuse semantic CSS variables from the token system. Do not hardcode feature colors repeatedly in JSX.
- Use `FieldGroup`, `Field`, labels, descriptions, and errors for forms.
- Use stable dimensions for controls, charts, quiz choices, progress tracks, and icon tiles.
- Keep text at readable fixed steps; do not scale font size with viewport width and do not use negative letter spacing.
- Maintain WCAG AA contrast, visible keyboard focus, 44px mobile touch targets, and non-color status cues.
- Do not imitate Luma's logo, exact event composition, gradient headline, event artwork, or Recoleta typography.

## Completion Standard

Do not stop after making the happy path attractive. The feature is complete only when it works, communicates its states, fits at all target viewports, and visibly belongs to Character Arc.
