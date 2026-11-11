"use client"

import { type MouseEvent } from "react"
import { PaginationControls } from "@/components/shared/pagination-controls"

export const ASSESSMENTS_PER_PAGE = 12

export function AssessmentPagination({
  page,
  total,
  onChange,
  headingId,
}: {
  page: number
  total: number
  onChange: (page: number) => void
  headingId: string
}) {
  const pages = Math.max(1, Math.ceil(total / ASSESSMENTS_PER_PAGE))
  if (total === 0) return null
  function navigate(event: MouseEvent<HTMLAnchorElement>, next: number) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return
    event.preventDefault()
    if (next < 1 || next > pages || next === page) return
    onChange(next)
    requestAnimationFrame(() => {
      const heading = document.getElementById(headingId)
      heading?.focus({ preventScroll: true })
      heading?.scrollIntoView({ block: "start", behavior: "instant" })
    })
  }
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border pt-4 sm:flex-row">
      <p
        className="shrink-0 text-xs text-muted-foreground tabular-nums"
        aria-live="polite"
        aria-atomic="true"
      >
        {(page - 1) * ASSESSMENTS_PER_PAGE + 1}–
        {Math.min(page * ASSESSMENTS_PER_PAGE, total)} of {total} papers
      </p>
      {pages > 1 ? (
        <PaginationControls
          page={page}
          totalPages={pages}
          label="Assessment pages"
          href={() => `#${headingId}`}
          onNavigate={navigate}
        />
      ) : null}
    </div>
  )
}
