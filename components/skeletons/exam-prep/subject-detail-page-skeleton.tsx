import { Skeleton } from "@/components/ui/skeleton"

const PROGRESS_CATEGORIES = 4
const RECOMMENDATION_CARDS = 3
const CHAPTER_ROWS = 3

function ProgressCardSkeleton() {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-muted bg-card p-3 md:p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-5 w-10 rounded-md" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {Array.from({ length: PROGRESS_CATEGORIES }, (_, index) => (
          <div key={index} className="flex flex-col gap-2 p-1 md:p-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-16 rounded-md" />
              <Skeleton className="h-5 w-10 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <Skeleton className="h-3 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}

function SubjectStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2.5 md:gap-3">
      {Array.from({ length: 4 }, (_, index) => (
        <div
          key={index}
          className="flex min-h-24 flex-col gap-2 rounded-lg border bg-card p-2.5 md:p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="size-4 rounded-md" />
          </div>
          <Skeleton className="h-6 w-16 rounded-md" />
          <Skeleton className="h-3 w-4/5 rounded-md" />
        </div>
      ))}
    </div>
  )
}

function RecommendationsSkeleton() {
  return (
    <section className="flex flex-col gap-4" aria-hidden="true">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-28 rounded-md" />
          <Skeleton className="h-4 w-72 max-w-full rounded-md" />
        </div>
        <Skeleton className="h-11 w-40 rounded-full sm:h-9" />
      </div>
      <Skeleton className="h-4 w-16 rounded-md" />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: RECOMMENDATION_CARDS }, (_, index) => (
          <div
            key={index}
            className="flex h-36 flex-col justify-between rounded-lg border bg-card p-3.5"
          >
            <div className="flex flex-col gap-2">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>
            <Skeleton className="h-9 w-full rounded-full" />
          </div>
        ))}
      </div>
    </section>
  )
}

function SyllabusSkeleton() {
  return (
    <section className="flex flex-col gap-4" aria-hidden="true">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-20 rounded-md" />
          <Skeleton className="h-8 w-56 max-w-full rounded-md" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 rounded-full sm:h-9 sm:w-32" />
          <Skeleton className="h-11 flex-1 rounded-full sm:h-9 sm:w-32" />
        </div>
      </div>

      <Skeleton className="h-11 w-full rounded-full sm:h-10 sm:max-w-lg" />

      <div className="flex flex-col gap-3">
        {Array.from({ length: CHAPTER_ROWS }, (_, index) => (
          <div
            key={index}
            className="flex min-h-20 items-center gap-3 rounded-lg border bg-card p-4"
          >
            <Skeleton className="size-9 shrink-0 rounded-md" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-2/5 rounded-md" />
              <Skeleton className="h-3 w-3/5 rounded-md" />
            </div>
            <Skeleton className="hidden h-2 w-28 rounded-full sm:block" />
            <Skeleton className="size-9 shrink-0 rounded-full" />
          </div>
        ))}
      </div>
    </section>
  )
}

export function SubjectDetailPageSkeleton() {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 pt-16 pb-8 sm:pb-10 md:px-6 md:pt-24 xl:px-10"
      aria-busy="true"
      aria-label="Loading subject details"
    >
      <div className="flex flex-col gap-5 md:gap-8">
        <header className="flex items-center gap-1.5 md:gap-4">
          <Skeleton className="hidden size-10 shrink-0 rounded-full md:block" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-7 w-56 max-w-3/5 rounded-md" />
              <Skeleton className="size-10 shrink-0 rounded-full" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
          </div>
        </header>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6" aria-hidden="true">
          <ProgressCardSkeleton />
          <SubjectStatsSkeleton />
        </div>

        <RecommendationsSkeleton />
        <SyllabusSkeleton />

        <section className="flex flex-col gap-4 rounded-xl border bg-card p-4" aria-hidden="true">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-6 w-32 rounded-md" />
              <Skeleton className="h-4 w-56 max-w-full rounded-md" />
            </div>
            <Skeleton className="h-11 w-28 rounded-full sm:h-9" />
          </div>
          <Skeleton className="h-20 w-full rounded-lg" />
        </section>
      </div>
    </main>
  )
}
