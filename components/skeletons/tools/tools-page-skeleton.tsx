import { Skeleton } from "@/components/ui/skeleton"

const TOOL_CARD_SKELETONS = 6

function ToolCardSkeleton() {
  return (
    <div className="flex min-h-52 min-w-0 flex-col rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className="size-11 shrink-0 rounded-md" />
        <Skeleton className="h-11 w-20 rounded-full sm:h-8" />
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-2">
        <Skeleton className="h-6 w-2/5 rounded-md" />
        <Skeleton className="h-4 w-full rounded-md" />
        <Skeleton className="h-4 w-4/5 rounded-md" />
      </div>

      <div className="mt-auto flex items-center gap-2 pt-4">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
    </div>
  )
}

export function ToolsPageSkeleton() {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 pt-24 pb-8 sm:pb-10 md:px-6 xl:px-12"
      aria-busy="true"
      aria-label="Loading tools"
    >
      <header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex max-w-2xl flex-col gap-3">
          <Skeleton className="h-5 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-6 w-full max-w-md rounded-md" />
        </div>
        <Skeleton className="h-6 w-24 rounded-full" />
      </header>

      <section className="mt-7" aria-hidden="true">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-10 w-44 rounded-full" />
          <div className="flex w-full gap-2 sm:max-w-sm">
            <Skeleton className="h-11 min-w-0 flex-1 rounded-lg sm:h-9" />
            <Skeleton className="h-11 w-20 rounded-full sm:h-9" />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: TOOL_CARD_SKELETONS }, (_, index) => (
            <ToolCardSkeleton key={index} />
          ))}
        </div>
      </section>
    </main>
  )
}
