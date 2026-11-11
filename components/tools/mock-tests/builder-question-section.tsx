"use client"

import { useId, type ReactNode } from "react"
import { ChevronDownIcon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatNumber } from "@/lib/tools/mock-tests/kind-labels"
import type { SectionDefinition } from "@/lib/tools/definitions/mock-tests/repository"
import { cn } from "@/lib/utils"

/** Section presentation only; the builder owns roster, edits and persistence. */
export function BuilderQuestionSection({
  section,
  questionCount,
  marks,
  open,
  onOpenChange,
  onAddQuestions,
  actions,
  busy,
  children,
}: {
  section: SectionDefinition
  questionCount: number
  marks: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddQuestions: () => void
  actions: ReactNode
  busy: boolean
  children: ReactNode
}) {
  const titleId = useId()
  const instructionsId = useId()
  return (
    <section
      aria-labelledby={titleId}
      className="min-w-0 overflow-hidden rounded-lg border border-border bg-card"
      data-builder-section
    >
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <header className="flex min-w-0 items-start gap-2 p-3 sm:items-center sm:gap-3 sm:p-4">
          <CollapsibleTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-11 shrink-0 rounded-lg"
                aria-label={`${open ? "Collapse" : "Expand"} section ${section.title}`}
              />
            }
          >
            <ChevronDownIcon
              aria-hidden="true"
              className={cn(
                "transition-transform motion-reduce:transition-none",
                !open && "-rotate-90"
              )}
            />
          </CollapsibleTrigger>
          <div className="min-w-0 flex-1 py-0.5">
            <h3
              id={titleId}
              className="text-base leading-6 font-semibold wrap-anywhere"
            >
              {section.title}
            </h3>
            <p className="mt-1 flex flex-wrap gap-x-2 text-xs leading-5 text-muted-foreground">
              <span>
                {questionCount} {questionCount === 1 ? "question" : "questions"}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {formatNumber(marks)} {marks === 1 ? "mark" : "marks"}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="outline"
                    className="h-11 min-w-11 gap-1.5 px-3"
                    aria-label={`Add questions to ${section.title}`}
                    disabled={busy}
                    onClick={onAddQuestions}
                  />
                }
              >
                <PlusIcon aria-hidden="true" data-icon="inline-start" />
                <span className="hidden sm:inline">Add questions</span>
              </TooltipTrigger>
              <TooltipContent>Add questions to this section</TooltipContent>
            </Tooltip>
            {actions}
          </div>
        </header>
        <CollapsibleContent>
          {section.description?.trim() ? (
            <div
              className="flex min-w-0 flex-col gap-2 border-t border-border px-4 py-4 sm:px-5"
              role="group"
              aria-labelledby={instructionsId}
            >
              <p
                id={instructionsId}
                className="text-xs font-medium text-muted-foreground"
              >
                Section instructions
              </p>
              <p className="text-sm leading-relaxed wrap-anywhere whitespace-pre-line">
                {section.description}
              </p>
            </div>
          ) : null}
          <div className="min-w-0 border-t border-border bg-background p-3 sm:p-4">
            {questionCount ? (
              <ul className="grid min-w-0 gap-3">{children}</ul>
            ) : (
              <Empty variant="compact">
                <EmptyHeader>
                  <EmptyTitle>No questions yet</EmptyTitle>
                  <EmptyDescription>
                    Use Add questions to choose from your bank or create a
                    question for this section.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  )
}
