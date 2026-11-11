"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { LinkIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty"
import { createIdempotencyKey } from "@/lib/forms/idempotency-key"
import {
  getSubjectAssessmentCatalogAction,
  setSubjectAssessmentLinkAction,
  type SubjectAssessmentCandidate,
} from "@/lib/tools/exam-prep/actions/assessment-actions"
import type { SubjectAssessmentScope } from "@/lib/tools/exam-prep/assessment-study-context"

export function SubjectAssessmentLinkDialog({
  open,
  onOpenChange,
  workspaceSlug,
  scope,
  scopeTitle,
  viewerId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  workspaceSlug: string
  scope: SubjectAssessmentScope
  scopeTitle: string
  viewerId: string
}) {
  const router = useRouter()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [search, setSearch] = useState("")
  const [debounced, setDebounced] = useState("")
  const [page, setPage] = useState(1)
  const [pending, startTransition] = useTransition()
  const [linking, setLinking] = useState<string | null>(null)
  const [error, setError] = useState("")
  const keys = useRef(new Map<string, string>())
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(timer)
  }, [search])
  const query = useQuery({
    queryKey: [
      "subject-assessment-catalog",
      viewerId,
      workspaceSlug,
      scope.examId,
      scope.subjectId,
      scope.chapterId ?? null,
      debounced,
      page,
    ],
    queryFn: () =>
      getSubjectAssessmentCatalogAction({
        workspaceSlug,
        ...scope,
        search: debounced,
        page,
      }),
    enabled: open,
    staleTime: 30_000,
    retry: 1,
  })
  function link(paper: SubjectAssessmentCandidate) {
    const operation = `${paper.id}:${paper.revision}:${scope.chapterId ?? scope.subjectId}`
    if (!keys.current.has(operation))
      keys.current.set(operation, createIdempotencyKey())
    setLinking(paper.id)
    setError("")
    startTransition(async () => {
      try {
        await setSubjectAssessmentLinkAction({
          workspaceSlug,
          ...scope,
          assessmentId: paper.id,
          expectedRevision: paper.revision,
          operation: "link",
          idempotencyKey: keys.current.get(operation)!,
        })
        keys.current.delete(operation)
        toast.success("Assessment linked", {
          description: `Available in ${scopeTitle} tests.`,
        })
        void query.refetch()
        router.refresh()
        onOpenChange(false)
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Could not link the assessment. Try again."
        )
      } finally {
        setLinking(null)
      }
    })
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!pending) onOpenChange(next)
      }}
    >
      <DialogContent
        initialFocus={titleRef}
        className="flex max-h-[min(42rem,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl [&_[data-slot=dialog-close]]:size-11"
      >
        <DialogHeader className="m-0 shrink-0 p-5 pr-16">
          <DialogTitle ref={titleRef} tabIndex={-1} className="outline-none">
            Link an assessment
          </DialogTitle>
          <DialogDescription className="wrap-anywhere">
            Link an unassigned assessment to:
            <span
              className="block truncate font-medium text-foreground"
              title={scopeTitle}
            >
              {scopeTitle}
            </span>
          </DialogDescription>
        </DialogHeader>
        <div className="shrink-0 border-b border-border px-5 py-3">
          <Field>
            <FieldLabel htmlFor="subject-assessment-search">
              <SearchIcon aria-hidden="true" className="size-4" /> Search
              assessments
            </FieldLabel>
            <Input
              id="subject-assessment-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              maxLength={200}
              disabled={pending}
              placeholder="Search by title"
              className="h-11"
            />
          </Field>
        </div>
        <div
          className="min-h-0 flex-1 overflow-y-auto p-5"
          aria-busy={query.isFetching || pending}
        >
          {error ? (
            <Alert variant="destructive" role="alert" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {query.isPending ? (
            <div
              className="grid gap-3"
              role="status"
              aria-label="Loading assessments"
            >
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton
                  key={index}
                  className="h-20 w-full motion-reduce:animate-none"
                />
              ))}
            </div>
          ) : query.isError ? (
            <Alert role="alert">
              <AlertDescription className="flex items-center justify-between gap-3">
                Assessments could not be loaded.
                <Button variant="outline" onClick={() => void query.refetch()}>
                  Retry
                </Button>
              </AlertDescription>
            </Alert>
          ) : !query.data?.items.length ? (
            <Empty variant="compact">
              <EmptyHeader>
                <EmptyTitle>No unassigned assessments</EmptyTitle>
                <EmptyDescription>
                  {debounced
                    ? "Try another title."
                    : "Create an assessment for this study area. Already linked assessments keep their current context."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <ul className="divide-y divide-border">
              {query.data.items.map((paper) => (
                <li
                  key={paper.id}
                  className="flex min-w-0 items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium wrap-anywhere">
                      {paper.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline">
                        {paper.status === "PUBLISHED"
                          ? "Published"
                          : paper.status === "IN_REVIEW"
                            ? "In review"
                            : "Draft"}
                      </Badge>
                      <span>{paper.questionCount} questions</span>
                      <span>
                        {paper.durationMinutes
                          ? `${paper.durationMinutes} min`
                          : "Untimed"}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="min-h-11 shrink-0"
                    disabled={
                      pending || query.isFetching || search.trim() !== debounced
                    }
                    onClick={() => link(paper)}
                    aria-label={`Link ${paper.title}`}
                  >
                    <LinkIcon data-icon="inline-start" />
                    {linking === paper.id ? "Linking…" : "Link"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground">
          <Button
            variant="outline"
            className="min-h-11"
            disabled={
              pending ||
              query.isFetching ||
              search.trim() !== debounced ||
              !query.data ||
              query.data.page <= 1
            }
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            Prev
          </Button>
          <span aria-live="polite">
            {query.data
              ? `${query.data.total} assessments · Page ${query.data.page} of ${query.data.totalPages}`
              : "Loading…"}
          </span>
          <Button
            variant="outline"
            className="min-h-11"
            disabled={
              pending ||
              query.isFetching ||
              search.trim() !== debounced ||
              !query.data ||
              query.data.page >= query.data.totalPages
            }
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
