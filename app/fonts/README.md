# Character Arc fonts

The root layout loads these checked-in WOFF2 files with `next/font/local`.
Development and production compilation must not fetch Google Fonts. Preserve
the existing `--font-sans`, `--font-heading` and `--font-mono` variables.

| Asset | Family | Weights | Source |
| --- | --- | --- | --- |
| dm-sans-latin-variable.woff2 | DM Sans | 100–1000 | @fontsource-variable/dm-sans@5.3.0 |
| inter-latin-variable.woff2 | Inter | 100–900 | @fontsource-variable/inter@5.3.0 |
| geist-mono-latin-variable.woff2 | Geist Mono | 100–900 | @fontsource-variable/geist-mono@5.3.0 |

These are the normal-style Latin `wght` assets from the packages' `files/`
directories. Their upstream source is the Google Fonts collection. Each font's
unmodified SIL Open Font License is included alongside it. Only the three
needed assets are vendored; the npm packages are not runtime dependencies.

The bundled subset covers the app's English UI. Other scripts/symbols use the
declared system fallback; KaTeX retains its own math fonts. If broader font
coverage is required, bundle the corresponding assets instead of restoring a
compile-time network dependency. These asset files must be committed with the
layout change; do not put them in ignored scratch or generated build folders.
