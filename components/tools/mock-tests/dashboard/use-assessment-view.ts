"use client"

import { useCallback, useSyncExternalStore } from "react"
import type { ViewMode } from "./types"

const listeners = new Set<() => void>()
const fallback = new Map<string, ViewMode>()
function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}
function serverSnapshot(): ViewMode {
  return "grid"
}

export function useAssessmentView(workspaceSlug: string) {
  const key = `character-arc:assessment-view:${workspaceSlug}`
  const snapshot = useCallback((): ViewMode => {
    const sessionValue = fallback.get(key)
    if (sessionValue) return sessionValue
    try {
      const value = window.localStorage.getItem(key)
      return value === "list" ? "list" : "grid"
    } catch {
      return fallback.get(key) ?? "grid"
    }
  }, [key])
  const view = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const setView = useCallback(
    (value: ViewMode) => {
      try {
        window.localStorage.setItem(key, value)
        fallback.delete(key)
      } catch {
        fallback.set(key, value)
      }
      listeners.forEach((listener) => listener())
    },
    [key]
  )
  return [view, setView] as const
}
