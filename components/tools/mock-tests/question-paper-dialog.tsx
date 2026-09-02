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
import { FileTextIcon, ArrowRightIcon } from "lucide-react"
import { RichContent } from "@/components/tools/mock-tests/editor/rich-content"
import { questionKindLabel } from "@/lib/tools/mock-tests/kind-labels"
import type { PlayerAttempt } from "@/lib/tools/definitions/mock-tests/repository"

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
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-border bg-card p-6 sm:rounded-2xl space-y-6">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                <FileTextIcon className="size-5 text-brand-violet-ink" /> Question Paper Preview
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {attempt.assessmentTitle} • {attempt.questions.length} Questions Total
              </DialogDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {attempt.durationMinutes ? `${attempt.durationMinutes} Mins` : "Untimed"}
            </Badge>
          </div>
        </DialogHeader>

        {/* Questions list */}
        <div className="space-y-6 divide-y divide-border/60">
          {attempt.questions.map((q, idx) => (
            <div key={q.id} className="pt-6 first:pt-0 space-y-3">
              {/* Question metadata header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-muted font-mono text-xs font-bold text-foreground">
                    {idx + 1}
                  </span>
                  <Badge variant="outline" className="text-xs font-medium">
                    {questionKindLabel(q.kind)}
                  </Badge>
                  {q.section ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {q.section}
                    </Badge>
                  ) : null}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-xs font-mono">
                    <span className="font-bold text-brand-violet-ink">+{q.marks}</span>
                    {q.negativeMarks < 0 ? (
                      <span className="font-bold text-destructive ml-1.5">{q.negativeMarks}</span>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => {
                      onSelectQuestion(idx)
                      onClose()
                    }}
                    className="text-xs text-brand-violet-ink hover:bg-brand-violet-soft gap-1"
                  >
                    Jump to Q{idx + 1}
                    <ArrowRightIcon className="size-3" />
                  </Button>
                </div>
              </div>

              {/* Question stem with KaTeX */}
              <RichContent html={q.stem} className="text-sm leading-relaxed text-foreground" />

              {/* Options list if choice type */}
              {q.options && q.options.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 pl-2">
                  {q.options.map((opt) => (
                    <div
                      key={opt.key}
                      className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-muted/20 p-2.5 text-xs text-foreground"
                    >
                      <span className="flex size-5 shrink-0 items-center justify-center rounded border border-border bg-card font-mono text-[10px] font-bold text-muted-foreground">
                        {opt.key}
                      </span>
                      <RichContent html={opt.content} className="flex-1 leading-snug" />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t border-border">
          <Button type="button" onClick={onClose} size="sm">
            Back to Test
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
