# Product Patterns

## App Shell

- Keep the shell quiet: brand, workspace, primary navigation, search or command entry, and account.
- Constrain main content to roughly 1200-1280px while allowing tables and assessments more width.
- Use a 64px desktop header or a stable sidebar. Do not combine both without a workflow need.

## Dashboard

Order content by usefulness: current focus and one next action, recent progress trail, outcomes from installed tools, attention items, then tool discovery. Do not lead with a marketing hero or a uniform grid of metric cards.

## Tool Catalog

- Treat tools like connectors: searchable, grouped, and opt-in.
- Use human categories: Learn, Plan, Decide, Track, Practice, Connect.
- Use compact cards with colored icon tiles on a neutral catalog.
- Show installed and setup states without implementation jargon.

## Tool Workspace

Use a compact identity bar, input/configuration panel, generated content canvas, outcome analysis, then history or evidence trail. Do not put the main canvas inside a decorative preview card.

## Exam Preparation

- Overview: exam facts, next milestone, coverage, recent performance, and weak areas.
- Syllabus: hierarchical list with progress and evidence per topic.
- Practice: quiz and flashcard entry points with recent sets.
- Mock tests: pattern, duration, attempt state, score, and review action.
- Analysis: accuracy, time, confidence, negative marking, and trend as separate measures.

Use Violet as context and reserve green, amber, coral, and sky for semantic data.

## Career Paths

Group paths into jobs, exams, further study, entrepreneurship, and adjacent options. Provide freshness and source links, explain fit through user evidence, and compare paths in rows or a matrix. Use Sky as context and avoid presenting AI recommendations as certain.

## Skills Inventory

Separate observed, inferred, desired, and habit skills. Let users correct ratings and attach evidence. Use bars for current-to-target gaps, not decorative radar charts. Keep one recommended next practice visible per skill. Use Green as context.

## Auth And Onboarding

Keep sign-in focused and trustworthy. Use one expressive desktop panel and collapse to the form on mobile. Ask only for required account data. Onboarding should establish current reality, one goal, and privacy preference before connectors or LLM-wiki setup.

## Mobile

Stack comparison layouts into labeled rows rather than shrinking desktop grids. Keep the primary command reachable without covering content. Use sheets for filters and secondary setup. Preserve 44px targets and contain long labels.

## Anti-Patterns

- Marketing hero as the authenticated dashboard.
- A card around every section or cards nested inside cards.
- Purple gradient everywhere because the product uses AI.
- Decorative charts with no decision attached.
- Exposing MCP, CLI, JSON, sync internals, or block schemas by default.
- Multiple saturated buttons competing in one viewport.
- Large empty layouts that hide useful information below the fold.
- Color-only progress, privacy, assessment, or error meaning.
- Copying Luma's gradient headline, logo, event art direction, or exact styling.
