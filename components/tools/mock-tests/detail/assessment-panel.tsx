import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

/** Segmented assessment surface; callers own their content and actions. */
export function AssessmentPanel({
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-2xl border border-border bg-card text-card-foreground",
        className
      )}
      {...props}
    />
  )
}
