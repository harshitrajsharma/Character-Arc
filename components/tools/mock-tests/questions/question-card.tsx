"use client"

import { useId, type ReactNode } from "react"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { QuestionSummary } from "./question-view"
import type { QuestionAllocation, QuestionContent } from "./question-types"

type Props = {
  question: QuestionContent
  allocation?: QuestionAllocation
  summary?: ReactNode
  actions?: ReactNode
  footer?: ReactNode
  footerPlacement?: "header" | "bottom"
  children?: ReactNode
} & (
  | { mode: "static" }
  | {
      mode: "disclosure"
      expanded: boolean
      onToggle: () => void
      label: string
    }
)

/** Shared app frame. Content and management actions are separate native targets. */
export function QuestionCard(props: Props) {
  const id = useId()
  const expanded = props.mode === "static" || props.expanded
  return (
    <article
      className="min-w-0 overflow-hidden rounded-lg border border-border bg-card"
      data-question-card=""
    >
      <div
        className={cn(
          "relative isolate grid min-w-0 gap-3 p-4 sm:p-5",
          props.mode === "disclosure" && "transition-colors hover:bg-muted/30"
        )}
      >
        {props.mode === "disclosure" ? (
          <button
            type="button"
            className="absolute inset-0 z-10 cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            aria-label={props.label}
            aria-describedby={`${id}-summary`}
            aria-expanded={props.expanded}
            aria-controls={`${id}-content`}
            onClick={props.onToggle}
          />
        ) : null}
        <div className="flex min-w-0 items-start gap-3">
          <div id={`${id}-summary`} className="min-w-0 flex-1">
            {props.summary ?? (
              <QuestionSummary
                question={props.question}
                allocation={props.allocation}
              />
            )}
          </div>
          {props.actions ? (
            <div className="relative z-20 flex shrink-0 flex-wrap items-center gap-1">
              {props.actions}
            </div>
          ) : null}
          {props.mode === "disclosure" ? (
            <ChevronDownIcon
              aria-hidden="true"
              className={cn(
                "mt-1 size-4 shrink-0 text-muted-foreground",
                props.expanded && "rotate-180"
              )}
            />
          ) : null}
        </div>
        {props.footer && props.footerPlacement !== "bottom" ? (
          <div className="pointer-events-none relative z-20 min-w-0 [&_a]:pointer-events-auto [&_button]:pointer-events-auto">
            {props.footer}
          </div>
        ) : null}
      </div>
      <div id={`${id}-content`} hidden={!expanded}>
        {expanded && props.children ? (
          <div className="grid min-w-0 gap-4 border-t border-border p-4 sm:p-5">
            {props.children}
          </div>
        ) : null}
      </div>
      {props.footer && props.footerPlacement === "bottom" ? (
        <footer className="min-w-0 border-t border-border bg-muted/20 p-3 sm:px-5">
          {props.footer}
        </footer>
      ) : null}
    </article>
  )
}
