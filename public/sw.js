// Cache only explicitly public assets. Workspace HTML, RSC and API data always
// require the network so a prior user's session cannot survive logout in Cache API.
const CACHE_PREFIX = "character-arc-"
const CACHE_NAME = "character-arc-public-v2"
const OFFLINE_URL = "/offline"
const MAX_BUILD_ASSETS = 160
const PUBLIC_ASSETS = new Set([
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon.svg",
  "/g-logo.png",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable-192.png",
  "/icons/icon-maskable-512.png",
  "/icons/apple-touch-icon.png",
])

function cacheableResponse(response) {
  return (
    response.status === 200 &&
    !response.redirected &&
    response.type !== "opaque" &&
    response.type !== "opaqueredirect" &&
    !/(?:^|,)\s*(?:private|no-store)\b/i.test(
      response.headers.get("Cache-Control") || ""
    ) &&
    !/\b(?:cookie|authorization)\b|\*/i.test(
      response.headers.get("Vary") || ""
    ) &&
    !response.headers.get("Content-Type")?.includes("text/x-component")
  )
}

async function cachePublicResponse(request, response) {
  if (!cacheableResponse(response)) return
  if (
    new URL(request.url).pathname !== OFFLINE_URL &&
    /text\/html/i.test(response.headers.get("Content-Type") || "")
  )
    return
  const cache = await caches.open(CACHE_NAME)
  await cache.put(request, response.clone())
  const buildKeys = (await cache.keys()).filter((key) =>
    new URL(key.url).pathname.startsWith("/_next/static/")
  )
  await Promise.all(
    buildKeys
      .slice(0, Math.max(0, buildKeys.length - MAX_BUILD_ASSETS))
      .map((key) => cache.delete(key))
  )
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.allSettled(
      [...PUBLIC_ASSETS].map(async (pathname) => {
        const request = new Request(new URL(pathname, self.location.origin), {
          credentials: "omit",
          cache: "reload",
        })
        const response = await fetch(request)
        await cachePublicResponse(request, response)
      })
    ).then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter(
              (name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME
            )
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !["http:", "https:"].includes(url.protocol) ||
    request.headers.has("RSC") ||
    request.headers.has("Next-Action") ||
    request.headers.has("Authorization") ||
    request.headers.get("Accept")?.includes("text/x-component") ||
    url.searchParams.has("_rsc") ||
    url.pathname.startsWith("/api/")
  )
    return

  if (request.mode === "navigate") {
    // No URL-matched cache fallback: even a stale V1 cache may contain private HTML.
    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(async () => {
        const cache = await caches.open(CACHE_NAME)
        return (
          (await cache.match(OFFLINE_URL)) ||
          new Response(
            "You're offline. Reconnect to access your workspace and assessments.",
            {
              status: 503,
              headers: {
                "Content-Type": "text/plain; charset=utf-8",
                "Cache-Control": "no-store",
              },
            }
          )
        )
      })
    )
    return
  }

  // Query-bearing/signed URLs and arbitrary images are never cache candidates.
  const buildAsset = url.pathname.startsWith("/_next/static/")
  if (url.search || (!buildAsset && !PUBLIC_ASSETS.has(url.pathname))) return

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      const cached = await cache.match(request)
      if (cached) return cached
      const response = await fetch(request)
      // Dev chunks must not enter a production cache left controlling a dev tab.
      if (
        !buildAsset ||
        /\bimmutable\b/i.test(response.headers.get("Cache-Control") || "")
      ) {
        event.waitUntil(cachePublicResponse(request, response).catch(() => {}))
      }
      return response
    })()
  )
})
