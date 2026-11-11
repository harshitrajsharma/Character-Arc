"use client"

import Link from "next/link"
import { GlobeIcon, ListChecksIcon, PlusIcon, RotateCcwIcon, SearchXIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty"
import type { EmptyStateCardProps } from "./types"

export function EmptyStateCard({ icon = "test", title, description, actionLabel, onAction, actionHref }: EmptyStateCardProps) {
  const Icon = icon === "search" ? SearchXIcon : icon === "globe" ? GlobeIcon : ListChecksIcon
  return <Empty className="rounded-lg">
    <EmptyHeader><EmptyMedia variant="icon"><Icon aria-hidden="true" /></EmptyMedia><EmptyTitle>{title}</EmptyTitle><EmptyDescription>{description}</EmptyDescription></EmptyHeader>
    {actionLabel ? <EmptyContent>
      {actionHref ? <Button className="h-11" render={<Link href={actionHref} />}><PlusIcon data-icon="inline-start" aria-hidden="true" />{actionLabel}</Button> : onAction ? <Button variant="outline" className="h-11" onClick={onAction}><RotateCcwIcon data-icon="inline-start" aria-hidden="true" />{actionLabel}</Button> : null}
    </EmptyContent> : null}
  </Empty>
}
