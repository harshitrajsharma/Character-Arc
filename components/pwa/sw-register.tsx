"use client"

import { useEffect } from "react"
import {
  afterWindowLoad,
  configureServiceWorker,
} from "@/lib/pwa/service-worker-registration"

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return
    return afterWindowLoad(
      window,
      document.readyState,
      () =>
        configureServiceWorker(
          {
            serviceWorker: navigator.serviceWorker,
            caches: "caches" in window ? window.caches : undefined,
            origin: window.location.origin,
          },
          process.env.NODE_ENV === "production"
        ),
      () => console.warn("Offline support is unavailable in this browser.")
    )
  }, [])

  return null
}
