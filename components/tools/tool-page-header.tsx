import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

export type ToolPageHeaderProps = {
  title: string
  description: ReactNode
  eyebrow?: ReactNode
  icon?: ReactNode
  badge?: ReactNode
  metadata?: ReactNode
  primaryAction?: ReactNode
  secondaryActions?: ReactNode
  children?: ReactNode
  className?: string
  contentClassName?: string
  iconClassName?: string
}

export function ToolPageHeader({
  title,
  description,
  eyebrow,
  icon,
  badge,
  metadata,
  primaryAction,
  secondaryActions,
  children,
  className,
  contentClassName,
  iconClassName,
}: ToolPageHeaderProps) {
  return (
    <header className={cn("relative py-2 sm:py-4", className)}>
      <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
        <div className={cn("min-w-0 max-w-3xl", contentClassName)}>
          <div className="flex items-start gap-4">
            {icon ? (
              <div
                className={cn(
                  "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground shadow-sm ring-1 ring-border/60 sm:size-14 [&_svg]:size-6",
                  iconClassName
                )}
              >
                {icon}
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                {eyebrow ? <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p> : null}
                {badge}
              </div>
              <h1 className="mt-1 text-balance font-heading text-3xl font-semibold tracking-normal sm:text-4xl">
                {title}
              </h1>
            </div>
          </div>
          <div className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:ml-[4.5rem]">
            {description}
          </div>
          {metadata ? <div className="mt-4 flex flex-wrap gap-2 sm:ml-[4.5rem]">{metadata}</div> : null}
          {children ? <div className="mt-5 sm:ml-[4.5rem]">{children}</div> : null}
        </div>

        {primaryAction || secondaryActions ? (
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center [&>*]:min-h-11 [&>*]:w-full sm:[&>*]:w-auto">
            {secondaryActions}
            {primaryAction}
          </div>
        ) : null}
      </div>
      <div className="mt-8 h-px w-20 bg-primary/45" aria-hidden="true" />
    </header>
  )
}
