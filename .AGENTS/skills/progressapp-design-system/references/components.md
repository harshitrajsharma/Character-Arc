# Components

## Buttons

Use five behavioral variants: solid neutral for the main save or submit action, tint for feature-specific creation, soft neutral for secondary actions, ghost for toolbars, and danger for destructive confirmation only.

- Use 36px standard height, 28px compact height, and 44px for prominent or mobile actions.
- Keep text commands short. Use a leading Lucide icon when it improves recognition.
- Use icon-only buttons for familiar actions. Provide `aria-label` and a tooltip.
- Show pending state in-place with a spinner and stable width.
- Do not use accent color for every button on a page.

## Inputs

- Use 8px radius and at least 40px default height; use 44px on mobile-first forms.
- Preserve geometry across default, hover, focus, filled, invalid, disabled, and read-only states.
- Put labels above fields. Keep helper or error text directly below.
- Use embedded icons only when they explain or directly operate on the field.
- Use grouped fields only when the parts form one value.

## Pills And Segments

- Pills represent filters, tags, status, compact counts, or removable selections.
- Segmented controls switch among 2-4 peer modes. Tabs switch between views.
- Use filled tint for selected state and neutral ghost treatment for unselected peers.
- Do not use a pill as a decorative container for arbitrary prose.

## Cards, Rows, And Sections

- Card: one repeated entity with an independent click target, such as a tool, career path, assessment, connector, or saved quiz.
- Row: scan-heavy records, recent activity, skills, evidence, attempts, and sync history.
- Section: full-width page grouping with heading and optional command. Do not float every section as a card.
- Never nest a decorative card inside another card.
- Keep card radius at 8px. Use one icon tile or inspectable image as the personality anchor.

## Navigation

- Desktop: restrained app bar or sidebar with icon plus label. Use one unmistakable selected state.
- Mobile: prioritize 3-5 frequent destinations and move secondary destinations into a menu.
- Keep global navigation neutral. Tool colors appear after entering the tool context.
- Breadcrumbs show hierarchy; tabs show sibling views.

## Progress

Progress is evidence, not decoration.

- Show the number, denominator or target, last update, and evidence source where possible.
- Use a stable track with tinted fill and a text label. Never rely on color alone.
- Use rings only for one headline metric. Use bars or rows for comparison.
- Distinguish completion, confidence, consistency, and mastery.
- Animate only from the previous known value to the new value.

## Evidence Stamps

Use a compact icon, short label, and optional timestamp for facts such as `Mock test`, `Agent import`, `Manual`, `Verified`, or `Local only`. Use outline or soft tint, and open the underlying evidence when clicked.

## Tool Cards

Every installed tool card should show its icon and name, one-sentence purpose, current state, most useful recent outcome, one primary command, and an overflow menu. Do not explain MCP, APIs, storage architecture, or agent contracts on the default card.

## Quiz And Assessment UI

- Keep the question stem in an unframed reading column.
- Present choices as stable 44px-minimum rows with marker, text, and selected state.
- Keep navigation, timer, index, and submission separate from answer choices.
- After evaluation, show correctness, explanation, source, confidence, and next-topic action.
- Use green/red only for evaluation, never for unsubmitted choices.
- Preserve keyboard navigation and screen-reader labels.

## Skills And Career Paths

- Use lists or matrices for comparison; use cards only for a curated shortlist.
- Show current evidence, target, gap, and next action separately.
- Label AI-inferred values and let users correct them.
- For opportunities, show freshness, source, eligibility, deadline, and why it matches.

## Blocks And Privacy

- Display block type through icon and label, not color alone.
- Represent local-only, synced, and agent-accessible as explicit privacy states.
- Confirm before expanding agent access or syncing private context.
- Keep raw JSON, schema version, IDs, and manifests in an advanced inspector.

## Empty, Loading, And Error States

- Empty: explain what belongs here and provide one direct action with a small relevant visual.
- Loading: use skeletons matching final geometry.
- Error: state what failed, what remains safe, and the recovery action.
- Success: confirm the saved outcome near the action rather than interrupting routine work.
