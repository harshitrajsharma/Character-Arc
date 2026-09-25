"use client"

import Link from "next/link"
import { GlobeIcon, ListChecksIcon, PlusIcon, RotateCcwIcon, SearchXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { EmptyStateCardProps } from "./types"

export function EmptyStateCard({
  icon = "test",
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
}: EmptyStateCardProps) {
  const IconComponent =
    icon === "search" ? SearchXIcon : icon === "globe" ? GlobeIcon : ListChecksIcon

  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/60 p-12 text-center space-y-3 shadow-2xs">
      <div className="mx-auto size-12 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center text-muted-foreground">
        <IconComponent className="size-6" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-foreground font-heading">{title}</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {actionLabel && (
        <div className="pt-1">
          {actionHref ? (
            <Button
              size="sm"
              className="rounded-full px-4 text-xs font-bold gap-1.5 bg-foreground text-background hover:bg-foreground/90 shadow-xs"
              render={<Link href={actionHref} />}
            >
              <PlusIcon className="size-3.5" />
              {actionLabel}
            </Button>
          ) : onAction ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onAction}
              className="rounded-full px-4 text-xs font-semibold gap-1.5 border-border hover:bg-muted/50"
            >
              <RotateCcwIcon className="size-3.5" />
              {actionLabel}
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}
