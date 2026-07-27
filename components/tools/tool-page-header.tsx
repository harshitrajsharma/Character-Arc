import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeftIcon } from "lucide-react"

import { cn } from "@/lib/utils"

export type ToolPageHeaderProps = {
  title: string
  description: ReactNode
  backHref?: string
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
  backHref,
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
    <header
      className={cn(
        "relative py-2 sm:py-4 [--icon-size:3rem] sm:[--icon-size:3.5rem] [--icon-gap:1rem]",
        className
      )}
    >
      <div className="flex flex-col gap-7 sm:flex-row sm:items-end sm:justify-between">
        <div className={cn("min-w-0 max-w-3xl", contentClassName)}>
          {backHref ? (
            <Link
              href={backHref}
              className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeftIcon className="size-3.5" aria-hidden="true" />
              Back
            </Link>
          ) : null}
          <div className="flex items-start gap-(--icon-gap)">
            {icon ? (
              <div
                className={cn(
                  "flex size-(--icon-size) shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground shadow-sm ring-1 ring-border/60 [&_svg]:size-6",
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
          <div
            className={cn(
              "mt-4 max-w-2xl text-base leading-7 text-muted-foreground",
              icon && "sm:ml-[calc(var(--icon-size)+var(--icon-gap))]"
            )}
          >
            {description}
          </div>
          {metadata ? (
            <div
              className={cn(
                "mt-4 flex flex-wrap gap-2",
                icon && "sm:ml-[calc(var(--icon-size)+var(--icon-gap))]"
              )}
            >
              {metadata}
            </div>
          ) : null}
          {children ? (
            <div
              className={cn(
                "mt-5",
                icon && "sm:ml-[calc(var(--icon-size)+var(--icon-gap))]"
              )}
            >
              {children}
            </div>
          ) : null}
        </div>

        {primaryAction || secondaryActions ? (
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center [&>*]:min-h-11 [&>*]:w-full sm:[&>*]:w-auto">
            {secondaryActions}
            {primaryAction}
          </div>
        ) : null}
      </div>
    </header>
  )
}
