import Link from "next/link"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  Layers3Icon,
  RouteIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react"

import { InstallToolForm } from "@/components/tools/install-tool-form"
import { ToolPageHeader } from "@/components/tools/tool-page-header"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { workspaceRoutes } from "@/lib/routes/workspace-tools"
import type { ToolCatalogIssue, ToolCatalogItem } from "@/lib/tools/catalog"
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

type ToolCatalogDetailProps = {
  item: ToolCatalogItem
  workspace: { id: string; name: string; slug: string } | null
  issue: ToolCatalogIssue | null
}

export function ToolCatalogDetail({
  item,
  workspace,
  issue,
}: ToolCatalogDetailProps) {
  const Icon = iconByKey[item.icon] ?? SparklesIcon
  const installed = item.installationStatus === "active"
  const workspaceHome = workspace
    ? workspaceRoutes.toolHome(workspace.slug, item.key)
    : null

  const primaryAction =
    installed && workspaceHome ? (
      <Link href={workspaceHome} className={buttonVariants()}>
        Open in workspace
        <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
      </Link>
    ) : workspace ? (
      <InstallToolForm
        workspaceId={workspace.id}
        workspaceSlug={workspace.slug}
        toolKey={item.key}
        installationStatus={item.installationStatus}
        installable={item.installable}
      />
    ) : null

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12 pt-24 md:px-6 xl:px-10">
      <ToolPageHeader
        eyebrow="Tool catalog"
        title={item.name}
        description={item.description}
        icon={<Icon aria-hidden="true" />}
        iconClassName="bg-brand-violet-soft text-brand-violet-ink"
        badge={<Badge variant="secondary">{categoryLabel[item.category]}</Badge>}
        metadata={
          installed ? (
            <Badge variant="outline">
              <CheckCircle2Icon data-icon="inline-start" aria-hidden="true" />
              Installed in {workspace?.name ?? "workspace"}
            </Badge>
          ) : null
        }
        primaryAction={primaryAction}
      />

      {issue ? (
        <Alert variant="destructive" className="mt-7">
          <AlertTitle>Installation is temporarily unavailable</AlertTitle>
          <AlertDescription>
            Tool information remains available, but your workspace setup could
            not be confirmed. Try again after the catalog is refreshed.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
        <section aria-labelledby="capabilities-title">
          <p className="text-sm font-medium text-brand-violet-ink">
            What it helps you do
          </p>
          <h2
            id="capabilities-title"
            className="mt-1 font-heading text-2xl font-semibold"
          >
            Turn activity into visible outcomes
          </h2>
          <div className="mt-6 divide-y rounded-lg border bg-card">
            {item.actionNames.map((actionName) => (
              <div
                key={actionName}
                className="flex min-h-14 items-center gap-3 px-4 py-3"
              >
                <CheckCircle2Icon
                  className="size-4 shrink-0 text-brand-violet-ink"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium">{actionName}</span>
              </div>
            ))}
          </div>
        </section>

        <aside aria-labelledby="organized-title" className="lg:border-l lg:pl-8">
          <span className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Layers3Icon className="size-5" aria-hidden="true" />
          </span>
          <h2 id="organized-title" className="mt-4 font-heading text-lg font-semibold">
            What stays organized
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your work stays structured in your workspace so you and approved
            agents can continue from the same source of truth.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {item.blockTypeNames.map((blockTypeName) => (
              <Badge key={blockTypeName} variant="outline">
                {blockTypeName}
              </Badge>
            ))}
          </div>
          <Link
            href={workspaceRoutes.tools.home}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "mt-6 -ml-3"
            )}
          >
            Back to all tools
          </Link>
        </aside>
      </div>
    </main>
  )
}
