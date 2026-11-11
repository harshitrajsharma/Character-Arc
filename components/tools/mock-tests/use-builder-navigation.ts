"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

/** Preserve local authoring work across links, browser Back and reload. */
export function useBuilderNavigation(dirty: boolean, busy: boolean) {
  const router = useRouter()
  const [pending, setPending] = useState<string | null>(null)
  const bypass = useRef(false)
  const sentinel = useRef(false)
  const request = useCallback(
    (href: string) => {
      if (busy) return
      if (dirty) setPending(href)
      else router.push(href)
    },
    [dirty, busy, router]
  )
  const leave = useCallback(
    (href: string) => {
      bypass.current = true
      setPending(null)
      if (href === "__back__") window.history.go(sentinel.current ? -2 : -1)
      else {
        const target = new URL(href, window.location.href)
        if (target.origin === window.location.origin)
          router.push(target.pathname + target.search + target.hash)
        else window.location.assign(target.href)
      }
    },
    [router]
  )
  useEffect(() => {
    if (!dirty && !busy) return
    function unload(event: BeforeUnloadEvent) {
      if (bypass.current) return
      event.preventDefault()
      event.returnValue = ""
    }
    function click(event: MouseEvent) {
      if (
        bypass.current ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        "a[href]"
      )
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return
      const url = new URL(link.href)
      if (
        url.pathname === location.pathname &&
        url.search === location.search &&
        url.origin === location.origin
      )
        return
      event.preventDefault()
      event.stopPropagation()
      if (!busy) setPending(url.href)
    }
    window.addEventListener("beforeunload", unload)
    document.addEventListener("click", click, true)
    return () => {
      window.removeEventListener("beforeunload", unload)
      document.removeEventListener("click", click, true)
    }
  }, [dirty, busy])
  useEffect(() => {
    if (dirty && !sentinel.current && !bypass.current) {
      window.history.pushState(window.history.state, "", window.location.href)
      sentinel.current = true
    } else if (!dirty && sentinel.current && !bypass.current) {
      sentinel.current = false
      window.history.back()
    }
    function pop() {
      if (!sentinel.current || bypass.current) return
      window.history.go(1)
      if (!busy) setPending("__back__")
    }
    window.addEventListener("popstate", pop)
    return () => window.removeEventListener("popstate", pop)
  }, [dirty, busy])
  return { pending, setPending, request, leave }
}
