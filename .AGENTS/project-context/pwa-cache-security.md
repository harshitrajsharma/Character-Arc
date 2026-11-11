# PWA cache privacy — 2026-11-11

Character Arc's installed-app support caches only public assets and a generic
offline notice. Private study pages, assessments, responses, results and account
data require a verified online request. PWA installation does not make those
records available offline.

## Corrected boundary

The former `character-arc-v1` service worker cached every successful navigation,
ignored private/no-store response headers and precached `/`. A signed-in root
redirect could therefore store a private Workspace response under `/`; an
offline URL-matched fallback could replay private HTML after logout.

`public/sw.js` now uses `character-arc-public-v2`:

- Installation fetches an explicit public asset list and `/offline`, never `/`,
  with credentials omitted. Optional asset failures do not prevent the privacy
  update from activating. Private, no-store, redirected, opaque, personalized
  (`Vary: Cookie`/Authorization/*) and RSC responses are rejected for caching.
- Activation removes older `character-arc-*` caches, including any legacy
  private navigation entries, while preserving unrelated caches on the origin.
- Navigations go to the network with no-store and are never persisted. A network
  failure returns only the current generic offline notice or a plain 503 notice;
  it never looks up the requested private URL in any cache. Server 401/403/5xx
  responses retain their normal meaning rather than becoming an offline success.
- RSC, Server Actions, API calls, header-auth requests, cross-origin requests,
  query/signed URLs and arbitrary image/file paths bypass Cache API handling.
- Only explicit public assets and `/_next/static/` assets are cache candidates.
  Build assets must be marked immutable. HTML responses cannot be cached as
  static assets, and build entries are bounded to 160 while retaining the
  generic offline notice.

`SwRegister` registers in production with `updateViaCache: none`, including when
hydration occurs after window load. Cleanup removes pending load listeners.
Development does not register a new worker: it unregisters only this origin's
`/sw.js` and clears only Character Arc caches. An already controlled dev document
can retain its old controller until its next normal navigation; no automatic
reload discards an in-progress form.

The offline page now describes this boundary accurately. Its Retry uses a native
link to the current URL so it works even when client chunks are unavailable.
The release coordinator supplies no-store update headers for `/sw.js`.

## Verification

- `bun test --isolate tests/pwa`: 14 tests / 50 assertions cover private/root
  migration, post-logout offline replay denial, private navigation no-store,
  RSC/API/query/cross-origin/header-auth bypass, public response checks and cache
  bounds, plus production/dev and pre/post-load registration lifecycle.
- `npx tsx scripts/verify-pwa-cache.ts` launches real Chromium against a synthetic
  loopback server. It verifies actual credential omission, legacy-cache purge,
  preservation of an unrelated cache, network-only private navigation, safe
  post-logout offline fallback, public immutable asset reuse and failure of
  offline RSC/signed/API requests. No real account, credential, database or
  assessment fixture is used. The server and browser close after the probe.
- Browser evidence: ignored `scratch/pwa-cache-browser.json` and `.log`.
  Unit evidence: `scratch/pwa-cache-tests.log`.
- Bun 1.3.13 reports `Request.credentials` as include even when constructed with
  omit. VM tests therefore inspect constructor options; the real Chromium probe
  separately proves that the requests actually omit cookies.

This does not implement offline assessment taking, response queues, background
sync or private-data storage. Existing assessment deadlines and server scoring
remain authoritative.
