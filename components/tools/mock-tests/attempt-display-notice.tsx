"use client"

import { useSyncExternalStore } from "react"
import { MonitorIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ASSESSMENT_DISPLAY_QUERY,
  canUseAssessmentDisplayNow,
  MIN_ASSESSMENT_HEIGHT,
  MIN_ASSESSMENT_WIDTH,
} from "@/lib/tools/mock-tests/attempt-display"

function subscribe(onChange: () => void) {
  const media = window.matchMedia(ASSESSMENT_DISPLAY_QUERY)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}
const serverSnapshot = () => null

export function useAssessmentDisplay() {
  return useSyncExternalStore<boolean | null>(
    subscribe,
    canUseAssessmentDisplayNow,
    serverSnapshot
  )
}

export function AttemptDisplayNotice({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MonitorIcon className="size-5 shrink-0" aria-hidden="true" />A
            larger screen is required
          </DialogTitle>
          <DialogDescription>
            Take this assessment on a tablet or computer with a window at least{" "}
            {MIN_ASSESSMENT_WIDTH} × {MIN_ASSESSMENT_HEIGHT} pixels. Rotate your
            tablet or enlarge the window.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          No new attempt has been started. You can still browse assessments,
          manage questions and review results on this screen.
        </p>
        <DialogFooter>
          <Button className="min-h-11" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
