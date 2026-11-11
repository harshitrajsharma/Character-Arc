"use client"

import { useEffect, useRef, useTransition, type MouseEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { PaginationControls } from "./pagination-controls"

/** URL/focus controller shared by bounded server-backed collections. */
export function UrlPagination({
  pagination,
  pathname,
  queryKey,
  unit,
  headingId,
  fixedParams,
}: {
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  pathname: string
  queryKey: string
  unit: string
  headingId: string
  fixedParams?: Record<string, string>
}) {
  const router = useRouter()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()
  const previousPage = useRef(pagination.page)
  useEffect(() => {
    if (previousPage.current === pagination.page) return
    previousPage.current = pagination.page
    const heading = document.getElementById(headingId)
    heading?.focus({ preventScroll: true })
    heading?.scrollIntoView({ block: "start", behavior: "instant" })
  }, [pagination.page, headingId])
  function href(page: number) {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(fixedParams ?? {}))
      next.set(key, value)
    next.set(queryKey, String(page))
    return `${pathname}?${next.toString()}`
  }
  function navigate(event: MouseEvent<HTMLAnchorElement>, page: number) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    )
      return
    event.preventDefault()
    if (
      pending ||
      page === pagination.page ||
      page < 1 ||
      page > pagination.totalPages
    )
      return
    startTransition(() => router.push(href(page), { scroll: false }))
  }
  if (!pagination.total) return null
  return (
    <div
      className="flex flex-col items-center justify-between gap-3 border-t border-border p-4 sm:flex-row sm:px-6"
      aria-busy={pending}
    >
      <p role="status" className="text-xs text-muted-foreground tabular-nums">
        {pending
          ? `Loading ${unit}…`
          : `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total} ${unit}`}
      </p>
      {pagination.totalPages > 1 ? (
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          label={`${unit} pages`}
          href={href}
          onNavigate={navigate}
          pending={pending}
        />
      ) : null}
    </div>
  )
}
