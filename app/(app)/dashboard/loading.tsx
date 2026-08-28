import { Skeleton } from "@/components/ui/skeleton"

function SkeletonBlock({ className }: { className?: string }) {
  return <Skeleton className={className} aria-hidden="true" />
}

export default function DashboardLoading() {
  return (
    <main
      className="mx-auto w-full max-w-6xl px-4 pt-20 pb-16 space-y-8 sm:px-6 xl:px-10"
      aria-busy="true"
      aria-label="Loading dashboard"
    >
      <div className="rounded-3xl border border-border/60 bg-muted/15 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <SkeletonBlock className="h-5 w-28 rounded-full" />
              <SkeletonBlock className="h-5 w-24 rounded-full" />
            </div>
            <SkeletonBlock className="h-9 w-64 max-w-full" />
            <SkeletonBlock className="h-4 w-80 max-w-full" />
          </div>
          <SkeletonBlock className="h-8 w-32 shrink-0 self-start rounded-full" />
        </div>
      </div>

      <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((tile) => (
          <div
            key={tile}
            className="rounded-2xl border border-border/60 bg-muted/20 p-4"
          >
            <div className="flex items-center justify-between">
              <SkeletonBlock className="size-9 rounded-xl" />
              <SkeletonBlock className="size-4" />
            </div>
            <div className="mt-4 space-y-1.5">
              <SkeletonBlock className="h-7 w-16" />
              <div className="flex items-center justify-between">
                <SkeletonBlock className="h-3.5 w-20" />
                <SkeletonBlock className="h-3.5 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-muted/15 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="size-7 rounded-lg" />
          <SkeletonBlock className="h-4 w-40" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SkeletonBlock className="h-8 w-24 rounded-full" />
          <SkeletonBlock className="h-8 w-24 rounded-full" />
          <SkeletonBlock className="h-8 w-28 rounded-full" />
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-28" />
            <SkeletonBlock className="h-6 w-64 max-w-full" />
          </div>
          <SkeletonBlock className="hidden h-4 w-28 sm:block" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-border/60 bg-muted/20 p-5"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <SkeletonBlock className="h-5 w-24 rounded-full" />
                  <SkeletonBlock className="h-4 w-14" />
                </div>
                <SkeletonBlock className="h-5 w-3/5" />
                <SkeletonBlock className="h-4 w-4/5" />
                <SkeletonBlock className="h-2 w-full rounded-full" />
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-border/30 pt-3">
                <SkeletonBlock className="h-3 w-20" />
                <SkeletonBlock className="h-3 w-14" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 pt-2">
        <div className="flex items-end justify-between">
          <div className="space-y-2">
            <SkeletonBlock className="h-3 w-24" />
            <SkeletonBlock className="h-6 w-60 max-w-full" />
          </div>
          <SkeletonBlock className="hidden h-7 w-32 rounded-full sm:block" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="rounded-3xl border border-border/60 bg-muted/15 p-5"
            >
              <div className="flex items-start gap-3.5">
                <SkeletonBlock className="size-10 shrink-0 rounded-2xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <SkeletonBlock className="h-4 w-24" />
                    <SkeletonBlock className="h-4 w-14 rounded-full" />
                  </div>
                  <SkeletonBlock className="h-3.5 w-full" />
                  <SkeletonBlock className="h-3.5 w-2/3" />
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/30 pt-3">
                <SkeletonBlock className="h-3 w-24" />
                <SkeletonBlock className="h-3 w-12" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
