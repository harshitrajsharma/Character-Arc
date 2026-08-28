"use client"

import * as React from "react"
import { DownloadIcon, ShareIcon, PlusSquareIcon, XIcon, CheckCircle2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

let standaloneMediaQuery: MediaQueryList | null = null

function getStandaloneMediaQuery() {
  if (!standaloneMediaQuery) {
    standaloneMediaQuery = window.matchMedia("(display-mode: standalone)")
  }
  return standaloneMediaQuery
}

function subscribeToStandalone(onChange: () => void) {
  const query = getStandaloneMediaQuery()
  query.addEventListener("change", onChange)
  return () => {
    query.removeEventListener("change", onChange)
  }
}

function getStandaloneSnapshot() {
  return (
    getStandaloneMediaQuery().matches ||
    ("standalone" in navigator &&
      (navigator as unknown as { standalone: boolean }).standalone === true)
  )
}

function getServerSnapshot() {
  return false
}

const DISMISSAL_KEY = "character_arc_pwa_dismissed"

const dismissalListeners = new Set<() => void>()

function subscribeToDismissal(listener: () => void) {
  dismissalListeners.add(listener)
  return () => {
    dismissalListeners.delete(listener)
  }
}

function getDismissalSnapshot() {
  return localStorage.getItem(DISMISSAL_KEY) === "true"
}

function persistDismissed() {
  localStorage.setItem(DISMISSAL_KEY, "true")
  dismissalListeners.forEach((listener) => listener())
}

function subscribeToNoop() {
  return () => {}
}

function getIosSnapshot() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase())
}

interface PwaInstallPromptProps {
  variant?: "banner" | "sidebar" | "button"
  className?: string
}

export function PwaInstallPrompt({
  variant = "banner",
  className,
}: PwaInstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null)
  const [appInstalled, setAppInstalled] = React.useState<boolean>(false)
  const isStandalone = React.useSyncExternalStore(
    subscribeToStandalone,
    getStandaloneSnapshot,
    getServerSnapshot
  )
  const isInstalled = appInstalled || isStandalone
  const isIos = React.useSyncExternalStore(
    subscribeToNoop,
    getIosSnapshot,
    getServerSnapshot
  )
  const [showIosGuide, setShowIosGuide] = React.useState<boolean>(false)
  const isDismissed = React.useSyncExternalStore(
    subscribeToDismissal,
    getDismissalSnapshot,
    getServerSnapshot
  )

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    const handleAppInstalled = () => {
      setAppInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener("appinstalled", handleAppInstalled)

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
      window.removeEventListener("appinstalled", handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true)
      return
    }

    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const choiceResult = await deferredPrompt.userChoice
    if (choiceResult.outcome === "accepted") {
      setAppInstalled(true)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    persistDismissed()
  }

  if (isInstalled) {
    if (variant === "button") {
      return (
        <Button variant="ghost" size="sm" disabled className={cn("gap-2 text-xs text-muted-foreground", className)}>
          <CheckCircle2Icon className="size-3.5 text-success" />
          App Installed
        </Button>
      )
    }
    return null
  }

  // If not promptable and not iOS, don't show floating banner unless explicitly requested
  if (!deferredPrompt && !isIos && variant !== "button") {
    return null
  }

  if (isDismissed && variant !== "button") {
    return null
  }

  if (variant === "button") {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={handleInstallClick}
          className={cn("gap-2 text-xs font-medium border-brand-neon-line text-brand-neon-ink hover:bg-brand-neon-soft", className)}
        >
          <DownloadIcon className="size-3.5" />
          Install App
        </Button>

        <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DownloadIcon className="size-5 text-brand-neon-ink" />
                Install Character Arc on iOS
              </DialogTitle>
              <DialogDescription>
                Follow these simple steps in Safari to add Character Arc to your Home Screen:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm text-foreground">
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-neon-soft text-xs font-bold text-brand-neon-ink">
                  1
                </span>
                <p className="flex items-center gap-1.5 leading-snug">
                  Tap the <ShareIcon className="inline size-4 text-brand-cyan-ink" /> <strong>Share</strong> button in Safari&apos;s bottom toolbar.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-neon-soft text-xs font-bold text-brand-neon-ink">
                  2
                </span>
                <p className="flex items-center gap-1.5 leading-snug">
                  Scroll down and tap <PlusSquareIcon className="inline size-4 text-brand-amber-ink" /> <strong>Add to Home Screen</strong>.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-neon-soft text-xs font-bold text-brand-neon-ink">
                  3
                </span>
                <p className="leading-snug">
                  Tap <strong>Add</strong> in the top right corner. Character Arc will launch like a native desktop/mobile app!
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  if (variant === "sidebar") {
    return (
      <>
        <div className={cn("mx-2 my-2 rounded-xl border border-brand-neon-line bg-brand-neon-soft/50 p-3 text-sidebar-foreground shadow-xs", className)}>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-brand-neon-ink">
                Install Character Arc
              </p>
              <p className="text-[11px] leading-tight text-muted-foreground">
                Get full offline access and fast desktop app experience.
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground p-0.5 rounded-md"
              aria-label="Dismiss install prompt"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="mt-2.5 w-full h-8 gap-1.5 text-xs bg-brand-neon text-brand-neon-foreground hover:bg-brand-neon/90"
          >
            <DownloadIcon className="size-3.5" />
            Install App
          </Button>
        </div>

        <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DownloadIcon className="size-5 text-brand-neon-ink" />
                Install Character Arc on iOS
              </DialogTitle>
              <DialogDescription>
                Follow these simple steps in Safari to add Character Arc to your Home Screen:
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2 text-sm text-foreground">
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-neon-soft text-xs font-bold text-brand-neon-ink">
                  1
                </span>
                <p className="flex items-center gap-1.5 leading-snug">
                  Tap the <ShareIcon className="inline size-4 text-brand-cyan-ink" /> <strong>Share</strong> button in Safari&apos;s bottom toolbar.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-neon-soft text-xs font-bold text-brand-neon-ink">
                  2
                </span>
                <p className="flex items-center gap-1.5 leading-snug">
                  Scroll down and tap <PlusSquareIcon className="inline size-4 text-brand-amber-ink" /> <strong>Add to Home Screen</strong>.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-neon-soft text-xs font-bold text-brand-neon-ink">
                  3
                </span>
                <p className="leading-snug">
                  Tap <strong>Add</strong> in the top right corner. Character Arc will launch like a native app!
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  // Default: floating banner
  return (
    <>
      <div
        className={cn(
          "fixed bottom-20 right-4 z-50 flex max-w-sm items-center justify-between gap-3 rounded-2xl border border-brand-neon-line bg-card/95 p-3.5 shadow-xl backdrop-blur-md transition-all sm:bottom-6 sm:right-6",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-neon-soft text-brand-neon-ink">
            <DownloadIcon className="size-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground">Install Character Arc</h4>
            <p className="text-[11px] text-muted-foreground">Add to home screen for offline access & faster load.</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="h-8 gap-1 px-2.5 text-xs bg-brand-neon text-brand-neon-foreground hover:bg-brand-neon/90"
          >
            Install
          </Button>
          <button
            onClick={handleDismiss}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Dismiss prompt"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      </div>

      <Dialog open={showIosGuide} onOpenChange={setShowIosGuide}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DownloadIcon className="size-5 text-brand-neon-ink" />
              Install Character Arc on iOS
            </DialogTitle>
            <DialogDescription>
              Follow these simple steps in Safari to add Character Arc to your Home Screen:
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2 text-sm text-foreground">
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-neon-soft text-xs font-bold text-brand-neon-ink">
                1
              </span>
              <p className="flex items-center gap-1.5 leading-snug">
                Tap the <ShareIcon className="inline size-4 text-brand-cyan-ink" /> <strong>Share</strong> button in Safari&apos;s bottom toolbar.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-neon-soft text-xs font-bold text-brand-neon-ink">
                2
              </span>
              <p className="flex items-center gap-1.5 leading-snug">
                Scroll down and tap <PlusSquareIcon className="inline size-4 text-brand-amber-ink" /> <strong>Add to Home Screen</strong>.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-neon-soft text-xs font-bold text-brand-neon-ink">
                3
              </span>
              <p className="leading-snug">
                Tap <strong>Add</strong> in the top right corner. Character Arc will launch like a native app!
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
