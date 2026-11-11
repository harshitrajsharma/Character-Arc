# Score trend: purpose and redesign

2026-10-29. User requested planning followed by implementation, preserving the assessment page's segmented design.

## Intended job

Compare recent scored attempts, identify the result behind each score, inspect its stored marks/date, and open the corresponding analysis. Full audit/history belongs in the chronological list below. This view does not measure mastery or prove improvement across changed papers.

## Problems in the previous plot

- A stretched SVG distorts markers; only endpoint dates and the axis extremes are shown.
- Scores are not labeled at their plotted positions. Readers must match a separate link grid to an unlabeled line.
- Equal-spaced results resemble a continuous time series. Two competing benchmark lines have no direct relationship to the selected result.
- There is no selection, useful tooltip, keyboard/touch inspection or clear next action attached to a point.
- Raw-score denominators differ in the actual sample (41/50, 2/4, 3/4). Percentages are mathematically valid but do not establish comparable assessment difficulty.

## Design and interaction plan

1. Use a discrete column comparison, oldest to newest, with at most **five latest valid scored attempts**. This is a deliberate recent-results window that leaves enough space for labels and touch targets on phones. The actual total is disclosed; the full paginated attempt history remains below.
2. Label every column with its percentage; show a real percentage scale/grid and each attempt's date/time in IST. Retain a zero baseline, negative values and scores above 100%. Use the existing shadcn Chart/Recharts integration; do not stretch a hand-authored SVG.
3. Select the latest result initially. Clicking/tapping/focusing a column selects it. Left/Right and Home/End navigate within the chart; Enter/Space also activate it. Provide native 44px Prev/Next controls as an alternative. Visible selection outline and textual selected-result identity supplement color.
4. Put the selected result's full timestamp, percentage, earned/maximum marks, change in percentage points from the previous result shown, and a direct Review attempt action beside the chart on desktop and below it on mobile. The first result shown does not imply that no earlier attempt exists.
5. Remove benchmark lines and their plot props. Current targets already have their own labeled marking section. Show a quiet explicit changed-total warning when applicable; do not turn a percentage difference into a mastery/improvement claim.
6. Keep Score trend optional within Your attempts. Its collapsed summary includes the latest percentage; expansion states the visible range/order. Split plot-library code into a dynamic module and mount the chart on expansion, with a matching skeleton. A scoped rendering/chunk failure leaves textual result inspection/review available. Framework development prefetch can request the small chart-definition module before expansion; deferred mounting does not guarantee zero prefetched requests.
7. Keep shared semantic tokens, stable typography, honest dates and native links. Zero results have no fabricated plot; one result has an inspectable result with an explanation that another result is needed for comparison. Provide an accessible text data alternative. Disable chart animation for consistent reduced-motion and keyboard/touch behavior.

## Engineering boundary

- A pure bounded score-trend model owns validity filtering, deterministic chronological ordering, stored-denominator percentages and chart bounds. No authoritative scoring, persistence or authorization moves into presentation.
- The existing authenticated overview read continues to scope workspace/assessment/user. Its trend bound becomes the shared five-result constant; personal history paging and active/latest reads are unchanged.
- Use the existing ChartContainer/tooltip and Button/AttemptAction/Alert/Skeleton primitives. Keep plot-library code in a lazily imported module; shared chart primitives are not globally restyled.
- The actual TCS iON player, grading, publication/sharing, database schema and tool registry remain outside this change.

## Acceptance checks

- Actual three-result sample: 82%, 50%, 75%; stored marks 41/50, 2/4, 3/4; latest 75% and 25 percentage points versus the previous result. Mixed-total warning remains visible.
- Zero/one/five/more-than-five results; stable date/ID ties; same-day times; zero/negative/over100%/fractional scores; invalid or ungraded records; no mutated input array.
- Click/tap, keyboard focus/arrows/Home/End/activation, Prev/Next bounds, selected review URL, collapse/reopen, lazy loading/failure and identity change.
- Phones at 320/390px, tablet at 768px and desktop at 1440px in light/dark; five-point labels/hit targets; no document or chart overflow; readable grid/contrast, no distorted shapes; reduced motion.
- Relevant unit/render checks, typecheck/lint, focused browser checks and the mandatory full assessment E2E suite. Update this plan and PROJECT_LOGS.md with actual results rather than treating the matrix as completed coverage.

## Implementation and focused verification

- Implemented using the installed Recharts 3.9 API and existing ChartContainer, tooltip, Alert, Button and AttemptAction primitives. Pure score-trend helpers and the server read share SCORE_TREND_LIMIT. Selection context updates individual columns inside a memoized chart canvas, preserving SVG keyboard focus without recalculating chart geometry on every selection. Conditional mounting plus a scoped error boundary keep the textual inspector usable independently of the plot.
- The actual three-result assessment passed exact percentage/mark/change checks, tooltip inspection, click/focus/arrow/Home/End/Enter selection, native Prev/Next bounds, selected review destinations and selection persistence across collapse/reopen. Its existing records were not changed.
- Read-only Playwright passed eight light/dark layouts at 320×640, 390×844, 768×1024 and 1440×900 with five dated columns, 44px hit areas/native commands and no document/chart overflow. Fixture checks covered zero/one/more-than-five results, same-day times, zero/negative/over-100% scores and reduced motion. Desktop/phone/light/dark/negative and actual-assessment captures were inspected. The normal run recorded zero page/hydration errors and zero assessment mutations.
- Measured axis/direct-label contrast exceeded 4.5:1 and both selected/unselected column fills exceeded 3:1 in both themes. A deliberately throwing ResizeObserver tested the scoped rendering fallback; native selection and the selected review destination remained usable. This was a render-failure check, not a simulated network chunk failure or formal accessibility certification.
- Initial browser checks found and resolved SVG focus loss on selection and intrinsic overflow from applying sr-only directly to a table. The accessible table now sits inside an sr-only wrapper. Pixel measurements allow a 0.5px floating-point tolerance around the designed 44px SVG hit width.
- The authenticated synthetic-data route used for visual checks was removed and Next route types regenerated. Evidence lives in ignored scratch/score-trend-browser.{log,json}, score-trend-contrast.json, score-trend-contrast-failure.log and score-trend-*.png. The development server prefetched a small chart-definition chunk before expansion, but the plot mounted only after expansion; no production bundle or physical assistive-technology test is claimed.
- Focused model/render regressions passed 25 tests / 105 assertions across score-trend, assessment-overview and question-presentation. Formatting, full TypeScript noEmit, targeted ESLint without warnings and scoped diff checks passed. The mandatory full assessment browser suite passed authoring/picker/assembly, publication, phone restriction, supported exam/calculator/answering/submission, analysis, management, the single-result inspector/review destination, sharing and the anonymous fixture heading/route. Its inspector assertion compares the actual recorded result rather than assuming automated answers earn 100%. Evidence: scratch/score-trend-e2e-verified.log and score-trend-{typecheck,lint,tests}-final.log; final script lint is score-trend-e2e-lint-final.log.
