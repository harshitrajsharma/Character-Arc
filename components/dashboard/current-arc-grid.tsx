import Link from "next/link"
import { SparklesIcon, TargetIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { CurrentArcItem } from "@/lib/dashboard/current-arcs"
import { cn } from "@/lib/utils"

const arcStatusMeta: Record<string, { label: string; className: string }> = {
  active: {
    label: "In progress",
    className: "bg-success/10 text-success-ink",
  },
  not_started: {
    label: "Not started",
    className: "bg-muted text-muted-foreground",
  },
  paused: {
    label: "Paused",
    className: "bg-brand-amber-soft text-brand-amber-ink",
  },
  completed: {
    label: "Completed",
    className: "bg-brand-cyan-soft text-brand-cyan-ink",
  },
}

function arcStatusMetaFor(status: string) {
  return arcStatusMeta[status] ?? arcStatusMeta.active
}

function formatActivityDate(iso: string | null | undefined): string {
  if (!iso) return "No activity yet"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Recently"
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function clampProgress(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function CurrentArcGrid({ items }: { items: CurrentArcItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((arc) => {
        const statusMeta = arcStatusMetaFor(arc.lifecycleStatus)
        const Icon =
          arc.toolKey === "core.exam-prep" ? TargetIcon : SparklesIcon
        const progress = clampProgress(arc.progressPercent)

        return (
          <Link
            key={`${arc.toolKey}-${arc.id}`}
            href={arc.href}
            className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-brand-neon-line"
          >
            <Card
              size="sm"
              className="group/card h-full cursor-pointer border transition-all duration-200 hover:border-brand-neon-line hover:shadow-md"
            >
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors group-hover/card:bg-brand-neon-bg group-hover/card:text-brand-neon-line">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="line-clamp-1">{arc.title}</CardTitle>
                    <CardDescription className="mt-0.5 line-clamp-1">
                      {arc.toolName}
                    </CardDescription>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 px-2 py-0.5 text-xs",
                      statusMeta.className
                    )}
                  >
                    {statusMeta.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {arc.summary ? (
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {arc.summary}
                  </p>
                ) : null}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium tabular-nums">
                      {progress}%
                    </span>
                  </div>
                  <div
                    className="h-2 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    aria-label={`${arc.title} progress`}
                  >
                    <div
                      className="h-full rounded-full bg-brand-neon-line transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Updated{" "}
                  {formatActivityDate(arc.lastActivityAt ?? arc.updatedAt)}
                </p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}
