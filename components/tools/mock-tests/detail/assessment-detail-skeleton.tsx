import { Skeleton } from "@/components/ui/skeleton"
import { AssessmentPanel } from "./assessment-panel"

export function AssessmentDetailSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Loading assessment…</span>
      <div
        aria-hidden="true"
        className="flex flex-col gap-6 [&_*]:motion-reduce:animate-none"
      >
        <AssessmentPanel>
          <div className="flex flex-col gap-3 p-4 sm:p-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full max-w-xl" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex flex-col gap-2 p-4 sm:p-6">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
          <div className="flex gap-3 border-t border-border p-4 sm:px-6">
            <Skeleton className="h-11 w-36 rounded-full" />
            <Skeleton className="h-11 w-24 rounded-full" />
          </div>
        </AssessmentPanel>
        <AssessmentPanel className="flex flex-col gap-4 p-4 sm:p-6">
          <Skeleton className="h-5 w-52" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-20 w-full" />
        </AssessmentPanel>
        <AssessmentPanel className="divide-y divide-border">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="flex items-center justify-between gap-4 p-4 sm:p-6"
            >
              <div className="flex flex-col gap-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-11 w-24 rounded-full" />
            </div>
          ))}
        </AssessmentPanel>
      </div>
    </div>
  )
}
