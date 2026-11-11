import { Skeleton } from "@/components/ui/skeleton"

export function QuestionFormSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading question editor"
      className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 pt-24 pb-28 sm:px-6 xl:px-10"
    >
      <span className="sr-only">Loading question editor…</span>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Skeleton className="h-7 w-2/3 motion-reduce:animate-none" />
        <Skeleton className="h-16 w-full motion-reduce:animate-none" />
        <div className="flex flex-col gap-5 rounded-2xl border border-border p-6">
          <Skeleton className="h-6 w-40 motion-reduce:animate-none" />
          <Skeleton className="h-11 w-full motion-reduce:animate-none" />
          <Skeleton className="h-11 w-full motion-reduce:animate-none" />
          <Skeleton className="h-64 w-full motion-reduce:animate-none" />
        </div>
      </div>
    </main>
  )
}
