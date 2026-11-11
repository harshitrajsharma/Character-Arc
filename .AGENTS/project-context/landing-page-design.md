# Public landing page — November 2026

## Purpose

The anonymous `/` page helps a new visitor understand the current product,
recognize a useful study workflow and choose whether to create an account.
The signed-in route still verifies the session and redirects to `/workspace`.
Auth outages must not be caught and presented as an anonymous landing session.

The current flagship workflow is Exam Prep plus canonical Assessments. The
page therefore leads with syllabus → subject tests → evaluated review, while
explaining optional authorized agent use after the core experience is clear.
Goals & Paths is retained in the application but is not advertised as this
release's main demonstration.

## Findings and design decisions

- The previous centered AI-first headline and repeated text sections did not
  show the working product or make subject/assessment connections concrete.
- Scroll-triggered Reveal wrappers initially rendered sections at opacity zero.
  This produced blank below-fold regions in a full-page capture and depended
  on hydration/intersection observation to expose ordinary marketing content.
- Universal ChatGPT/Claude/"any agent" language exceeded the actual supported
  header-based MCP connection. A blanket private-by-default claim also hid the
  distinction between workspace membership, tool grants and item access flags.
- The new page uses an asymmetric hero and one contained interactive example
  workspace. Its subject, test and review tabs retain the same Linear Algebra
  context. This is the page's signature visual rather than unrelated artwork,
  decorative orbs or invented customer/analytics numbers.
- A real three-step sequence explains the connected study loop. Separate tool
  rows explain Exam Prep and Assessments without another decorative card grid.
  Optional agent guidance and native FAQ disclosures explain connection and
  viewport requirements. Actual signup/login links remain the account actions.

## Presentation and implementation

- Existing Inter body / DM Sans heading / Geist Mono utility faces and semantic
  neutral, violet, cyan and success derivatives are reused. No new global color
  tokens, external images, fonts or design-system overrides are introduced.
- Navigation explicitly uses `bg-transparent backdrop-blur-xl` (24px), matching
  the requested tint-free app glass. Selection, focus and semantic text keep
  their normal roles. Desktop anchors collapse out of the phone header while
  real Sign in / Get started commands remain visible.
- All ordinary sections and the container primitive are server components.
  The old Framer Motion Reveal dependency is removed from the landing tree.
  Content is server-visible without JavaScript and does not need animation.
- Only `LandingWorkspacePreview` is an interactive client island, composed from
  the existing Base UI Tabs, Button and Badge primitives. It performs no fetches
  or mutations. The preview is explicitly labeled illustrative, not live
  account data; its sample rank answer is mathematically correct.
- Native details/summary FAQ works without JavaScript. Keyboard tabs use the
  shared manual-activation behavior (arrow navigation, Enter to select).
  A skip link, readable fixed type steps, 44px commands and reduced-motion-safe
  styling support accessibility. Viewport validation includes 320px and short
  landscape, beyond the usual phone/tablet/desktop checks.
- Timed tests require at least 1024 × 600; preparation, management and result
  review remain available on phones. MCP guidance names Streamable HTTP and
  custom Bearer headers, and honestly states that OAuth-only/legacy SSE clients
  are unsupported. No universal-client or automatic mastery claims are made.

## Verification

`npx tsx scripts/e2e-landing-review.ts` uses a fresh anonymous browser context.
It checks 12 light/dark responsive layouts (1440, 1024, 768, 390, 320 and 844px),
tab/button workflow and keyboard activation, FAQ disclosures, skip navigation,
real sign-in destination, tint-free blur, command dimensions/containment and
server-visible content with JavaScript disabled. POST/PUT/PATCH/DELETE are
blocked; no login, signup submission, assessment fixture or attempt is created.

Artifacts are ignored `scratch/landing-*.png`, `landing-browser.json` and
`landing-{browser,lint,typecheck,format-final}.log`. The coordinator records the
final integrated production build and required application E2E run in
PROJECT_LOGS. A dedicated landing browser run does not certify account creation,
grading, external MCP clients or physical assistive technology.
