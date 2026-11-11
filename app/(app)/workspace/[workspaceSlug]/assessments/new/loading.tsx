import { Skeleton } from "@/components/ui/skeleton"

export default function CreateAssessmentLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading assessment form"
      className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-24 pb-28 md:px-6 xl:px-10"
    >
      <span className="sr-only">Loading assessment form…</span>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <Skeleton className="h-8 w-64 motion-reduce:animate-none" />
        <div className="flex flex-col gap-6 rounded-xl border border-border p-6">
          <Skeleton className="h-6 w-36 motion-reduce:animate-none" />
          {[0, 1, 2, 3].map((item) => (
            <Skeleton
              key={item}
              className="h-16 w-full motion-reduce:animate-none"
            />
          ))}
        </div>
      </div>
    </main>
  )
}
