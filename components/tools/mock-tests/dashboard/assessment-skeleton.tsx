import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

function Block({ className }: { className?: string }) {
  return (
    <Skeleton
      className={cn("rounded-md motion-reduce:animate-none", className)}
    />
  )
}

export function AssessmentFiltersSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-end gap-2 md:grid-cols-[minmax(0,1fr)_auto_auto] lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.85fr)_minmax(0,1.15fr)_auto] lg:gap-3"
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <Block className="hidden h-4 w-20 lg:block" />
        <Block className="h-11 w-full rounded-lg" />
      </div>
      <Block className="h-11 w-24 rounded-full lg:hidden" />
      {[0, 1, 2].map((filter) => (
        <div key={filter} className="hidden min-w-0 flex-col gap-1.5 lg:flex">
          <Block className="h-4 w-16" />
          <Block className="h-11 w-full rounded-lg" />
        </div>
      ))}
      <Block className="hidden h-11 w-24 rounded-full md:block" />
    </div>
  )
}

function CardSkeleton({ list }: { list: boolean }) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-lg border border-border bg-card",
        list &&
          "md:grid md:grid-cols-[minmax(0,1fr)_256px] md:items-center lg:grid-cols-[minmax(0,1fr)_256px_180px]"
      )}
    >
      <div className="flex min-w-0 flex-col gap-2 px-4 py-4">
        <Block className="h-5 w-4/5" />
        <Block className="h-5 w-2/5" />
        <Block className="h-4 w-3/5" />
      </div>
      <div
        className={cn(
          "grid grid-cols-3 gap-2 border-y border-border bg-muted/20 px-4 py-3",
          list && "md:border-0 md:bg-transparent"
        )}
      >
        {[0, 1, 2].map((metric) => (
          <div key={metric} className="flex min-w-0 flex-col gap-1">
            <Block className="h-4 w-3/4 max-w-16" />
            <Block className="h-5 w-1/2 max-w-12" />
          </div>
        ))}
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-col gap-3 px-4 py-3",
          list && "md:col-span-2 lg:col-span-1"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <Block className="h-4 w-16" />
          <Block className="h-4 w-20" />
        </div>
        <div className="flex items-center justify-between gap-2">
          <Block className="h-4 w-20" />
          <Block className="h-11 w-24 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function AssessmentContentSkeleton({
  tab = "workspace",
  viewMode = "grid",
  announce = true,
}: {
  tab?: "workspace" | "community" | "attempts"
  viewMode?: "grid" | "list"
  announce?: boolean
}) {
  const label =
    tab === "attempts"
      ? "attempt history"
      : tab === "community"
        ? "community assessments"
        : "your assessments"
  return (
    <section
      aria-busy="true"
      aria-label={`Loading ${label}`}
      data-assessment-skeleton={tab}
      className="flex min-w-0 flex-col gap-4"
    >
      {announce ? (
        <p role="status" className="sr-only">
          Loading {label}…
        </p>
      ) : null}
      <div aria-hidden="true" className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <Block className="h-7 w-32" />
          <Block className="h-4 w-16" />
        </div>
        {tab === "attempts" ? (
          <>
            <Block className="h-4 w-3/4 max-w-80" />
            <Block className="mt-1 h-4 w-24" />
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
              {Array.from({ length: 6 }, (_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <Block className="h-5 w-4/5 max-w-96" />
                    <Block className="h-4 w-2/3 max-w-60" />
                  </div>
                  <div className="flex shrink-0 items-center justify-between gap-5">
                    <Block className="h-8 w-16" />
                    <Block className="h-11 w-24 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div
            className={cn(
              "grid gap-4 md:grid-cols-2 xl:grid-cols-3",
              viewMode === "list" && "md:grid-cols-1 xl:grid-cols-1"
            )}
          >
            {Array.from({ length: 6 }, (_, index) => (
              <CardSkeleton key={index} list={viewMode === "list"} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export function AssessmentPageSkeleton() {
  return (
    <main
      className="mx-auto w-full max-w-6xl space-y-6 px-4 pt-20 pb-28 sm:pb-16 md:px-6 xl:px-10"
      aria-busy="true"
      aria-label="Loading assessments"
    >
      <p role="status" className="sr-only">
        Loading assessments…
      </p>
      <header
        aria-hidden="true"
        className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Block className="h-8 w-44 sm:h-9" />
          <Block className="h-4 w-full max-w-80" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <Block className="h-11 rounded-full sm:w-40" />
          <Block className="h-11 rounded-full sm:w-36" />
        </div>
      </header>
      <div className="flex min-w-0 flex-col gap-5">
        <div
          aria-hidden="true"
          className="flex h-12 items-center gap-2 border-b border-border"
        >
          {["w-16", "w-20", "w-16"].map((width, index) => (
            <div
              key={index}
              className={cn(
                "flex h-full min-w-0 items-center px-2 sm:px-4",
                index === 0 && "border-b-2 border-foreground/20"
              )}
            >
              <Block className={cn("h-4", width)} />
            </div>
          ))}
        </div>
        <AssessmentFiltersSkeleton />
        <AssessmentContentSkeleton announce={false} />
      </div>
    </main>
  )
}
