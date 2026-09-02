"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { InfoIcon, KeyboardIcon, CheckCircle2Icon } from "lucide-react"

interface InstructionsDialogProps {
  isOpen: boolean
  onClose: () => void
  durationMinutes: number | null
  totalQuestions: number
  instructionsText?: string | null
}

export function InstructionsDialog({
  isOpen,
  onClose,
  durationMinutes,
  totalQuestions,
  instructionsText,
}: InstructionsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto border-border bg-card p-6 sm:rounded-2xl space-y-5">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
            <InfoIcon className="size-5 text-brand-violet-ink" /> CBT Exam Instructions &amp; Guidelines
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Please read the instructions carefully before and during the exam attempt.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 p-3 rounded-xl border border-border bg-muted/30 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px]">Total Duration:</span>
            <span className="font-mono font-bold text-foreground">
              {durationMinutes ? `${durationMinutes} Minutes` : "Untimed Practice"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[11px]">Total Questions:</span>
            <span className="font-mono font-bold text-foreground">{totalQuestions}</span>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <span className="text-muted-foreground block text-[11px]">Evaluation Mode:</span>
            <span className="font-semibold text-brand-violet-ink">Standard GATE / CBT</span>
          </div>
        </div>

        {/* Specific Paper Instructions if any */}
        {instructionsText ? (
          <div className="space-y-1.5 rounded-xl border border-brand-violet-line bg-brand-violet-soft p-3.5 text-xs text-foreground">
            <span className="font-bold text-brand-violet-ink block">Paper Specific Notes:</span>
            <p className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {instructionsText}
            </p>
          </div>
        ) : null}

        {/* Question Palette Color & Status Legend */}
        <div className="space-y-2 text-xs">
          <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
            1. Question Palette Symbols &amp; Status
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background">
              <span className="size-6 rounded bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                1
              </span>
              <span><strong>Answered:</strong> You have answered the question.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background">
              <span className="size-6 rounded bg-rose-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                2
              </span>
              <span><strong>Not Answered:</strong> You visited but did not answer.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background">
              <span className="size-6 rounded border border-border bg-muted/70 text-muted-foreground font-bold text-xs flex items-center justify-center shrink-0">
                3
              </span>
              <span><strong>Not Visited:</strong> You have not visited this question yet.</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded-lg border border-border bg-background">
              <span className="size-6 rounded-full bg-purple-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                4
              </span>
              <span><strong>Marked for Review:</strong> Marked without an answer.</span>
            </div>
            <div className="col-span-1 sm:col-span-2 flex items-center gap-2 p-2 rounded-lg border border-brand-violet-line bg-brand-violet-soft">
              <span className="relative size-6 rounded-full bg-purple-700 text-white font-bold text-xs flex items-center justify-center shrink-0 after:content-[''] after:absolute after:-bottom-0.5 after:-right-0.5 after:size-2.5 after:rounded-full after:bg-emerald-500 after:border-2 after:border-card">
                5
              </span>
              <span>
                <strong>Answered &amp; Marked for Review:</strong> The question is answered and marked for review. <em>This will be evaluated for scoring</em>.
              </span>
            </div>
          </div>
        </div>

        {/* Navigation & Saving Procedure */}
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px]">
            2. Navigating &amp; Answering Questions
          </h3>
          <ul className="list-disc list-inside space-y-1 pl-1">
            <li>Click <strong>Save &amp; Next</strong> to save your answer for the current question and move to the next.</li>
            <li>Click <strong>Mark for Review &amp; Next</strong> to flag the question for later review and proceed.</li>
            <li>Click <strong>Clear Response</strong> to deselect chosen options or erase numerical input.</li>
            <li>Click <strong>Previous</strong> to go back to the preceding question.</li>
            <li>Click any question number in the <strong>Question Palette</strong> to jump directly.</li>
          </ul>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="space-y-2 text-xs">
          <h3 className="font-bold text-foreground uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <KeyboardIcon className="size-3.5 text-brand-violet-ink" /> 3. Keyboard Shortcuts
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2 rounded-lg border border-border bg-muted/20">
              <span className="font-bold text-foreground block">1, 2, 3, 4</span>
              <span className="text-[10px] text-muted-foreground">Select Option A-D</span>
            </div>
            <div className="p-2 rounded-lg border border-border bg-muted/20">
              <span className="font-bold text-foreground block">Enter</span>
              <span className="text-[10px] text-muted-foreground">Save &amp; Next</span>
            </div>
            <div className="p-2 rounded-lg border border-border bg-muted/20">
              <span className="font-bold text-foreground block">M</span>
              <span className="text-[10px] text-muted-foreground">Mark for Review</span>
            </div>
            <div className="p-2 rounded-lg border border-border bg-muted/20">
              <span className="font-bold text-foreground block">C</span>
              <span className="text-[10px] text-muted-foreground">Clear Response</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button type="button" onClick={onClose} size="sm">
            Close Instructions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
