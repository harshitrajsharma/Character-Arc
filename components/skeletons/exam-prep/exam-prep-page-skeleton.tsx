import { Skeleton } from "@/components/ui/skeleton"

const EXAM_ROW_SKELETONS = 3

function ExamRowSkeleton() {
  return (
    <div className="grid min-h-24 grid-cols-[3rem_minmax(0,1fr)_1.5rem] items-center gap-3 border-b px-3 py-3 last:border-b-0 sm:min-h-20 sm:grid-cols-[3rem_minmax(0,1fr)_9.5rem_8rem_1.5rem] sm:px-4">
      <Skeleton className="size-12 rounded-md" />
      <div className="flex min-w-0 flex-col gap-2">
        <Skeleton className="h-5 w-2/5 rounded-md" />
        <Skeleton className="h-4 w-4/5 rounded-md" />
      </div>
      <Skeleton className="hidden h-4 w-28 rounded-md sm:block" />
      <Skeleton className="hidden h-2 w-full rounded-full sm:block" />
      <Skeleton className="size-4 rounded-md" />
    </div>
  )
}

export function ExamPrepPageSkeleton() {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 pt-24 pb-8 sm:pb-10 md:px-6 xl:px-10"
      aria-busy="true"
      aria-label="Loading Exam Prep"
    >
      <header className="flex flex-col gap-7 py-2 sm:flex-row sm:items-end sm:justify-between sm:py-4">
        <div className="flex w-full max-w-3xl items-start gap-4">
          <Skeleton className="size-12 shrink-0 rounded-2xl sm:size-14" />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <Skeleton className="h-5 w-36 rounded-md" />
            <Skeleton className="h-10 w-48 max-w-full rounded-md" />
            <div className="flex flex-col gap-2 sm:mt-1">
              <Skeleton className="h-5 w-full max-w-2xl rounded-md" />
              <Skeleton className="h-5 w-4/5 max-w-xl rounded-md" />
            </div>
          </div>
        </div>
        <Skeleton className="h-11 w-full rounded-full sm:h-9 sm:w-28" />
      </header>

      <section className="mt-8" aria-hidden="true">
        <div className="flex items-end justify-between gap-4 border-b pb-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-44 rounded-md" />
            <Skeleton className="h-7 w-36 rounded-md" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>

        <div className="mt-4 overflow-hidden rounded-lg border bg-card">
          <div className="flex h-11 items-center gap-2 border-b bg-muted/50 px-4">
            <Skeleton className="h-1.5 w-5 rounded-full" />
            <Skeleton className="size-4 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
            <Skeleton className="ml-auto h-4 w-4 rounded-md" />
          </div>
          {Array.from({ length: EXAM_ROW_SKELETONS }, (_, index) => (
            <ExamRowSkeleton key={index} />
          ))}
        </div>
      </section>
    </main>
  )
}
