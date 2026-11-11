type ServiceWorkerEnvironment = {
  serviceWorker: Pick<ServiceWorkerContainer, "getRegistrations" | "register">
  caches?: Pick<CacheStorage, "keys" | "delete">
  origin: string
}

/** Only the Character Arc worker/caches are ours to remove on a dev origin. */
export async function configureServiceWorker(
  environment: ServiceWorkerEnvironment,
  production: boolean
) {
  if (production) {
    await environment.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    })
    return
  }
  const registrations = await environment.serviceWorker.getRegistrations()
  await Promise.all(
    registrations
      .filter((registration) =>
        [
          registration.active,
          registration.waiting,
          registration.installing,
        ].some((worker) => {
          if (!worker) return false
          const url = new URL(worker.scriptURL)
          return url.origin === environment.origin && url.pathname === "/sw.js"
        })
      )
      .map((registration) => registration.unregister())
  )
  if (environment.caches) {
    const names = await environment.caches.keys()
    await Promise.all(
      names
        .filter((name) => name.startsWith("character-arc-"))
        .map((name) => environment.caches!.delete(name))
    )
  }
}

/** Hydration can occur before or after load; cleanup cancels a pending listener. */
export function afterWindowLoad(
  target: Pick<Window, "addEventListener" | "removeEventListener">,
  readyState: DocumentReadyState,
  action: () => Promise<void>,
  onError: () => void
) {
  let cancelled = false
  const run = () => {
    if (!cancelled) void action().catch(onError)
  }
  if (readyState === "complete") run()
  else target.addEventListener("load", run, { once: true })
  return () => {
    cancelled = true
    target.removeEventListener("load", run)
  }
}
