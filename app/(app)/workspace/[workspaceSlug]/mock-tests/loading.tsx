import { Skeleton } from "@/components/ui/skeleton"

function SkeletonBlock({ className }: { className?: string }) {
  return <Skeleton className={className} aria-hidden="true" />
}

export default function MockTestsLoading() {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 pt-20 pb-8 space-y-6 sm:pb-10 md:px-6 xl:px-10"
      aria-busy="true"
      aria-label="Loading Mock Tests"
    >
      <header className="border-b border-border pb-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-col gap-2.5">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-8 w-48" />
            <SkeletonBlock className="h-4 w-full max-w-2xl" />
            <SkeletonBlock className="h-4 w-3/5 max-w-lg" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SkeletonBlock className="h-9 w-32 rounded-full" />
            <SkeletonBlock className="h-9 w-24 rounded-full" />
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <div
            key={tile}
            className="rounded-xl border border-border/80 bg-card p-4 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <SkeletonBlock className="h-3.5 w-24" />
              <SkeletonBlock className="size-7 rounded-lg" />
            </div>
            <SkeletonBlock className="mt-2 h-7 w-16" />
            <SkeletonBlock className="mt-1.5 h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="space-y-3 rounded-xl border border-border bg-card p-3.5 shadow-xs">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <SkeletonBlock className="h-9 min-w-0 flex-1" />
          <SkeletonBlock className="h-9 w-[150px] shrink-0" />
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
          <SkeletonBlock className="h-3 w-12" />
          <SkeletonBlock className="h-6 w-24 rounded-md" />
          <SkeletonBlock className="h-6 w-20 rounded-md" />
          <SkeletonBlock className="h-6 w-16 rounded-md" />
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-2.5">
          <SkeletonBlock className="h-5 w-36" />
          <SkeletonBlock className="hidden h-3.5 w-48 sm:block" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-xl border border-border/80 bg-card p-5 shadow-xs"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <SkeletonBlock className="h-5 w-16 rounded-full" />
                  <SkeletonBlock className="h-5 w-14 rounded-full" />
                </div>
                <div className="space-y-1.5">
                  <SkeletonBlock className="h-5 w-4/5" />
                  <SkeletonBlock className="h-5 w-2/5" />
                </div>
                <SkeletonBlock className="h-3.5 w-2/3" />
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-border pt-3">
                <SkeletonBlock className="h-8 w-16 rounded-full" />
                <SkeletonBlock className="h-8 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
