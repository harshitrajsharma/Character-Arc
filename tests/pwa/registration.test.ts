// @ts-expect-error Bun supplies this module at test runtime.
import { describe, expect, test } from "bun:test"
import {
  afterWindowLoad,
  configureServiceWorker,
} from "@/lib/pwa/service-worker-registration"

describe("service worker registration lifecycle", () => {
  test("production registers only the application worker with fresh update checks", async () => {
    const calls: unknown[][] = []
    await configureServiceWorker(
      {
        origin: "https://example.test",
        serviceWorker: {
          register: async (...args: unknown[]) => {
            calls.push(args)
          },
          getRegistrations: async () => {
            throw new Error("must not remove production registrations")
          },
        } as unknown as ServiceWorkerContainer,
      },
      true
    )
    expect(calls).toEqual([["/sw.js", { scope: "/", updateViaCache: "none" }]])
  })

  test("development removes only this origin's app worker and Character Arc caches", async () => {
    const removed: string[] = [],
      caches: string[] = [],
      registrationCalls: unknown[] = []
    const registration = (url: string) => ({
      active: { scriptURL: url },
      unregister: async () => {
        removed.push(url)
      },
    })
    await configureServiceWorker(
      {
        origin: "https://example.test",
        serviceWorker: {
          register: async (...args: unknown[]) => {
            registrationCalls.push(args)
          },
          getRegistrations: async () => [
            registration("https://example.test/sw.js"),
            registration("https://example.test/other-worker.js"),
            registration("https://other.test/sw.js"),
          ],
        } as unknown as ServiceWorkerContainer,
        caches: {
          keys: async () => [
            "character-arc-v1",
            "character-arc-public-v2",
            "unrelated-editor-cache",
          ],
          delete: async (key: string) => {
            caches.push(key)
            return true
          },
        },
      },
      false
    )
    expect(removed).toEqual(["https://example.test/sw.js"])
    expect(caches).toEqual(["character-arc-v1", "character-arc-public-v2"])
    expect(registrationCalls).toEqual([])
  })

  test("hydration after window load still starts setup", async () => {
    let actions = 0
    const target = {
      addEventListener: () => {
        throw new Error("load has already fired")
      },
      removeEventListener: () => {},
    } as unknown as Window
    const cleanup = afterWindowLoad(
      target,
      "complete",
      async () => {
        actions++
      },
      () => {}
    )
    await Promise.resolve()
    expect(actions).toBe(1)
    cleanup()
  })

  test("unmount cancels the pending load setup and removes its listener", () => {
    let listener: (() => void) | undefined,
      removed = false,
      actions = 0
    const target = {
      addEventListener: (_name: string, action: () => void) => {
        listener = action
      },
      removeEventListener: (_name: string, action: () => void) => {
        removed = action === listener
      },
    } as unknown as Window
    const cleanup = afterWindowLoad(
      target,
      "loading",
      async () => {
        actions++
      },
      () => {}
    )
    cleanup()
    listener?.()
    expect(actions).toBe(0)
    expect(removed).toBe(true)
  })
})
