import { cn } from "@/lib/utils"

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block animate-pulse rounded-md bg-muted", className)}
    />
  )
}

export function GoalsPathsOverviewSkeleton() {
  return (
    <main
      className="mx-auto w-full max-w-5xl px-4 pt-24 pb-8 sm:pb-10"
      aria-busy="true"
      aria-label="Loading Goals and Paths"
    >
      <header className="flex flex-col gap-5 border-b pb-7 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex w-full max-w-2xl flex-col gap-3">
          <SkeletonBlock className="h-4 w-24" />
          <SkeletonBlock className="h-9 w-64 max-w-full" />
          <SkeletonBlock className="h-5 w-full max-w-xl" />
          <SkeletonBlock className="h-5 w-4/5 max-w-lg" />
        </div>
        <SkeletonBlock className="h-9 w-28 rounded-full" />
      </header>

      <section className="mt-8">
        <div className="flex items-end justify-between border-b pb-4">
          <div className="flex flex-col gap-2">
            <SkeletonBlock className="h-4 w-24" />
            <SkeletonBlock className="h-7 w-36" />
          </div>
          <SkeletonBlock className="h-5 w-14 rounded-full" />
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border bg-card">
          <div className="flex h-11 items-center gap-2 border-b bg-muted/50 px-4">
            <SkeletonBlock className="h-1.5 w-5 rounded-full" />
            <SkeletonBlock className="h-4 w-24" />
          </div>
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="grid min-h-24 grid-cols-[3rem_minmax(0,1fr)_1.5rem] items-center gap-3 border-b px-3 py-3 last:border-b-0 sm:min-h-20 sm:grid-cols-[3rem_minmax(0,1fr)_9.5rem_8rem_1.5rem] sm:px-4"
            >
              <SkeletonBlock className="size-12" />
              <div className="flex min-w-0 flex-col gap-2">
                <SkeletonBlock className="h-5 w-2/5" />
                <SkeletonBlock className="h-4 w-4/5" />
              </div>
              <SkeletonBlock className="hidden h-4 w-28 sm:block" />
              <SkeletonBlock className="hidden h-2 w-full rounded-full sm:block" />
              <SkeletonBlock className="size-4" />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

export function ArcDetailSkeleton() {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 pt-24 pb-12 sm:px-6"
      aria-busy="true"
      aria-label="Loading arc details"
    >
      <SkeletonBlock className="h-5 w-32" />
      <header className="mt-5 border-b pb-8">
        <div className="flex max-w-3xl flex-col gap-3">
          <SkeletonBlock className="h-6 w-28 rounded-full" />
          <SkeletonBlock className="h-10 w-3/4" />
          <SkeletonBlock className="h-5 w-full" />
          <SkeletonBlock className="h-5 w-2/3" />
        </div>
      </header>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="flex min-w-0 flex-col gap-10">
          {[0, 1, 2].map((item) => (
            <section
              key={item}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4"
            >
              <SkeletonBlock className="size-8 rounded-full" />
              <div className="flex min-w-0 flex-col gap-3 border-b pb-9">
                <SkeletonBlock className="h-6 w-44" />
                <SkeletonBlock className="h-4 w-full" />
                <SkeletonBlock className="h-4 w-5/6" />
                <SkeletonBlock className="h-4 w-2/3" />
              </div>
            </section>
          ))}
        </div>

        <aside className="flex flex-col gap-5 rounded-lg border bg-card p-5">
          <SkeletonBlock className="h-6 w-36" />
          <SkeletonBlock className="h-3 w-full rounded-full" />
          <SkeletonBlock className="h-20 w-full" />
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-9 w-full rounded-full" />
        </aside>
      </div>
    </main>
  )
}

export function ArcEditSkeleton() {
  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 pt-24 pb-28 sm:px-6"
      aria-busy="true"
      aria-label="Loading Arc editor"
    >
      <div className="flex items-center justify-between border-b pb-4">
        <SkeletonBlock className="h-9 w-24 rounded-full" />
        <SkeletonBlock className="h-4 w-20" />
      </div>
      <div className="mt-8 flex flex-col gap-4">
        <SkeletonBlock className="h-4 w-20" />
        <SkeletonBlock className="h-12 w-4/5" />
        <SkeletonBlock className="h-24 w-full" />
        <SkeletonBlock className="h-24 w-full" />
        <div className="mt-4 flex items-center justify-between">
          <div className="flex flex-col gap-2">
            <SkeletonBlock className="h-5 w-32" />
            <SkeletonBlock className="h-4 w-64" />
          </div>
          <SkeletonBlock className="h-9 w-28 rounded-full" />
        </div>
      </div>
    </main>
  )
}
