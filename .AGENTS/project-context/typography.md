# Application typography

The existing typography roles remain:

- `--font-sans`: Inter for UI and body text, variable weight 100–900.
- `--font-heading`: DM Sans for headings, variable weight 100–1000.
- `--font-mono`: Geist Mono for code and aligned technical text, weight 100–900.

Since 2026-11-10, `app/layout.tsx` declares these once with `next/font/local`.
The three normal-style Latin WOFF2 files and their OFL licenses are checked in
under `app/fonts/`. Its README records the pinned Fontsource 5.3.0 provenance.
Do not load them from generated `.next` assets or ignored `scratch` files.

This fixes root-layout compilation warnings when Google Fonts cannot be
reached. `next/font/google` serves fonts locally to browsers after downloading
them during compilation; that compilation download was the failing dependency.
Local assets remove it while retaining Next's optimized asset serving,
preloading, CSS variables and `display: swap` behavior. No package dependencies
or application color tokens were changed.

The bundle is about 108 KB total and covers the English UI. Other scripts and
uncovered symbols use system fallbacks; KaTeX retains its independent math
fonts. Broader language/italic coverage should be added as explicit local
assets when needed. Keep monospace fallback monospaced; do not add Arial as its
metric-adjusted fallback.

For verification, compile an ordinary route and load the three resolved font
families with the browser FontFaceSet API at regular/bold weights. Check the
WOFF2 responses, browser diagnostics and absence of Google font requests.
Changing font loading alone does not require persisting any test fixtures.
