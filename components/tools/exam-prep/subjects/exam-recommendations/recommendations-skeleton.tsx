import { Skeleton } from "@/components/ui/skeleton"

const skeletonLanes = ["revise", "priority", "start", "test"] as const
const skeletonRows = [0, 1, 2] as const

export function ExamSubjectRecommendationsSkeleton() {
  return (
    <section
      className="flex min-w-0 flex-col gap-4"
      aria-label="Loading recommended next"
      aria-busy="true"
    >
      <div className="flex items-end justify-between gap-3" aria-hidden="true">
        <div className="flex flex-1 items-start gap-3">
          <Skeleton className="size-9 shrink-0 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
        </div>
        <Skeleton className="hidden h-5 w-28 sm:block" />
      </div>

      <div aria-hidden="true" className="w-full overflow-hidden pb-3">
        <div className="flex w-max items-stretch gap-4 pr-4 md:pr-6">
          {skeletonLanes.map((lane) => (
            <div
              key={lane}
              className="flex w-[calc(100vw-4rem)] max-w-104 shrink-0 flex-col overflow-hidden rounded-2xl border border-border bg-muted/40 sm:w-88 lg:w-96 xl:w-104"
            >
              <div className="flex min-h-20 items-start gap-3 p-4">
                <Skeleton className="size-9 shrink-0 rounded-md" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-full max-w-36" />
                </div>
                <Skeleton className="h-5 w-8" />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-2 pt-0">
                {skeletonRows.map((row) => (
                  <div
                    key={row}
                    className="flex min-h-28 flex-col gap-3 rounded-2xl border border-border bg-card p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                    <div className="mt-auto flex items-center gap-3">
                      <Skeleton className="h-2.5 flex-1" />
                      <Skeleton className="h-3 w-9" />
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-border pt-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
