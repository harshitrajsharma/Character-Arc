import { ArcFormToolbar } from "@/components/tools/create-arc/arc-form-toolbar"
import { Skeleton } from "@/components/ui/skeleton"

function EditorFieldSkeleton() {
  return (
    <div className="flex min-h-24 flex-col justify-between rounded-lg border border-foreground/10 bg-foreground/[0.045] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 shrink-0 rounded-md bg-foreground/10" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-48 max-w-3/5 bg-foreground/10" />
          <Skeleton className="h-3 w-72 max-w-4/5 bg-foreground/10" />
        </div>
      </div>
      <Skeleton className="mt-4 h-3 w-2/3 bg-foreground/10" />
    </div>
  )
}

export function CreateArcSkeleton() {
  return (
    <div
      className="min-h-svh bg-canvas-signal"
      aria-busy="true"
      aria-label="Loading the Arc creator"
    >
      <ArcFormToolbar />

      <div className="mx-auto grid w-full max-w-6xl items-start gap-10 px-4 pb-12 sm:px-6 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-14 lg:px-8 lg:pb-16 xl:grid-cols-[24rem_minmax(0,1fr)] xl:gap-16">
        <aside className="flex min-w-0 flex-col gap-5 lg:sticky lg:top-20">
          <div className="relative flex aspect-[5/4] min-h-0 flex-col overflow-hidden rounded-lg border border-brand-cyan-line bg-brand-contrast p-5 lg:aspect-[4/5] lg:p-6">
            <div className="absolute inset-x-0 top-0 h-1 bg-brand-cyan" />
            <div className="flex items-center justify-between gap-4">
              <Skeleton className="h-3 w-14 bg-foreground/10" />
              <Skeleton className="h-3 w-20 bg-foreground/10" />
            </div>
            <div className="my-auto flex flex-col gap-3 py-6">
              <Skeleton className="mb-2 size-10 rounded-md bg-brand-cyan-soft" />
              <Skeleton className="h-3 w-20 bg-foreground/10" />
              <Skeleton className="h-8 w-4/5 bg-foreground/10" />
              <Skeleton className="h-4 w-2/3 bg-foreground/10" />
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-px w-full rounded-none bg-brand-cyan-line" />
              <Skeleton className="h-3 w-3/4 bg-foreground/10" />
              <Skeleton className="h-3 w-1/2 bg-foreground/10" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-5 w-28 bg-foreground/10" />
              <Skeleton className="size-8 rounded-full bg-foreground/10" />
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[0, 1, 2, 3, 4].map((theme) => (
                <div key={theme} className="flex min-w-0 flex-col gap-2">
                  <Skeleton className="aspect-[4/3] w-full rounded-md bg-foreground/10" />
                  <Skeleton className="mx-auto h-3 w-3/4 bg-foreground/10" />
                </div>
              ))}
            </div>
          </div>
        </aside>

        <div className="min-w-0 pt-1">
          <div className="mb-2 flex items-center justify-between gap-4">
            <Skeleton className="h-4 w-28 bg-foreground/10" />
            <Skeleton className="h-3 w-32 bg-foreground/10" />
          </div>

          <Skeleton className="mt-4 h-11 w-4/5 max-w-lg bg-foreground/10" />
          <div className="mt-3 flex items-center justify-between gap-4">
            <Skeleton className="h-3 w-56 max-w-3/5 bg-foreground/10" />
            <Skeleton className="h-3 w-10 bg-foreground/10" />
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <EditorFieldSkeleton />
            <EditorFieldSkeleton />
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <Skeleton className="h-5 w-28 bg-foreground/10" />
              <Skeleton className="h-3 w-72 max-w-4/5 bg-foreground/10" />
            </div>
            <Skeleton className="h-8 w-24 rounded-full bg-foreground/10" />
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <Skeleton className="h-10 w-full rounded-full bg-foreground/10" />
            <Skeleton className="mx-auto h-3 w-80 max-w-4/5 bg-foreground/10" />
          </div>
        </div>
      </div>
    </div>
  )
}
