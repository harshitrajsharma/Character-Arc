"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { ExternalLinkIcon, XIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

export type DetailSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  icon?: ReactNode
  eyebrow?: ReactNode
  metadata?: ReactNode
  badges?: ReactNode
  headerActions?: ReactNode
  fullPageHref?: string
  fullPageLabel?: string
  children: ReactNode
  footer?: ReactNode
  className?: string
  contentClassName?: string
  side?: "top" | "right" | "bottom" | "left"
  floating?: boolean
  headerDensity?: "default" | "compact"
}

export function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  icon,
  eyebrow,
  metadata,
  badges,
  headerActions,
  fullPageHref,
  fullPageLabel = "Open full page",
  children,
  footer,
  className,
  contentClassName,
  side = "right",
  floating = false,
  headerDensity = "default",
}: DetailSheetProps) {
  const hasCompactHeader = headerDensity === "compact"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        showCloseButton={false}
        className={cn(
          "h-dvh w-full! max-w-none! overflow-hidden border-border/70 p-0 shadow-2xl motion-reduce:transition-none data-[side=left]:sm:w-[clamp(28rem,42vw,42.5rem)]! data-[side=right]:sm:w-[clamp(28rem,42vw,42.5rem)]! data-[side=left]:sm:rounded-r-3xl data-[side=right]:sm:rounded-l-3xl",
          floating && "sm:top-4! sm:bottom-4! sm:right-0! sm:h-[calc(100dvh-2rem)]! sm:rounded-l-2xl! sm:border!",
          className
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <header
            className={cn(
              "relative z-10 shrink-0 border-b border-border/60 bg-background/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-[max(1rem,env(safe-area-inset-top))]",
              hasCompactHeader ? "pb-2.5 sm:px-5 sm:pb-4" : "pb-4 sm:px-6 sm:pb-5"
            )}
          >
            <div className={cn("flex items-center justify-between gap-3", hasCompactHeader ? "min-h-9 sm:min-h-10" : "min-h-11")}>
              <div className={cn("flex min-w-0 items-center", hasCompactHeader ? "gap-2.5 sm:gap-3" : "gap-3")}>
                {icon ? (
                  <div
                    className={cn(
                      "flex shrink-0 items-center justify-center bg-muted text-foreground",
                      hasCompactHeader ? "size-8 rounded-lg [&_svg]:size-4 sm:size-9 sm:rounded-xl" : "size-10 rounded-2xl [&_svg]:size-5"
                    )}
                  >
                    {icon}
                  </div>
                ) : null}
                <div className="min-w-0">
                  {eyebrow ? <div className="text-xs font-medium text-muted-foreground">{eyebrow}</div> : null}
                  <SheetTitle className={cn("truncate font-semibold", hasCompactHeader ? "text-base sm:text-lg" : "text-lg sm:text-xl")}>
                    {title}
                  </SheetTitle>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {headerActions}
                {fullPageHref ? (
                  <Button
                    render={<Link href={fullPageHref} />}
                    variant="secondary"
                    size="sm"
                    className={cn("hidden gap-1.5 px-3 sm:inline-flex", hasCompactHeader ? "h-9" : "min-h-11")}
                    aria-label={fullPageLabel}
                  >
                    <span className="hidden sm:inline">{fullPageLabel}</span>
                    <ExternalLinkIcon aria-hidden="true" />
                  </Button>
                ) : null}
                <SheetClose
                  render={
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      className="size-11 rounded-full border border-border bg-muted text-foreground hover:bg-accent sm:size-10 sm:border-transparent sm:bg-transparent"
                      aria-label="Close details"
                    />
                  }
                >
                  <XIcon aria-hidden="true" />
                </SheetClose>
              </div>
            </div>
            {description ? (
              <SheetDescription className={cn("max-w-xl", hasCompactHeader ? "mt-1.5 hidden text-sm leading-5 sm:block" : "mt-3 leading-6")}>
                {description}
              </SheetDescription>
            ) : (
              <SheetDescription className="sr-only">Details for {title}</SheetDescription>
            )}
            {metadata || badges ? (
              <div className={cn("flex flex-wrap items-center gap-2 text-sm text-muted-foreground", hasCompactHeader ? "mt-2.5 hidden sm:flex" : "mt-4")}>
                {badges}
                {metadata}
              </div>
            ) : null}
          </header>

          <ScrollArea className="min-h-0 flex-1">
            <div
              className={cn(
                "space-y-6 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-7",
                contentClassName
              )}
            >
              {children}
            </div>
          </ScrollArea>

          {footer ? (
            <footer className="shrink-0 border-t border-border/60 bg-linear-to-t from-background via-background to-background/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 sm:px-6">
              {footer}
            </footer>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
