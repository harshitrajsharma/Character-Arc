// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { runInNewContext } from "node:vm"

const origin = "https://character-arc.test"
const currentCache = "character-arc-public-v2"
const source = readFileSync(
  new URL("../../public/sw.js", import.meta.url),
  "utf8"
)
type CacheInput = Request | URL | string
type WorkerEvent = {
  request?: Request
  waitUntil: (value: Promise<unknown>) => void
  respondWith: (value: Promise<Response> | Response) => void
}

function worker() {
  const buckets = new Map<string, Map<string, Response>>()
  const listeners = new Map<string, (event: WorkerEvent) => void>()
  const cacheReads: string[] = []
  const requests: Array<{
    url: string
    credentials?: string
    init?: RequestInit
  }> = []
  const constructedOptions: RequestInit[] = []
  // Bun 1.3.13 exposes Request.credentials as include even with omit. Capture
  // constructor options here; the browser smoke verifies real fetch behavior.
  class WorkerRequest extends Request {
    constructor(input: RequestInfo | URL, options?: RequestInit) {
      super(input, options)
      if (options) constructedOptions.push(options)
    }
  }
  const key = (input: CacheInput) =>
    new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
      origin
    ).href
  const open = async (name: string) => {
    let entries = buckets.get(name)
    if (!entries) {
      entries = new Map()
      buckets.set(name, entries)
    }
    const bucket = entries
    return {
      put: async (input: CacheInput, response: Response) => {
        bucket.set(key(input), response.clone())
      },
      match: async (input: CacheInput) => {
        cacheReads.push(key(input))
        return bucket.get(key(input))?.clone()
      },
      keys: async () => [...bucket.keys()].map((url) => new Request(url)),
      delete: async (input: CacheInput) => bucket.delete(key(input)),
    }
  }
  let fetcher = async (
    _request: Request,
    _init?: RequestInit
  ): Promise<Response> =>
    new Response("public asset", {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Type": "text/javascript",
      },
    })
  let claimed = 0,
    skipped = 0
  runInNewContext(source, {
    self: {
      location: { origin },
      addEventListener: (
        name: string,
        listener: (event: WorkerEvent) => void
      ) => listeners.set(name, listener),
      skipWaiting: async () => {
        skipped++
      },
      clients: {
        claim: async () => {
          claimed++
        },
      },
    },
    caches: {
      open,
      keys: async () => [...buckets.keys()],
      delete: async (name: string) => buckets.delete(name),
    },
    fetch: (request: Request, init?: RequestInit) => {
      requests.push({
        url: request.url,
        credentials: request.credentials,
        init,
      })
      return fetcher(request, init)
    },
    URL,
    Request: WorkerRequest,
    Response,
  })
  async function dispatch(name: string, request?: Request) {
    const waits: Promise<unknown>[] = []
    let response: Promise<Response> | undefined
    listeners.get(name)!({
      request,
      waitUntil: (value) => {
        waits.push(Promise.resolve(value))
      },
      respondWith: (value) => {
        response = Promise.resolve(value)
      },
    })
    const result = response ? await response : undefined
    await Promise.all(waits)
    return result
  }
  return {
    buckets,
    open,
    requests,
    cacheReads,
    constructedOptions,
    dispatch,
    fetchWith: (handler: typeof fetcher) => {
      fetcher = handler
    },
    counts: () => ({ claimed, skipped }),
  }
}

function navigation(path: string) {
  const request = new Request(new URL(path, origin))
  Object.defineProperty(request, "mode", { value: "navigate" })
  return request
}

describe("PWA private-data isolation", () => {
  test("precache never fetches a signed-in root/route and omits credentials", async () => {
    const runtime = worker()
    runtime.fetchWith(async (request) => {
      if (request.url.endsWith("icon.svg"))
        throw new Error("optional icon unavailable")
      return new Response("public", {
        headers: {
          "Content-Type": request.url.endsWith("offline")
            ? "text/html"
            : "image/png",
        },
      })
    })
    await runtime.dispatch("install")
    expect(runtime.requests.length).toBeGreaterThan(1)
    expect(
      runtime.constructedOptions.every(
        (options) => options.credentials === "omit"
      )
    ).toBe(true)
    expect(
      runtime.requests.some((request) => new URL(request.url).pathname === "/")
    ).toBe(false)
    expect(
      runtime.requests.some((request) =>
        /workspace|login|assessment/.test(request.url)
      )
    ).toBe(false)
    expect(runtime.counts().skipped).toBe(1)
  })

  test("a private or redirected offline response is not precached", async () => {
    for (const redirect of [false, true]) {
      const runtime = worker()
      runtime.fetchWith(async () => {
        const response = new Response("private", {
          headers: redirect ? {} : { "Cache-Control": "private, no-store" },
        })
        Object.defineProperty(response, "redirected", { value: redirect })
        return response
      })
      await runtime.dispatch("install")
      expect(
        [...runtime.buckets.values()].flatMap((bucket) => [...bucket.keys()])
      ).toEqual([])
      expect(runtime.counts().skipped).toBe(1)
    }
  })

  test("activation purges legacy private caches but preserves unrelated application caches", async () => {
    const runtime = worker()
    await (
      await runtime.open("character-arc-v1")
    ).put("/workspace/private", new Response("old private HTML"))
    await runtime.open("character-arc-v0")
    await runtime.open(currentCache)
    await runtime.open("unrelated-editor-cache")
    await runtime.dispatch("activate")
    expect([...runtime.buckets.keys()].sort()).toEqual(
      [currentCache, "unrelated-editor-cache"].sort()
    )
    expect(runtime.counts().claimed).toBe(1)
  })

  test("successful authenticated navigation is network-only and never written to Cache API", async () => {
    const runtime = worker()
    runtime.fetchWith(
      async () =>
        new Response("private signed-in workspace", {
          headers: { "Cache-Control": "private, no-store" },
        })
    )
    const response = await runtime.dispatch(
      "fetch",
      navigation("/workspace/personal?tab=attempts")
    )
    expect(await response?.text()).toBe("private signed-in workspace")
    expect(runtime.requests[0].init?.cache).toBe("no-store")
    expect(
      [...runtime.buckets.values()].flatMap((bucket) => [...bucket.keys()])
    ).toEqual([])
  })

  test("offline navigation cannot recover another user's cached page, including a legacy root", async () => {
    const runtime = worker()
    const legacy = await runtime.open("character-arc-v1")
    await legacy.put("/", new Response("another user's dashboard"))
    await legacy.put(
      "/workspace/private",
      new Response("another user's result")
    )
    await (
      await runtime.open(currentCache)
    ).put("/offline", new Response("safe offline notice"))
    runtime.fetchWith(async () => {
      throw new Error("offline")
    })
    expect(
      await (
        await runtime.dispatch("fetch", navigation("/workspace/private"))
      )?.text()
    ).toBe("safe offline notice")
    expect(
      await (await runtime.dispatch("fetch", navigation("/")))?.text()
    ).toBe("safe offline notice")
    expect(runtime.cacheReads).toEqual([
      origin + "/offline",
      origin + "/offline",
    ])
  })

  test("a missing offline shell fails safely rather than replaying private HTML", async () => {
    const runtime = worker()
    runtime.fetchWith(async () => {
      throw new Error("offline")
    })
    const response = await runtime.dispatch(
      "fetch",
      navigation("/workspace/private")
    )
    expect(response?.status).toBe(503)
    expect(response?.headers.get("Cache-Control")).toBe("no-store")
    expect(await response?.text()).toContain("Reconnect")
  })

  test("RSC, actions, APIs, cross-origin and query/signed URLs bypass the cache", async () => {
    const runtime = worker()
    for (const request of [
      new Request(origin + "/workspace/private?_rsc=opaque"),
      new Request(origin + "/workspace/private", { headers: { RSC: "1" } }),
      new Request(origin + "/workspace/private", {
        headers: { Accept: "text/x-component" },
      }),
      new Request(origin + "/workspace/private", {
        method: "POST",
        headers: { "Next-Action": "action" },
      }),
      new Request(origin + "/api/files/private.png"),
      new Request("https://storage.test/private.png?token=synthetic"),
      new Request(origin + "/icons/icon-192.png?token=synthetic"),
      new Request(origin + "/_next/static/chunks/public.js", {
        headers: { Authorization: "Bearer synthetic" },
      }),
      new Request(origin + "/user-uploads/private.png"),
    ])
      expect(await runtime.dispatch("fetch", request)).toBeUndefined()
    expect(runtime.requests).toEqual([])
    expect(runtime.buckets.size).toBe(0)
  })

  test("public immutable build assets cache without re-fetching", async () => {
    const runtime = worker()
    const request = new Request(origin + "/_next/static/chunks/hashed-build.js")
    expect(await (await runtime.dispatch("fetch", request))?.text()).toBe(
      "public asset"
    )
    expect(await (await runtime.dispatch("fetch", request))?.text()).toBe(
      "public asset"
    )
    expect(runtime.requests.length).toBe(1)
  })

  test("private/no-store, personalized, HTML and development chunk responses never cache", async () => {
    const cases: Record<string, string>[] = [
      { "Cache-Control": "private, immutable" },
      { "Cache-Control": "no-store, immutable" },
      { "Cache-Control": "public, immutable", Vary: "Cookie" },
      { "Cache-Control": "public, immutable", Vary: "Authorization" },
      { "Cache-Control": "public, immutable", "Content-Type": "text/html" },
      {
        "Cache-Control": "public, immutable",
        "Content-Type": "text/x-component",
      },
      { "Cache-Control": "no-cache" },
    ]
    for (const headers of cases) {
      const runtime = worker()
      runtime.fetchWith(
        async () => new Response("not a cache candidate", { headers })
      )
      await runtime.dispatch(
        "fetch",
        new Request(origin + "/_next/static/chunks/test.js")
      )
      expect(runtime.buckets.get(currentCache)?.size ?? 0).toBe(0)
    }
  })

  test("build cache eviction is bounded and retains the generic offline shell", async () => {
    const runtime = worker()
    const cache = await runtime.open(currentCache)
    await cache.put("/offline", new Response("safe offline notice"))
    for (let index = 0; index < 164; index++)
      await cache.put(
        `/_next/static/chunks/old-${index}.js`,
        new Response("public")
      )
    await runtime.dispatch(
      "fetch",
      new Request(origin + "/_next/static/chunks/new.js")
    )
    const keys = [...runtime.buckets.get(currentCache)!.keys()]
    expect(
      keys.filter((url) => new URL(url).pathname.startsWith("/_next/static/"))
        .length
    ).toBe(160)
    expect(keys).toContain(origin + "/offline")
  })
})
