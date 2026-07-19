import { RouteIcon, SparklesIcon, type LucideIcon } from "lucide-react"
import Link from "next/link"

import { InstallToolForm } from "@/components/tools/install-tool-form"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { resolveToolDestination } from "@/lib/routes/workspace-tools"
import type { ToolCatalogItem } from "@/lib/tools/catalog"
import { cn } from "@/lib/utils"

const iconByKey: Record<string, LucideIcon> = {
  route: RouteIcon,
}

const categoryLabel = {
  learn: "Learn",
  plan: "Plan",
  decide: "Decide",
  track: "Track",
  practice: "Practice",
  connect: "Connect",
} as const

type ToolCatalogCardProps = {
  item: ToolCatalogItem
  workspaceId: string
  workspaceSlug: string
}

export function ToolCatalogCard({ item, workspaceId, workspaceSlug }: ToolCatalogCardProps) {
  const Icon = iconByKey[item.icon] ?? SparklesIcon
  const installed = item.installationStatus === "active"
  const destination = resolveToolDestination({
    workspaceSlug,
    toolKey: item.key,
    catalogRoute: item.homeRoute,
    installed,
  })

  return (
    <article className="group relative flex min-h-52 min-w-0 flex-col rounded-lg border bg-card p-4 transition-colors focus-within:border-foreground/20 hover:border-foreground/20">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-neon-soft text-brand-neon-ink">
          <Icon className="size-5" aria-hidden="true" />
        </span>

        <div className="relative z-10 shrink-0">
          {installed ? (
            <Link
              href={destination}
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "h-11 min-w-20 sm:h-8"
              )}
            >
              Open
            </Link>
          ) : (
            <InstallToolForm
              workspaceId={workspaceId}
              workspaceSlug={workspaceSlug}
              toolKey={item.key}
              installationStatus={item.installationStatus}
              installable={item.installable}
            />
          )}
        </div>
      </div>

      <div className="mt-4 min-w-0">
        <h2 className="truncate font-heading text-lg font-semibold">
          <Link
            href={destination}
            className="outline-none after:absolute after:inset-0 focus-visible:after:rounded-lg focus-visible:after:ring-3 focus-visible:after:ring-ring/30"
            aria-label={`View ${item.name}`}
          >
            {item.name}
          </Link>
        </h2>
        <p className="mt-1 line-clamp-3 text-sm leading-5 text-muted-foreground">
          {item.description}
        </p>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        <Badge variant="secondary">{categoryLabel[item.category]}</Badge>
        {installed ? <Badge variant="outline">Installed</Badge> : null}
      </div>
    </article>
  )
}
