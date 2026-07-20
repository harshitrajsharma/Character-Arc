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
}: DetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        showCloseButton={false}
        className={cn(
          "h-dvh w-full! max-w-none! overflow-hidden border-border/70 bg-background/20 backdrop-blur-2xl p-0 shadow-2xl motion-reduce:transition-none data-[side=left]:sm:w-[clamp(28rem,42vw,42.5rem)]! data-[side=right]:sm:w-[clamp(28rem,42vw,42.5rem)]! data-[side=left]:sm:rounded-r-3xl data-[side=right]:sm:rounded-l-3xl",
          className
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="relative z-10 shrink-0 border-b border-border/60 bg-background/95 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pb-5">
            <div className="flex min-h-11 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {icon ? (
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-muted text-foreground [&_svg]:size-5">
                    {icon}
                  </div>
                ) : null}
                <div className="min-w-0">
                  {eyebrow ? <div className="text-xs font-medium text-muted-foreground">{eyebrow}</div> : null}
                  <SheetTitle className="truncate text-lg font-semibold sm:text-xl">{title}</SheetTitle>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {headerActions}
                {fullPageHref ? (
                  <Button
                    render={<Link href={fullPageHref} />}
                    variant="secondary"
                    size="sm"
                    className="min-h-11 gap-1.5 px-3"
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
                      className="rounded-full"
                      aria-label="Close details"
                    />
                  }
                >
                  <XIcon aria-hidden="true" />
                </SheetClose>
              </div>
            </div>
            {description ? (
              <SheetDescription className="mt-3 max-w-xl leading-6">{description}</SheetDescription>
            ) : (
              <SheetDescription className="sr-only">Details for {title}</SheetDescription>
            )}
            {metadata || badges ? (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
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
