/** Real browser isolation probe against a synthetic loopback server; no app credentials or domain records. */
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import type { AddressInfo } from "node:net"
import { chromium } from "playwright"

const workerSource = await readFile(
  new URL("../public/sw.js", import.meta.url),
  "utf8"
)
const assetRequests: Array<{ path: string; cookiePresent: boolean }> = []
const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname
  if (pathname === "/sw.js") {
    response.writeHead(200, {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-store",
    })
    response.end(workerSource)
    return
  }
  if (pathname === "/test-page") {
    response.writeHead(200, {
      "Content-Type": "text/html",
      "Cache-Control": "no-store",
      "Set-Cookie": "pwa_probe=synthetic; SameSite=Lax; Path=/",
    })
    response.end(
      "<!doctype html><title>PWA privacy probe</title><main>Public test shell</main>"
    )
    return
  }
  if (pathname.startsWith("/workspace/")) {
    response.writeHead(200, {
      "Content-Type": "text/html",
      "Cache-Control": "private, no-store",
    })
    response.end(
      "<!doctype html><title>Synthetic private page</title><main>PRIVATE_PWA_PROBE</main>"
    )
    return
  }
  if (
    pathname === "/offline" ||
    pathname.startsWith("/icons/") ||
    [
      "/manifest.webmanifest",
      "/favicon.ico",
      "/icon.svg",
      "/g-logo.png",
    ].includes(pathname)
  ) {
    assetRequests.push({
      path: pathname,
      cookiePresent: Boolean(request.headers.cookie),
    })
    response.writeHead(200, {
      "Content-Type": pathname === "/offline" ? "text/html" : "image/png",
      "Cache-Control": "public, max-age=0",
    })
    response.end(
      pathname === "/offline"
        ? "<!doctype html><title>Offline</title><main>Safe generic offline notice</main>"
        : "public asset"
    )
    return
  }
  response.writeHead(200, {
    "Content-Type": "text/javascript",
    "Cache-Control": "public, max-age=31536000, immutable",
  })
  response.end("public build asset")
})
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()
const pageErrors: string[] = []
page.on("pageerror", (error) => pageErrors.push(error.message))
try {
  await page.goto(base + "/test-page")
  await page.evaluate(`(async () => {
    const old = await caches.open('character-arc-v1');
    await old.put('/', new Response('PRIVATE_LEGACY_ROOT'));
    await old.put('/workspace/private', new Response('PRIVATE_LEGACY_RESULT'));
    await caches.open('unrelated-editor-cache');
    await navigator.serviceWorker.register('/sw.js', {scope:'/', updateViaCache:'none'});
    await navigator.serviceWorker.ready;
  })()`)
  await page.waitForFunction("Boolean(navigator.serviceWorker.controller)")
  const cacheNames = (await page.evaluate("caches.keys()")) as string[]
  assert.ok(!cacheNames.includes("character-arc-v1"))
  assert.ok(cacheNames.includes("unrelated-editor-cache"))
  assert.ok(assetRequests.length > 1)
  assert.ok(
    assetRequests.every((request) => !request.cookiePresent),
    "Precache unexpectedly sent a cookie"
  )

  await page.goto(base + "/workspace/private")
  assert.match(await page.locator("body").innerText(), /PRIVATE_PWA_PROBE/)
  const keys = (await page.evaluate(`(async () => {
    const cache = await caches.open('character-arc-public-v2');
    return (await cache.keys()).map(request => new URL(request.url).pathname);
  })()`)) as string[]
  assert.ok(
    !keys.includes("/") && !keys.some((key) => key.startsWith("/workspace/"))
  )
  await page.evaluate(
    "fetch('/_next/static/chunks/probe-hashed.js').then(response => response.text())"
  )
  await page.waitForFunction(
    `(async () => Boolean(await (await caches.open('character-arc-public-v2')).match('/_next/static/chunks/probe-hashed.js')))()`
  )

  await context.clearCookies()
  await context.setOffline(true)
  await page.goto(base + "/workspace/private", {
    waitUntil: "domcontentloaded",
  })
  assert.equal(
    (await page.locator("body").innerText()).trim(),
    "Safe generic offline notice"
  )
  await page.goto(base + "/", { waitUntil: "domcontentloaded" })
  assert.equal(
    (await page.locator("body").innerText()).trim(),
    "Safe generic offline notice"
  )
  const cachedAsset = await page.evaluate(
    "fetch('/_next/static/chunks/probe-hashed.js').then(response => response.text())"
  )
  assert.equal(cachedAsset, "public build asset")
  const bypasses = await page.evaluate(`(async () => {
    const rsc = await fetch('/workspace/private?_rsc=probe', {headers:{RSC:'1'}}).then(() => false, () => true);
    const signed = await fetch('/icons/icon-192.png?token=synthetic').then(() => false, () => true);
    const api = await fetch('/api/files/private.png').then(() => false, () => true);
    return {rsc,signed,api};
  })()`)
  assert.deepEqual(bypasses, { rsc: true, signed: true, api: true })
  assert.deepEqual(pageErrors, [])
  await mkdir("scratch", { recursive: true })
  await writeFile(
    "scratch/pwa-cache-browser.json",
    JSON.stringify(
      {
        passed: true,
        precacheRequests: assetRequests.length,
        cookiesOmitted: true,
        legacyPrivateCacheRemoved: true,
        unrelatedCachePreserved: true,
        privateNavigationNotCached: true,
        logoutOfflinePrivateReplayBlocked: true,
        immutableAssetAvailableOffline: true,
        rscSignedAndApiBypass: true,
        pageErrors,
        realAccountUsed: false,
      },
      null,
      2
    )
  )
  console.log(
    "PASS: real Chromium worker cookie omission, private-cache migration, network-only private navigation, safe post-logout offline fallback and static-only caching. No real account or app records used."
  )
} finally {
  await browser.close()
  server.closeAllConnections()
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
}
