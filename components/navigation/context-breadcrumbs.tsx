"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronLeftIcon } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { cn } from "@/lib/utils"

export type BreadcrumbSegment = {
  label: string
  href?: string
}

type ContextBreadcrumbsProps = {
  segments: BreadcrumbSegment[]
  backHref?: string
  backLabel?: string
  className?: string
  action?: React.ReactNode
}

export function ContextBreadcrumbs({
  segments,
  backHref,
  backLabel = "Back",
  className,
  action,
}: ContextBreadcrumbsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 border-b border-border/40 bg-background/30 px-4 py-2.5 backdrop-blur-xs sm:px-6",
        className
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        {backHref ? (
          <Link
            href={backHref}
            aria-label={backLabel}
            className="flex size-7 items-center justify-center rounded-lg border border-border/50 bg-background/80 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
          </Link>
        ) : null}

        <Breadcrumb>
          <BreadcrumbList className="text-xs sm:text-sm">
            {segments.map((segment, index) => {
              const isLast = index === segments.length - 1

              return (
                <React.Fragment key={`${segment.label}-${index}`}>
                  <BreadcrumbItem className="min-w-0">
                    {isLast || !segment.href ? (
                      <BreadcrumbPage className="truncate font-medium max-w-40 sm:max-w-64">
                        {segment.label}
                      </BreadcrumbPage>
                    ) : (
                      <BreadcrumbLink
                        render={<Link href={segment.href} />}
                        className="truncate max-w-32 sm:max-w-48"
                      >
                        {segment.label}
                      </BreadcrumbLink>
                    )}
                  </BreadcrumbItem>
                  {!isLast ? <BreadcrumbSeparator /> : null}
                </React.Fragment>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
