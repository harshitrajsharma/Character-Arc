"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  InfoIcon,
  KeyboardIcon,
  XIcon,
  ClockIcon,
  CheckCircle2Icon,
  AlertTriangleIcon,
  CalculatorIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"

interface InstructionsDialogProps {
  isOpen: boolean
  onClose: () => void
  durationMinutes: number | null
  totalQuestions: number
  instructionsText?: string | null
  calculatorAllowed?: boolean
  hasNegativeMarking?: boolean
}

export function InstructionsDialog({
  isOpen,
  onClose,
  durationMinutes,
  totalQuestions,
  instructionsText,
  calculatorAllowed = false,
  hasNegativeMarking = true,
}: InstructionsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[94vw] max-w-[94vw] sm:max-w-3xl lg:max-w-4xl h-[85vh] max-h-[85vh] overflow-hidden flex flex-col rounded-none border border-slate-300 bg-white text-slate-900 p-0 shadow-xl font-sans gap-0 ring-0 focus:outline-none"
      >
        {/* Pinned Header (Never shrinks, never overflows) */}
        <div className="border-b border-slate-300 bg-[#f1f5f9] px-5 py-3 pr-5 shrink-0 flex flex-row items-center justify-between gap-4">
          <div className="space-y-0.5 min-w-0 flex-1">
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 truncate">
              <span className="size-6 shrink-0 bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <InfoIcon className="size-3.5" />
              </span>
              <span className="truncate">General Examination Instructions &amp; Guidelines</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 truncate">
              Read the standard CBT operational rules, scoring criteria, and shortcuts carefully.
            </DialogDescription>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={onClose}
            className="shrink-0 rounded-none border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs h-7 px-2.5 gap-1 shadow-none"
          >
            <XIcon className="size-3.5" />
            Close
          </Button>
        </div>

        {/* Scrollable Content Body (min-h-0 allows flex child to shrink properly and scroll) */}
        <div className="flex-1 min-h-0 overflow-y-auto cbt-scrollbar p-4 sm:p-5 space-y-4 bg-[#f1f5f9]">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 border border-slate-300 bg-white shadow-sm">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold flex items-center gap-1">
                <ClockIcon className="size-3 text-blue-700 shrink-0" />
                Duration
              </span>
              <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block truncate">
                {durationMinutes ? `${durationMinutes} MINS` : "UNTIMED"}
              </span>
            </div>

            <div className="p-2.5 border border-slate-300 bg-white shadow-sm">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold flex items-center gap-1">
                <CheckCircle2Icon className="size-3 text-emerald-700 shrink-0" />
                Questions
              </span>
              <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block truncate">
                {totalQuestions} TOTAL
              </span>
            </div>

            <div className="p-2.5 border border-slate-300 bg-white shadow-sm">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold flex items-center gap-1">
                <AlertTriangleIcon className="size-3 text-amber-700 shrink-0" />
                Marking
              </span>
              <span className="font-bold text-amber-700 text-xs mt-0.5 block truncate">
                {hasNegativeMarking ? "Negative on MCQs" : "No Negative"}
              </span>
            </div>

            <div className="p-2.5 border border-slate-300 bg-white shadow-sm">
              <span className="text-slate-500 block text-[10px] uppercase font-semibold flex items-center gap-1">
                <CalculatorIcon className="size-3 text-blue-700 shrink-0" />
                Calculator
              </span>
              <span className={cn("font-bold text-xs mt-0.5 block truncate", calculatorAllowed ? "text-blue-700" : "text-slate-600")}>
                {calculatorAllowed ? "Virtual Scientific" : "Not Permitted"}
              </span>
            </div>
          </div>

          {/* Paper-Specific Notes (if any) */}
          {instructionsText ? (
            <div className="border-l-2 border-l-blue-600 border border-slate-300 bg-white p-3 text-xs space-y-1 shadow-sm">
              <span className="font-bold text-blue-700 uppercase tracking-wider text-[11px] block">
                Paper-Specific Instructions
              </span>
              {/<[a-z][\s\S]*>/i.test(instructionsText) ? (
                <RichContent
                  html={instructionsText}
                  className="text-xs text-slate-800 leading-relaxed"
                />
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed text-slate-800">
                  {instructionsText}
                </p>
              )}
            </div>
          ) : null}

          {/* 1. Question Palette Status Legend */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-300 pb-1">
              <span className="text-blue-700">1.</span> Question Palette Symbols &amp; Status Meanings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 border border-slate-300 bg-white shadow-sm">
                <span className="size-6 shrink-0 border border-slate-300 bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                  1
                </span>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold text-slate-900 block text-xs">Not Visited</span>
                  <span className="text-slate-500 text-[11px] leading-tight block">
                    You have not yet visited this question.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 border border-slate-300 bg-white shadow-sm">
                <span className="size-6 shrink-0 bg-red-600 text-white font-bold text-xs flex items-center justify-center">
                  2
                </span>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold text-slate-900 block text-xs">Not Answered</span>
                  <span className="text-slate-500 text-[11px] leading-tight block">
                    You have visited the question but have not recorded an answer.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 border border-slate-300 bg-white shadow-sm">
                <span className="size-6 shrink-0 bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                  3
                </span>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold text-slate-900 block text-xs">Answered</span>
                  <span className="text-slate-500 text-[11px] leading-tight block">
                    You have answered the question. This response will be evaluated.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 border border-slate-300 bg-white shadow-sm">
                <span className="size-6 shrink-0 bg-violet-600 text-white font-bold text-xs flex items-center justify-center">
                  4
                </span>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold text-slate-900 block text-xs">Marked for Review</span>
                  <span className="text-slate-500 text-[11px] leading-tight block">
                    Flagged for later review without an answer.
                  </span>
                </div>
              </div>

              <div className="sm:col-span-2 flex items-start gap-2.5 p-2.5 border border-slate-300 bg-white shadow-sm">
                <span className="relative size-6 shrink-0 bg-violet-600 text-white font-bold text-xs flex items-center justify-center after:content-[''] after:absolute after:bottom-0.5 after:right-0.5 after:size-2 after:bg-emerald-400">
                  5
                </span>
                <div className="space-y-0.5 min-w-0">
                  <span className="font-bold text-slate-900 block text-xs">Answered &amp; Marked for Review</span>
                  <span className="text-slate-700 text-[11px] leading-tight block">
                    The question has been answered and marked for review. <strong className="text-emerald-700">Note:</strong> It will be evaluated towards your final score according to official examination rules.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Navigation & Answering Mechanics */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-300 pb-1">
              <span className="text-blue-700">2.</span> Navigating to a Question &amp; Answering
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
              <div className="border border-slate-300 bg-white p-3 space-y-1.5 shadow-sm">
                <span className="font-bold text-blue-700 text-xs block">Navigation Controls</span>
                <ul className="space-y-1 text-slate-700 text-[11px] leading-relaxed list-disc list-inside">
                  <li>Click any question number in the palette to navigate directly.</li>
                  <li>Click <strong className="text-slate-950 font-bold">Save &amp; Next</strong> to save answer and advance.</li>
                  <li>Click <strong className="text-slate-950 font-bold">Mark for Review &amp; Next</strong> to flag question.</li>
                  <li>Click <strong className="text-slate-950 font-bold">Clear Response</strong> to deselect chosen option.</li>
                </ul>
              </div>

              <div className="border border-slate-300 bg-white p-3 space-y-1.5 shadow-sm">
                <span className="font-bold text-blue-700 text-xs block">Question Types &amp; Input</span>
                <ul className="space-y-1 text-slate-700 text-[11px] leading-relaxed list-disc list-inside">
                  <li><strong className="text-slate-950 font-bold">MCQ (Single Choice):</strong> Select radio button for one option.</li>
                  <li><strong className="text-slate-950 font-bold">MSQ (Multiple Select):</strong> Select all checkboxes that apply.</li>
                  <li><strong className="text-slate-950 font-bold">NAT (Numerical):</strong> Enter value via virtual keypad.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 3. Keyboard Shortcuts */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-300 pb-1">
              <KeyboardIcon className="size-3.5 text-blue-700" />
              <span className="text-blue-700">3.</span> Keyboard Navigation Shortcuts
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 border border-slate-300 bg-white shadow-sm">
                <span className="font-mono font-bold text-blue-700 block text-xs">Alt + S</span>
                <span className="text-[11px] text-slate-500 block">Save &amp; Next</span>
              </div>
              <div className="p-2 border border-slate-300 bg-white shadow-sm">
                <span className="font-mono font-bold text-violet-700 block text-xs">Alt + M</span>
                <span className="text-[11px] text-slate-500 block">Mark for Review</span>
              </div>
              <div className="p-2 border border-slate-300 bg-white shadow-sm">
                <span className="font-mono font-bold text-red-700 block text-xs">Alt + C</span>
                <span className="text-[11px] text-slate-500 block">Clear Response</span>
              </div>
              <div className="p-2 border border-slate-300 bg-white shadow-sm">
                <span className="font-mono font-bold text-slate-800 block text-xs">1, 2, 3, 4</span>
                <span className="text-[11px] text-slate-500 block">Select Option A-D</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pinned Footer (Never shrinks, always visible at bottom) */}
        <div className="border-t border-slate-300 bg-[#f8fafc] px-5 py-2.5 shrink-0 flex items-center justify-between">
          <div className="text-xs text-slate-500 hidden sm:block">
            Institutional CBT Examination Environment
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="rounded-none border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-6 shadow-none ml-auto"
          >
            I Understand — Return to Exam
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

