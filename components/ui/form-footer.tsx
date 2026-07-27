import type { ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function FormFooter({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-3 border-t border-border/60 pt-5 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
