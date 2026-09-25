"use client"

import { useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  FileTextIcon,
  ArrowRightIcon,
  XIcon,
  LayersIcon,
  InfoIcon,
} from "lucide-react"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { questionKindLabel } from "@/lib/tools/mock-tests/kind-labels"
import type {
  PlayerAttempt,
  SectionDefinition,
} from "@/lib/tools/definitions/mock-tests/repository"

function matchesSection(
  qSection: string | null | undefined,
  sec: SectionDefinition
): boolean {
  if (!qSection) return false
  const trimmed = qSection.trim()
  return trimmed === sec.key || trimmed === sec.title
}

function findQuestionSection(
  qSection: string | null | undefined,
  sectionsList: SectionDefinition[]
): SectionDefinition | undefined {
  if (!qSection) return undefined
  const trimmed = qSection.trim()
  return sectionsList.find((s) => s.key === trimmed || s.title === trimmed)
}

interface QuestionPaperDialogProps {
  isOpen: boolean
  onClose: () => void
  attempt: PlayerAttempt
  onSelectQuestion: (index: number) => void
}

export function QuestionPaperDialog({
  isOpen,
  onClose,
  attempt,
  onSelectQuestion,
}: QuestionPaperDialogProps) {
  const [selectedSection, setSelectedSection] = useState<string>("all")

  // Extract sections using attempt.sections with fallback to unique question sections
  const sections: SectionDefinition[] = useMemo(() => {
    if (attempt.sections && attempt.sections.length > 0) {
      return attempt.sections
    }
    const uniqueKeys: string[] = []
    const seen = new Set<string>()
    for (const q of attempt.questions) {
      if (q.section && q.section.trim().length > 0) {
        const trimmed = q.section.trim()
        if (!seen.has(trimmed)) {
          seen.add(trimmed)
          uniqueKeys.push(trimmed)
        }
      }
    }
    if (uniqueKeys.length > 0) {
      return uniqueKeys.map((s) => ({ key: s, title: s }))
    }
    return []
  }, [attempt.sections, attempt.questions])

  // Questions paired with their original absolute index (0..N-1)
  const questionsWithIndex = useMemo(() => {
    return attempt.questions.map((q, originalIdx) => ({
      q,
      originalIdx,
    }))
  }, [attempt.questions])

  const displayedQuestions = useMemo(() => {
    if (selectedSection === "all") return questionsWithIndex
    const sec = sections.find((s) => s.key === selectedSection)
    if (!sec) return questionsWithIndex
    return questionsWithIndex.filter((item) => matchesSection(item.q.section, sec))
  }, [questionsWithIndex, sections, selectedSection])

  const scrollToQuestion = (originalIdx: number) => {
    const el = document.getElementById(`cbt-qp-question-${originalIdx}`)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[96vw] max-w-[96vw] sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl h-[90vh] max-h-[90vh] overflow-hidden flex flex-col rounded-none border border-slate-300 bg-white text-slate-900 p-0 shadow-xl font-sans gap-0 ring-0 focus:outline-none"
      >
        {/* Pinned Header */}
        <div className="border-b border-slate-300 bg-[#f1f5f9] px-5 py-3 pr-5 shrink-0 flex flex-row items-center justify-between gap-4">
          <div className="space-y-0.5 min-w-0 flex-1">
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2 truncate">
              <span className="size-6 shrink-0 bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                <FileTextIcon className="size-3.5" />
              </span>
              <span className="truncate">Question Paper Preview</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 truncate">
              {attempt.assessmentTitle} • {attempt.questions.length} Questions Total
            </DialogDescription>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-bold text-blue-700">
              {attempt.durationMinutes ? `${attempt.durationMinutes} MINS` : "UNTIMED"}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={onClose}
              className="rounded-none border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs h-7 px-2.5 gap-1 shadow-none"
            >
              <XIcon className="size-3.5" />
              Close
            </Button>
          </div>
        </div>

        {/* Section Filter & Quick Jump Bar */}
        <div className="border-b border-slate-200 bg-[#f8fafc] px-5 py-2.5 shrink-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Section tabs */}
            {sections.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 mr-1">
                  <LayersIcon className="size-3 text-slate-500" />
                  Sections:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedSection("all")}
                  className={`px-2.5 py-1 text-xs font-bold border transition-colors ${
                    selectedSection === "all"
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  All ({attempt.questions.length})
                </button>
                {sections.map((sec) => {
                  const count = attempt.questions.filter((q) =>
                    matchesSection(q.section, sec)
                  ).length
                  return (
                    <button
                      key={sec.key}
                      type="button"
                      onClick={() => setSelectedSection(sec.key)}
                      className={`px-2.5 py-1 text-xs font-bold border transition-colors cursor-pointer ${
                        selectedSection === sec.key
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {sec.title} ({count})
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                Viewing all {attempt.questions.length} questions in sequence
              </div>
            )}

            <div className="text-[11px] text-slate-500">
              Click any question number to scroll directly to it
            </div>
          </div>

          {/* Quick jump question numbers chip ribbon */}
          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto cbt-scrollbar pt-1">
            {displayedQuestions.map(({ originalIdx }) => (
              <button
                key={originalIdx}
                type="button"
                onClick={() => scrollToQuestion(originalIdx)}
                className="size-6 text-[11px] font-bold border border-slate-300 bg-white text-slate-700 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-colors flex items-center justify-center shrink-0"
                title={`Scroll to Question ${originalIdx + 1}`}
              >
                {originalIdx + 1}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Questions Booklet (min-h-0 allows flex child to shrink and scroll properly) */}
        <div className="flex-1 min-h-0 overflow-y-auto cbt-scrollbar p-5 sm:p-6 space-y-6 bg-[#f1f5f9]">
          {displayedQuestions.map(({ q, originalIdx }, idx) => {
            const currentSec = findQuestionSection(q.section, sections)
            const prevQ = idx > 0 ? displayedQuestions[idx - 1].q : null
            const prevSec = prevQ ? findQuestionSection(prevQ.section, sections) : null
            const isFirstOfSection = idx === 0 || currentSec?.key !== prevSec?.key

            return (
              <div key={q.id} className="space-y-4">
                {/* Section header and description banner when section begins */}
                {isFirstOfSection && currentSec ? (
                  <div className="space-y-2">
                    {selectedSection === "all" && sections.length > 1 ? (
                      <div className="bg-[#0284c7] text-white px-4 py-2 font-bold text-xs flex items-center justify-between uppercase tracking-wider">
                        <span>Section: {currentSec.title}</span>
                        <span className="font-mono text-[11px] font-normal lowercase">
                          {attempt.questions.filter((item) => matchesSection(item.section, currentSec)).length} questions
                        </span>
                      </div>
                    ) : null}

                    {currentSec.description ? (
                      <div className="border border-blue-200 bg-blue-50 p-4 text-xs text-slate-800 space-y-1.5 shadow-sm">
                        <div className="flex items-center gap-2 font-bold text-blue-900 text-xs uppercase tracking-wide">
                          <InfoIcon className="size-4 text-blue-600 shrink-0" />
                          <span>Section Instructions: {currentSec.title}</span>
                        </div>
                        <div className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap pl-6">
                          {currentSec.description}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div
                  id={`cbt-qp-question-${originalIdx}`}
                  className="border border-slate-300 bg-white transition-colors shadow-sm"
                >
                  {/* Question metadata header bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-[#f8fafc] px-4 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-white border border-slate-300 font-sans text-xs font-bold text-slate-900">
                        Question {originalIdx + 1} of {attempt.questions.length}
                      </span>
                      <span className="border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                        {questionKindLabel(q.kind)}
                      </span>
                      {currentSec ? (
                        <span className="border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                          Section: {currentSec.title}
                        </span>
                      ) : q.section ? (
                        <span className="border border-slate-200 bg-white px-2 py-0.5 text-[11px] text-slate-600">
                          Section: {q.section}
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-xs font-mono">
                        <span className="font-bold text-emerald-700">+{q.marks.toFixed(2)} Marks</span>
                        {q.negativeMarks < 0 ? (
                          <span className="font-bold text-red-700 ml-2">{q.negativeMarks.toFixed(2)} Neg</span>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          onSelectQuestion(originalIdx)
                          onClose()
                        }}
                        className="rounded-none border border-blue-600 bg-white text-blue-700 hover:bg-blue-50 text-xs gap-1.5 shadow-none h-7 px-3 font-semibold"
                      >
                        Jump to Question
                        <ArrowRightIcon className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Question stem body */}
                  <div className="p-4 sm:p-5 space-y-4">
                    <div className="text-sm sm:text-base leading-relaxed text-slate-900 rich-text">
                      <RichContent html={q.stem} />
                    </div>

                    {/* Options list if choice type */}
                    {q.options && q.options.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                        {q.options.map((opt) => (
                          <div
                            key={opt.key}
                            className="flex items-start gap-3 border border-slate-200 bg-[#f8fafc] p-3 text-xs sm:text-sm text-slate-900"
                          >
                            <span className="flex size-6 shrink-0 items-center justify-center border border-slate-300 bg-white font-sans text-xs font-bold text-blue-700">
                              {opt.key}
                            </span>
                            <div className="flex-1 leading-snug rich-text text-slate-900">
                              <RichContent html={opt.content} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Numerical / Text Answer Type indicator */}
                    {q.kind === "NUMERIC" || q.kind === "SHORT_ANSWER" ? (
                      <div className="border border-dashed border-slate-300 bg-slate-50 p-3 text-xs text-slate-600 flex items-center gap-2">
                        <span className="font-mono text-blue-700 font-bold">
                          {q.kind === "NUMERIC" ? "NAT:" : "TEXT:"}
                        </span>
                        <span>
                          {q.kind === "NUMERIC"
                            ? "Candidate enters numerical response using the virtual numeric keypad during test attempt."
                            : "Candidate enters subjective/short text response in the input field."}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Pinned Footer */}
        <div className="border-t border-slate-300 bg-[#f8fafc] px-5 py-3 shrink-0 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-900">{displayedQuestions.length}</strong> of{" "}
            <strong className="text-slate-900">{attempt.questions.length}</strong> questions
          </div>
          <Button
            type="button"
            onClick={onClose}
            className="rounded-none border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-8 px-5 shadow-none"
          >
            Close Question Paper
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

